/**
 * Run with:  npm run test:logic
 *
 * Covers every case in the official DNCR decision rules, plus the fail-closed
 * guarantee: callPermission is ALLOWED only for cases 2 and 3.
 *
 * No real or sample customer numbers appear here. Every number is built from
 * a network prefix plus a zero filler, so it is structurally valid and
 * obviously not a subscriber.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DncrInterpretation,
  interpretDncrResponse,
  invalidInput,
  isAccountNumberNotFound,
  isDuSeriesNumber,
  normalizeUaeNumber,
  technicalFailure,
} from './dncrStatus';

// --- synthetic numbers: prefix + zero filler, never a subscriber number ---
const filler = (len: number) => '0'.repeat(len);
const DU_052 = `052${filler(7)}`;
const DU_055 = `055${filler(7)}`;
const DU_058 = `058${filler(7)}`;
const ETISALAT_050 = `050${filler(7)}`;
const ETISALAT_056 = `056${filler(7)}`;
const LANDLINE_04 = `04${filler(7)}`;

const ACCOUNT_NOT_FOUND = 'Account Number – Not Found'; // en dash, as the API sends it

/** Builds a 200 reply carrying a single account result. */
const reply = (accountNumber: string, fields: Record<string, unknown>) => ({
  transactionId: 'txn-test',
  ackMessage: { status: 'SUCCESS' },
  details: [{ accountNumber, ...fields }],
});

const run = (number: string, body: any): DncrInterpretation =>
  interpretDncrResponse({ ok: true, httpStatus: 200, body, requestedNumber: number });

// ---------------------------------------------------------------- helpers --

test('normalizeUaeNumber reduces every accepted input form to the local form', () => {
  assert.equal(normalizeUaeNumber(ETISALAT_050), ETISALAT_050);
  assert.equal(normalizeUaeNumber(`971${ETISALAT_050.slice(1)}`), ETISALAT_050);
  assert.equal(normalizeUaeNumber(`+971 ${ETISALAT_050.slice(1)}`), ETISALAT_050);
  assert.equal(normalizeUaeNumber(`00971${ETISALAT_050.slice(1)}`), ETISALAT_050);
  assert.equal(normalizeUaeNumber(ETISALAT_050.slice(1)), ETISALAT_050);
  assert.equal(normalizeUaeNumber(LANDLINE_04), LANDLINE_04);
});

