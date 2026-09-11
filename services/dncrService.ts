import { DncrResponse, ApiTransaction, DiagnosticResults } from '../types';
import { getAuthHeaders } from './authService';

interface DncrCheckResult {
  dncrResponse: DncrResponse;
  apiTransactions: ApiTransaction[];
}

/**
 * Checks a phone number against the DNCR via the backend server.
 */
export const checkNumberAgainstDncr = async (phoneNumber: string): Promise<DncrCheckResult> => {
  const res = await fetch('/api/dncr/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ phoneNumber }),
  });

  const data = await res.json().catch(() => null);

  // A reply we cannot read leaves the number unchecked, whatever the code.
  if (!data?.dncrResponse?.finalStatus) {
    return {
      dncrResponse: {
        phoneNumber,
        finalStatus: 'CHECK_FAILED',
        callPermission: 'NOT_ALLOWED',
        displayLabel: 'DNCR Check Failed — Do Not Call',
        reason: data?.message || `The server returned HTTP ${res.status}.`,
        rawDncrStatus: null,
        rawTransactionStatus: null,
        appliedRule: 'TECHNICAL_FAILURE',
        requestId: `err_${Date.now()}`,
      },
      apiTransactions: data?.apiTransactions || [],
    };
  }

  return {
    dncrResponse: data.dncrResponse,
    apiTransactions: data.apiTransactions || [],
  };
};

/**
 * Runs connection diagnostics via the backend server.
 */
export const runConnectionDiagnostics = async (): Promise<DiagnosticResults> => {
  const res = await fetch('/api/dncr/diagnostics', {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return await res.json();
};

/**
 * Checks if the user is authenticated (has a token).
 */
export const isApiConnected = (): boolean => {
  return !!localStorage.getItem('dncr_auth_token');
};
