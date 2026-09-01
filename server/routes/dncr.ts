import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { normalizeUaeNumber, evaluateDncrResponse } from '../dncrLogic';

const router = Router();
const prisma = new PrismaClient();

const ETISALAT_BASE = 'https://apihub.etisalat.ae:9443/etisalat/serviceapis';
const CLIENT_ID = process.env.ETISALAT_CLIENT_ID || '';
const CLIENT_SECRET = process.env.ETISALAT_CLIENT_SECRET || '';
const REQUESTED_SYSTEM = 'DNCR_COMPLIANCE_TOOL';

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<{ token: string; transaction: any }> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return { token: cachedToken, transaction: { cached: true } };
  }

  const url = `${ETISALAT_BASE}/confidential/oauth2/token`;
  const transactionId = `TID_${Date.now()}`;
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'apioauth',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-TIB-RequestedSystem': REQUESTED_SYSTEM,
    'X-TIB-TransactionID': transactionId,
  };

  const response = await fetch(url, { method: 'POST', headers, body: params });
  const body = await response.json().catch(() => ({} as any));

  const transaction = {
    request: { url, method: 'POST', headers, body: { grant_type: 'client_credentials', scope: 'apioauth', client_id: CLIENT_ID, client_secret: '********' } },
    response: { status: response.status, statusText: response.statusText, body },
  };

  if (!response.ok) throw new Error(`OAuth error: HTTP ${response.status} ${response.statusText}`);
  if (!body.access_token) throw new Error('OAuth error: response contained no access_token');

  cachedToken = body.access_token;
  tokenExpiry = Date.now() + ((body.expires_in || 3600) * 1000) - 60000;

  return { token: cachedToken!, transaction };
}