test('normalizeUaeNumber rejects what it cannot vouch for', () => {
  for (const bad of ['', '   ', 'abc', '12', `${ETISALAT_050}12345`, null, undefined]) {
    assert.equal(normalizeUaeNumber(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});

test('du-series prefixes are 052, 055 and 058 only', () => {
  for (const n of [DU_052, DU_055, DU_058]) assert.equal(isDuSeriesNumber(n), true, n);
  for (const n of [ETISALAT_050, ETISALAT_056, LANDLINE_04]) assert.equal(isDuSeriesNumber(n), false, n);
});

// ------------------------------------------------ case 1: dncrStatus TRUE --

test('case 1: dncrStatus TRUE is DNCR_REGISTERED and not callable', () => {
  const out = run(ETISALAT_050, reply(ETISALAT_050, { dncrStatus: 'TRUE', transactionStatus: null }));
  assert.equal(out.finalStatus, 'DNCR_REGISTERED');
  assert.equal(out.callPermission, 'NOT_ALLOWED');
  assert.equal(out.displayLabel, 'DNCR Registered — Do Not Call');
  assert.equal(out.appliedRule, 'EXPLICIT_TRUE');
});

test('case 1: the string "FALSE" must never be read as truthy, nor "TRUE" as a boolean', () => {
  // Guards the classic bug: if (dncrStatus) is true for BOTH "TRUE" and "FALSE".
  const registered = run(ETISALAT_050, reply(ETISALAT_050, { dncrStatus: 'TRUE' }));
  const notRegistered = run(ETISALAT_050, reply(ETISALAT_050, { dncrStatus: 'FALSE' }));
  assert.notEqual(registered.finalStatus, notRegistered.finalStatus);
  assert.equal(registered.callPermission, 'NOT_ALLOWED');
  assert.equal(notRegistered.callPermission, 'ALLOWED');
});

// ----------------------------------------------- case 2: dncrStatus FALSE --

test('case 2: dncrStatus FALSE is DNCR_NOT_REGISTERED and callable', () => {
  const out = run(ETISALAT_050, reply(ETISALAT_050, { dncrStatus: 'FALSE', transactionStatus: null }));
  assert.equal(out.finalStatus, 'DNCR_NOT_REGISTERED');
  assert.equal(out.callPermission, 'ALLOWED');
  assert.equal(out.displayLabel, 'Not Registered in DNCR — Call Allowed');
  assert.equal(out.appliedRule, 'EXPLICIT_FALSE');
});

test('dncrStatus casing and surrounding whitespace do not change the verdict', () => {
  for (const raw of ['true', 'True', ' TRUE ', '\ttRuE\n']) {
    assert.equal(run(ETISALAT_050, reply(ETISALAT_050, { dncrStatus: raw })).finalStatus,
      'DNCR_REGISTERED', `${JSON.stringify(raw)} must be registered`);
  }
  for (const raw of ['false', 'False', ' FALSE ', '\tfAlSe\n']) {
    assert.equal(run(ETISALAT_050, reply(ETISALAT_050, { dncrStatus: raw })).finalStatus,
      'DNCR_NOT_REGISTERED', `${JSON.stringify(raw)} must be not-registered`);
  }
});

// ------------------- case 3: du-series + "Account Number – Not Found" --

test('case 3: du-series with account-not-found is treated as not registered', () => {
  for (const number of [DU_052, DU_055, DU_058]) {
    const out = run(number, reply(number, { dncrStatus: null, transactionStatus: ACCOUNT_NOT_FOUND }));
    assert.equal(out.finalStatus, 'DNCR_NOT_REGISTERED', number);
    assert.equal(out.callPermission, 'ALLOWED', number);
    assert.equal(out.displayLabel, 'Not Registered in DNCR — Call Allowed');
    assert.equal(out.appliedRule, 'DU_SERIES_ACCOUNT_NOT_FOUND');
  }
});

test('case 3: the raw API values survive the conversion untouched', () => {
  const out = run(DU_055, reply(DU_055, { dncrStatus: null, transactionStatus: ACCOUNT_NOT_FOUND }));
  assert.equal(out.rawDncrStatus, null, 'the original null must not be rewritten to FALSE');
  assert.equal(out.rawTransactionStatus, ACCOUNT_NOT_FOUND, 'the original message must be preserved verbatim');
});

test('case 3: the response object itself is never mutated', () => {
  const body = reply(DU_055, { dncrStatus: null, transactionStatus: ACCOUNT_NOT_FOUND });
  const before = JSON.stringify(body);
  run(DU_055, body);
  assert.equal(JSON.stringify(body), before, 'the raw response must be left exactly as received');
});

test('case 3: dash and whitespace variants of the message all match', () => {
  const variants = [
    'Account Number - Not Found',      // ASCII hyphen
    'Account Number – Not Found', // en dash
    'Account Number — Not Found', // em dash
    'Account Number − Not Found', // minus sign
    '  Account   Number  -  Not   Found  ',
    'ACCOUNT NUMBER - NOT FOUND',
    'account number - not found',
    'Account Number-Not Found',        // no spaces around the dash
  ];
  for (const variant of variants) {
    assert.equal(isAccountNumberNotFound(variant), true, `should match: ${JSON.stringify(variant)}`);
    const out = run(DU_055, reply(DU_055, { dncrStatus: null, transactionStatus: variant }));
    assert.equal(out.finalStatus, 'DNCR_NOT_REGISTERED', `should convert: ${JSON.stringify(variant)}`);
    assert.equal(out.rawTransactionStatus, variant, 'the raw variant must be stored as sent');
  }
});

test('unrelated transaction messages are not mistaken for account-not-found', () => {
  for (const other of ['Account Found', 'Not Found', 'Account Number - Suspended', '', null]) {
    assert.equal(isAccountNumberNotFound(other), false, JSON.stringify(other));
  }
});

// ----------------- case 4: account-not-found on any other prefix --

test('case 4: account-not-found on a non-du prefix stays UNKNOWN and not callable', () => {
  for (const number of [ETISALAT_050, ETISALAT_056, LANDLINE_04]) {
    const out = run(number, reply(number, { dncrStatus: null, transactionStatus: ACCOUNT_NOT_FOUND }));
    assert.equal(out.finalStatus, 'UNKNOWN', number);
    assert.equal(out.callPermission, 'NOT_ALLOWED', number);
    assert.equal(out.displayLabel, 'Verification Required — Do Not Call');
    assert.equal(out.appliedRule, 'ACCOUNT_NOT_FOUND_NON_DU');
    assert.equal(out.rawTransactionStatus, ACCOUNT_NOT_FOUND);
  }
});

// ------------------------------------------- rule ordering: explicit first --

test('an explicit status always beats the du-series fallback', () => {
  // TRUE on a du-series number with the account-not-found message stays TRUE.
  const registered = run(DU_055, reply(DU_055, { dncrStatus: 'TRUE', transactionStatus: ACCOUNT_NOT_FOUND }));
  assert.equal(registered.finalStatus, 'DNCR_REGISTERED');
  assert.equal(registered.appliedRule, 'EXPLICIT_TRUE');

  const notRegistered = run(DU_055, reply(DU_055, { dncrStatus: 'FALSE', transactionStatus: ACCOUNT_NOT_FOUND }));
  assert.equal(notRegistered.appliedRule, 'EXPLICIT_FALSE');
});

test('an unsupported dncrStatus blocks the du-series fallback', () => {
  // The fallback applies only when dncrStatus is null.
  const out = run(DU_055, reply(DU_055, { dncrStatus: 'MAYBE', transactionStatus: ACCOUNT_NOT_FOUND }));
  assert.equal(out.finalStatus, 'UNKNOWN');
  assert.equal(out.appliedRule, 'UNEXPECTED_RESPONSE');
  assert.equal(out.callPermission, 'NOT_ALLOWED');
});

// ------------------------------- case 5: missing or unexpected response --

test('case 5: missing details is UNKNOWN and not callable', () => {
  for (const body of [{}, { details: null }, { details: [] }, { ackMessage: { status: 'SUCCESS' } }]) {
    const out = run(ETISALAT_050, body);
    assert.equal(out.finalStatus, 'UNKNOWN', JSON.stringify(body));
    assert.equal(out.callPermission, 'NOT_ALLOWED');
    assert.equal(out.displayLabel, 'Unable to Verify — Do Not Call');
  }
});

test('case 5: a result for a different number is UNKNOWN, not callable', () => {
  const body = {
    details: [
      { accountNumber: ETISALAT_050, dncrStatus: 'FALSE' },
      { accountNumber: ETISALAT_056, dncrStatus: 'FALSE' },
    ],
  };
  const out = run(DU_055, body); // asked about a third number
  assert.equal(out.finalStatus, 'UNKNOWN');
  assert.equal(out.callPermission, 'NOT_ALLOWED');
});

test('case 5: an unsupported dncrStatus is UNKNOWN and not callable', () => {
  for (const raw of ['MAYBE', 'Y', '1', 'YES', '']) {
    const out = run(ETISALAT_050, reply(ETISALAT_050, { dncrStatus: raw }));
    assert.equal(out.finalStatus, 'UNKNOWN', JSON.stringify(raw));
    assert.equal(out.callPermission, 'NOT_ALLOWED');
    assert.equal(out.appliedRule, 'UNEXPECTED_RESPONSE');
  }
});

test('case 5: a null status with an unexpected message is UNKNOWN and not callable', () => {
  const out = run(DU_055, reply(DU_055, { dncrStatus: null, transactionStatus: 'Service Temporarily Unavailable' }));
  assert.equal(out.finalStatus, 'UNKNOWN');
  assert.equal(out.callPermission, 'NOT_ALLOWED');
  assert.equal(out.rawTransactionStatus, 'Service Temporarily Unavailable');
});

test('case 5: a malformed body is UNKNOWN and not callable', () => {
  const out = run(ETISALAT_050, { error: 'Failed to parse JSON' });
  assert.equal(out.finalStatus, 'UNKNOWN');
  assert.equal(out.callPermission, 'NOT_ALLOWED');
});

// ------------------------------------------- case 6: technical failure --

test('case 6: a non-successful HTTP response is CHECK_FAILED and not callable', () => {
  for (const [code, text] of [[401, 'Unauthorized'], [429, 'Too Many Requests'], [500, 'Internal Server Error']] as const) {
    const out = interpretDncrResponse({
      ok: false, httpStatus: code, statusText: text, body: {}, requestedNumber: ETISALAT_050,
    });
    assert.equal(out.finalStatus, 'CHECK_FAILED', `HTTP ${code}`);
    assert.equal(out.callPermission, 'NOT_ALLOWED');
    assert.equal(out.displayLabel, 'DNCR Check Failed — Do Not Call');
    assert.equal(out.appliedRule, 'TECHNICAL_FAILURE');
  }
});

test('case 6: an acknowledgement failure on a 200 is CHECK_FAILED, not callable', () => {
  const out = run(ETISALAT_050, {
    ackMessage: { status: 'FAILURE', errorCode: 'TIB-002', errorMessage: 'Invalid Request' },
    details: [{ accountNumber: ETISALAT_050, dncrStatus: 'FALSE' }],
  });
  assert.equal(out.finalStatus, 'CHECK_FAILED');
  assert.equal(out.callPermission, 'NOT_ALLOWED');
  assert.match(out.reason, /FAILURE|Invalid Request/);
});

test('case 6: timeouts and network errors are CHECK_FAILED and not callable', () => {
  for (const reason of ['The operation was aborted due to timeout', 'fetch failed: ECONNRESET']) {
    const out = technicalFailure(reason);
    assert.equal(out.finalStatus, 'CHECK_FAILED');
    assert.equal(out.callPermission, 'NOT_ALLOWED');
    assert.equal(out.reason, reason);
  }
});

test('an unusable input is CHECK_FAILED and not callable', () => {
  const out = invalidInput('The number is not a valid UAE number, so it could not be checked.');
  assert.equal(out.finalStatus, 'CHECK_FAILED');
  assert.equal(out.callPermission, 'NOT_ALLOWED');
  assert.equal(out.appliedRule, 'INVALID_INPUT');
});

// ------------------------------------------------ the fail-closed rule --

test('ALLOWED is reachable only through an explicit FALSE or the du-series rule', () => {
  const allowedRules = new Set(['EXPLICIT_FALSE', 'DU_SERIES_ACCOUNT_NOT_FOUND']);

  const everyOutcome: DncrInterpretation[] = [
    run(ETISALAT_050, reply(ETISALAT_050, { dncrStatus: 'TRUE' })),
    run(ETISALAT_050, reply(ETISALAT_050, { dncrStatus: 'FALSE' })),
    run(DU_055, reply(DU_055, { dncrStatus: null, transactionStatus: ACCOUNT_NOT_FOUND })),
    run(ETISALAT_050, reply(ETISALAT_050, { dncrStatus: null, transactionStatus: ACCOUNT_NOT_FOUND })),
    run(ETISALAT_050, reply(ETISALAT_050, { dncrStatus: 'MAYBE' })),
    run(ETISALAT_050, {}),
    run(ETISALAT_050, { details: [] }),
    interpretDncrResponse({ ok: false, httpStatus: 500, body: {}, requestedNumber: ETISALAT_050 }),
    technicalFailure('network down'),
    invalidInput('bad input'),
  ];

  for (const outcome of everyOutcome) {
    if (outcome.callPermission === 'ALLOWED') {
      assert.ok(allowedRules.has(outcome.appliedRule), `${outcome.appliedRule} must not permit calling`);
      assert.equal(outcome.finalStatus, 'DNCR_NOT_REGISTERED');
    } else {
      assert.notEqual(outcome.finalStatus, 'DNCR_NOT_REGISTERED');
    }
  }
});
