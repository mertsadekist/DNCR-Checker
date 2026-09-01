/**
 * Pure decision logic for a DNCR check, kept free of I/O so the
 * compliance rules can be tested directly.
 *
 * The governing rule is fail-closed: a number is reported as ALLOWED only
 * when the registry explicitly said it is not listed. Every other outcome -
 * a transport error, an unexpected payload, a missing or mismatched entry -
 * is an ERROR, never a permission to call.
 */

export type DncrOutcome =
  | { status: 'ALLOWED' | 'BLOCKED'; dncrStatus: string }
  | { status: 'ERROR'; error: string };

/**
 * Reduces any accepted UAE input to the local format Etisalat expects
 * (leading 0, 9 digits for landline / 10 for mobile). Returns null when the
 * input is not a usable UAE number.
 */
export function normalizeUaeNumber(input: unknown): string | null {
  let digits = String(input ?? '').replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00971')) digits = digits.slice(5);
  else if (digits.startsWith('971')) digits = digits.slice(3);

  if (!digits.startsWith('0')) digits = `0${digits}`;

  return /^0\d{8,9}$/.test(digits) ? digits : null;
}

/**
 * Turns a raw Etisalat reply into a verdict for `requestedNumber`, which must
 * already be normalized.
 */
export function evaluateDncrResponse(
  args: { ok: boolean; httpStatus: number; statusText?: string; body: any; requestedNumber: string }
): DncrOutcome {
  const { ok, httpStatus, statusText, body, requestedNumber } = args;

  if (!ok) {
    const upstream = body?.ackMessage?.errorMessage || body?.message || statusText || 'no detail given';
    return { status: 'ERROR', error: `DNCR API returned HTTP ${httpStatus}: ${upstream}` };
  }

  const ack = body?.ackMessage?.status;
  if (ack && String(ack).toUpperCase() !== 'SUCCESS') {
    return {
      status: 'ERROR',
      error: `DNCR API reported ${ack}: ${body?.ackMessage?.errorMessage || 'no error message given'}`,
    };
  }

  // Only trust an entry that is actually about the number we asked for.
  const details = Array.isArray(body?.details) ? body.details : [];
  const entry = details.find((d: any) => normalizeUaeNumber(d?.accountNumber) === requestedNumber);
  if (!entry) {
    return { status: 'ERROR', error: `DNCR API returned no result for ${requestedNumber}.` };
  }

  // Anything other than an explicit TRUE/FALSE leaves the number unverified.
  const flag = String(entry.dncrStatus ?? '').trim().toUpperCase();
  if (flag !== 'TRUE' && flag !== 'FALSE') {
    return { status: 'ERROR', error: `DNCR API returned an unrecognised dncrStatus: "${entry.dncrStatus}".` };
  }

  return { status: flag === 'TRUE' ? 'BLOCKED' : 'ALLOWED', dncrStatus: String(entry.dncrStatus) };
}
