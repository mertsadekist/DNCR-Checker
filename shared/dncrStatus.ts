/**
 * The single source of truth for how a DNCR reply is interpreted.
 *
 * Imported by both the Express route and the React components - the decision
 * rules must never be restated in a controller or a UI component.
 *
 * The governing rule is fail-closed: callPermission is ALLOWED only for the
 * two cases the registry actually clears. Everything else - an indeterminate
 * answer, an unexpected payload, a transport failure - is NOT_ALLOWED.
 *
 * The raw API values are carried through untouched for auditing. The DU-series
 * rule changes the interpreted result only; it never rewrites what the API said.
 */

export type DncrFinalStatus =
  | 'DNCR_REGISTERED'
  | 'DNCR_NOT_REGISTERED'
  | 'UNKNOWN'
  | 'CHECK_FAILED';

export type CallPermission = 'ALLOWED' | 'NOT_ALLOWED';

/** Which rule produced the interpretation - recorded so results stay explainable. */
export type AppliedRule =
  | 'EXPLICIT_TRUE'
  | 'EXPLICIT_FALSE'
  | 'DU_SERIES_ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_NOT_FOUND_NON_DU'
  | 'UNEXPECTED_RESPONSE'
  | 'TECHNICAL_FAILURE'
  | 'INVALID_INPUT';

export interface DncrInterpretation {
  finalStatus: DncrFinalStatus;
  callPermission: CallPermission;
  displayLabel: string;
  reason: string;
  /** Exactly as the API sent it, null included. Never rewritten. */
  rawDncrStatus: string | null;
  /** Exactly as the API sent it. Never rewritten. */
  rawTransactionStatus: string | null;
  appliedRule: AppliedRule;
}

/** Presentation for each final status. `tone` maps to the agreed colours. */
export const STATUS_PRESENTATION: Record<
  DncrFinalStatus,
  { tone: 'red' | 'green' | 'orange' | 'gray'; defaultLabel: string; shortLabel: string }
> = {
  DNCR_REGISTERED:     { tone: 'red',    defaultLabel: 'DNCR Registered — Do Not Call',        shortLabel: 'DNCR Registered' },
  DNCR_NOT_REGISTERED: { tone: 'green',  defaultLabel: 'Not Registered in DNCR — Call Allowed', shortLabel: 'Call Allowed' },
  UNKNOWN:             { tone: 'orange', defaultLabel: 'Unable to Verify — Do Not Call',        shortLabel: 'Unknown' },
  CHECK_FAILED:        { tone: 'gray',   defaultLabel: 'DNCR Check Failed — Do Not Call',       shortLabel: 'Check Failed' },
};

const LABEL_REGISTERED = 'DNCR Registered — Do Not Call';
const LABEL_NOT_REGISTERED = 'Not Registered in DNCR — Call Allowed';
const LABEL_VERIFICATION_REQUIRED = 'Verification Required — Do Not Call';
const LABEL_UNABLE_TO_VERIFY = 'Unable to Verify — Do Not Call';
const LABEL_CHECK_FAILED = 'DNCR Check Failed — Do Not Call';

/** du-series mobile prefixes, in the local 0-leading form. */
const DU_PREFIXES = ['052', '055', '058'];

/**
 * Reduces any accepted UAE input to the local format the API expects
 * (leading 0, 9 digits for a landline / 10 for a mobile). Returns null when
 * the input is not a usable UAE number.
 */
export function normalizeUaeNumber(input: unknown): string | null {
  let digits = String(input ?? '').replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00971')) digits = digits.slice(5);
  else if (digits.startsWith('971')) digits = digits.slice(3);

  if (!digits.startsWith('0')) digits = `0${digits}`;

  return /^0\d{8,9}$/.test(digits) ? digits : null;
}

/** True when the normalized number belongs to the du series (052 / 055 / 058). */
export function isDuSeriesNumber(normalizedNumber: string): boolean {
  return DU_PREFIXES.some(prefix => normalizedNumber.startsWith(prefix));
}

/**
 * Collapses a status string to a comparable form: dash variants unified,
 * all whitespace removed, upper-cased. Used only for comparison - the raw
 * value is always stored untouched.
 */
function canonicalize(value: unknown): string {
  return String(value ?? '')
    .replace(/[‐-―−-]/g, '-') // hyphen, figure/en/em dash, minus, ASCII hyphen
    .replace(/\s+/g, '')
    .toUpperCase();
}

/** Matches "Account Number - Not Found" across dash and spacing variants. */
export function isAccountNumberNotFound(transactionStatus: unknown): boolean {
  return canonicalize(transactionStatus) === 'ACCOUNTNUMBER-NOTFOUND';
}

/** The API sends the strings "TRUE"/"FALSE", never booleans. */
function normalizeDncrStatus(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

const asRawString = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);

/**
 * Case 6 - the check never produced an answer (timeout, network, auth,
 * rate limit, non-2xx, acknowledgement failure).
 */
export function technicalFailure(reason: string): DncrInterpretation {
  return {
    finalStatus: 'CHECK_FAILED',
    callPermission: 'NOT_ALLOWED',
    displayLabel: LABEL_CHECK_FAILED,
    reason,
    rawDncrStatus: null,
    rawTransactionStatus: null,
    appliedRule: 'TECHNICAL_FAILURE',
  };
}