// POST /api/dncr/check
router.post('/check', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ message: 'Phone number is required' });

  const transactions: any[] = [];

  // Fail closed: an unverified number is never reported as callable.
  const failed = async (httpStatus: number, message: string) => {
    try {
      await prisma.checkLog.create({
        data: {
          phoneNumber,
          status: 'ERROR',
          dncrStatus: null,
          transactionId: null,
          userId: req.user!.id,
          apiLogs: {
            create: transactions.filter(t => !t.cached && t.request?.url).map(t => ({
              requestUrl: t.request.url,
              requestMethod: t.request.method,
              requestHeaders: t.request.headers || {},
              requestBody: t.request.body || null,
              responseStatus: t.response?.status || 0,
              responseBody: t.response?.body || null,
            })),
          },
        },
      });
    } catch (e) {
      console.error('Failed to persist errored DNCR check:', e);
    }

    return res.status(httpStatus).json({
      dncrResponse: {
        phoneNumber,
        status: 'ERROR',
        error: message,
        requestId: `err_${Date.now()}`,
      },
      apiTransactions: transactions,
    });
  };

  const cleanPhone = normalizeUaeNumber(phoneNumber);
  if (!cleanPhone) {
    return failed(400, `"${phoneNumber}" is not a valid UAE number, so it could not be checked.`);
  }

  try {
    const { token, transaction: tokenTx } = await getAccessToken();
    transactions.push(tokenTx);

    const url = `${ETISALAT_BASE}/dncr/v0/check`;
    const transactionId = `TID_${Date.now()}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-TIB-RequestedSystem': REQUESTED_SYSTEM,
      'X-TIB-TransactionID': transactionId,
      'clientID': CLIENT_ID,
    };
    const requestBody = { accountNumber: [cleanPhone], count: '1' };

    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(requestBody) });
    const responseBody = await response.json().catch(() => ({ error: 'Failed to parse JSON' } as any));

    transactions.push({
      request: { url, method: 'POST', headers: { ...headers, Authorization: `Bearer ${token.substring(0, 8)}...` }, body: requestBody },
      response: { status: response.status, statusText: response.statusText, body: responseBody },
    });

    if (response.status === 401) cachedToken = null;

    const outcome = evaluateDncrResponse({
      ok: response.ok,
      httpStatus: response.status,
      statusText: response.statusText,
      body: responseBody,
      requestedNumber: cleanPhone,
    });

    if (outcome.status === 'ERROR') {
      return failed(502, outcome.error);
    }

    const isBlocked = outcome.status === 'BLOCKED';
    const status = outcome.status;

    const checkLog = await prisma.checkLog.create({
      data: {
        phoneNumber,
        status,
        dncrStatus: outcome.dncrStatus,
        transactionId: responseBody.transactionId || transactionId,
        userId: req.user!.id,
        apiLogs: {
          create: transactions.filter(t => !t.cached).map(t => ({
            requestUrl: t.request.url,
            requestMethod: t.request.method,
            requestHeaders: t.request.headers,
            requestBody: t.request.body || null,
            responseStatus: t.response.status,
            responseBody: t.response.body || null,
          })),
        },
      },
    });

    res.json({
      dncrResponse: {
        phoneNumber,
        status,
        isDncrListed: isBlocked,
        blockReason: isBlocked ? 'Registered in DNCR' : undefined,
        requestId: checkLog.id,
      },
      apiTransactions: transactions,
    });
  } catch (error: any) {
    console.error('DNCR check failed:', error?.message || error);
    return failed(502, error?.message || 'The DNCR check could not be completed.');
  }
});

// POST /api/dncr/diagnostics
router.post('/diagnostics', authenticateToken, async (_req, res) => {
  const results: any = {
    connectivity: { status: 'pending', details: '' },
    authentication: { status: 'pending', details: '' },
    dncrCheck: { status: 'pending', details: '' },
    finalStatus: 'pending',
    raw: {},
  };

  // Stage 1
  try {
    const r = await fetch(`${ETISALAT_BASE}/confidential/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    });
    results.connectivity = { status: 'success', details: `Reached Etisalat API gateway. HTTP ${r.status}.` };
    results.raw.connectivityStatus = r.status;
  } catch (e: any) {
    results.connectivity = { status: 'failure', details: `Failed: ${e.message}` };
    results.authentication = { status: 'failure', details: 'Skipped.' };
    results.dncrCheck = { status: 'failure', details: 'Skipped.' };
    results.finalStatus = 'failure';
    return res.json(results);
  }

  // Stage 2
  try {
    cachedToken = null; tokenExpiry = 0;
    const { token, transaction } = await getAccessToken();
    if (token) {
      results.authentication = { status: 'success', details: 'Authenticated successfully.' };
    } else {
      results.authentication = { status: 'failure', details: 'No token received.' };
      results.dncrCheck = { status: 'failure', details: 'Skipped.' };
      results.finalStatus = 'failure';
      return res.json(results);
    }
    results.raw.authenticationTransaction = transaction;
  } catch (e: any) {
    results.authentication = { status: 'failure', details: `Auth failed: ${e.message}` };
    results.dncrCheck = { status: 'failure', details: 'Skipped.' };
    results.finalStatus = 'failure';
    return res.json(results);
  }

  // Stage 3
  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${cachedToken}`,
      'Content-Type': 'application/json',
      'X-TIB-RequestedSystem': REQUESTED_SYSTEM,
      'X-TIB-TransactionID': `DIAG_${Date.now()}`,
      'clientID': CLIENT_ID,
    };
    const r = await fetch(`${ETISALAT_BASE}/dncr/v0/check`, {
      method: 'POST', headers,
      body: JSON.stringify({ accountNumber: ['0500000000'], count: '1' }),
    });
    const body = await r.json().catch(() => ({} as any));
    results.raw.dncrCheckResponse = { status: r.status, body };

    // An HTTP error from the endpoint is a failed diagnostic, not a pass.
    if (r.ok) {
      results.dncrCheck = { status: 'success', details: `DNCR endpoint responded. HTTP ${r.status}.` };
      results.finalStatus = 'success';
    } else {
      const upstream = body?.ackMessage?.errorMessage || body?.message || r.statusText;
      results.dncrCheck = { status: 'failure', details: `DNCR endpoint returned HTTP ${r.status}: ${upstream}` };
      results.finalStatus = 'failure';
    }
  } catch (e: any) {
    results.dncrCheck = { status: 'failure', details: `Failed: ${e.message}` };
    results.finalStatus = 'failure';
  }

  res.json(results);
});

export default router;