/** The number could not be put into a form the registry accepts. */
export function invalidInput(reason: string): DncrInterpretation {
  return {
    finalStatus: 'CHECK_FAILED',
    callPermission: 'NOT_ALLOWED',
    displayLabel: LABEL_CHECK_FAILED,
    reason,
    rawDncrStatus: null,
    rawTransactionStatus: null,
    appliedRule: 'INVALID_INPUT',
  };
}

/**
 * Interprets a DNCR reply for `requestedNumber`, which must already be
 * normalized by `normalizeUaeNumber`.
 */
export function interpretDncrResponse(args: {
  ok: boolean;
  httpStatus: number;
  statusText?: string;
  body: any;
  requestedNumber: string;
}): DncrInterpretation {
  const { ok, httpStatus, statusText, body, requestedNumber } = args;

  // Case 6 - non-successful HTTP response.
  if (!ok) {
    const upstream = body?.ackMessage?.errorMessage || body?.message || statusText || 'no detail given';
    return technicalFailure(`DNCR API returned HTTP ${httpStatus}: ${upstream}`);
  }

  // Case 6 - the API acknowledged the request as failed.
  const ack = body?.ackMessage?.status;
  if (ack && String(ack).trim().toUpperCase() !== 'SUCCESS') {
    const detail = body?.ackMessage?.errorMessage || 'no error message given';
    return technicalFailure(`DNCR API reported ${ack}: ${detail}`);
  }

  const unexpected = (reason: string, rawDncrStatus: string | null, rawTransactionStatus: string | null): DncrInterpretation => ({
    finalStatus: 'UNKNOWN',
    callPermission: 'NOT_ALLOWED',
    displayLabel: LABEL_UNABLE_TO_VERIFY,
    reason,
    rawDncrStatus,
    rawTransactionStatus,
    appliedRule: 'UNEXPECTED_RESPONSE',
  });

  // Case 5 - missing details.
  const details = Array.isArray(body?.details) ? body.details : [];
  if (details.length === 0) {
    return unexpected('The response contained no details array.', null, null);
  }

  // Prefer the entry that echoes the number we asked about. One request only
  // ever carries one account number, so a lone entry is unambiguously ours.
  const entry =
    details.find((d: any) => normalizeUaeNumber(d?.accountNumber) === requestedNumber) ??
    (details.length === 1 ? details[0] : undefined);

  // Case 5 - missing account result.
  if (!entry) {
    return unexpected('The response contained no result for the requested number.', null, null);
  }

  const rawDncrStatus = asRawString(entry.dncrStatus);
  const rawTransactionStatus = asRawString(entry.transactionStatus);
  const status = normalizeDncrStatus(entry.dncrStatus);

  // Case 1 - explicit TRUE always wins, whatever the transaction status says.
  if (status === 'TRUE') {
    return {
      finalStatus: 'DNCR_REGISTERED',
      callPermission: 'NOT_ALLOWED',
      displayLabel: LABEL_REGISTERED,
      reason: 'The registry reported dncrStatus TRUE: the number is registered in the DNCR.',
      rawDncrStatus,
      rawTransactionStatus,
      appliedRule: 'EXPLICIT_TRUE',
    };
  }

  // Case 2 - explicit FALSE always wins too.
  if (status === 'FALSE') {
    return {
      finalStatus: 'DNCR_NOT_REGISTERED',
      callPermission: 'ALLOWED',
      displayLabel: LABEL_NOT_REGISTERED,
      reason: 'The registry reported dncrStatus FALSE: the number is not registered in the DNCR.',
      rawDncrStatus,
      rawTransactionStatus,
      appliedRule: 'EXPLICIT_FALSE',
    };
  }

  // Cases 3 and 4 apply only when there was no explicit status at all.
  if (rawDncrStatus === null && isAccountNumberNotFound(rawTransactionStatus)) {
    if (isDuSeriesNumber(requestedNumber)) {
      // Case 3 - per e& technical support, a du-series number the registry has
      // no account for is non-DND. The raw null and message are kept as-is.
      return {
        finalStatus: 'DNCR_NOT_REGISTERED',
        callPermission: 'ALLOWED',
        displayLabel: LABEL_NOT_REGISTERED,
        reason:
          'du-series number (052/055/058) with no registry account. Per e& technical support this is treated as not registered. The raw response is unchanged.',
        rawDncrStatus,
        rawTransactionStatus,
        appliedRule: 'DU_SERIES_ACCOUNT_NOT_FOUND',
      };
    }

    // Case 4 - the same message on any other prefix is not convertible.
    return {
      finalStatus: 'UNKNOWN',
      callPermission: 'NOT_ALLOWED',
      displayLabel: LABEL_VERIFICATION_REQUIRED,
      reason:
        'The registry has no account for this number, and it is not a du-series prefix, so the result cannot be treated as not registered.',
      rawDncrStatus,
      rawTransactionStatus,
      appliedRule: 'ACCOUNT_NOT_FOUND_NON_DU',
    };
  }

  // Case 5 - unsupported dncrStatus or unexpected transactionStatus.
  return unexpected(
    rawDncrStatus === null
      ? `No dncrStatus, and the transaction status was not recognised: "${rawTransactionStatus ?? 'none'}".`
      : `Unsupported dncrStatus: "${rawDncrStatus}".`,
    rawDncrStatus,
    rawTransactionStatus,
  );
}
