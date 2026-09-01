/**
 * Run with:  npm run test:logic
 *
 * These cover the fail-closed rule: only an explicit "not listed" from the
 * registry may produce ALLOWED.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeUaeNumber, evaluateDncrResponse } from './dncrLogic';

test('normalizeUaeNumber accepts the formats users actually type', () => {
  // local mobile and landline, with and without separators
  assert.equal(normalizeUaeNumber('0509002528'), '0509002528');
  assert.equal(normalizeUaeNumber('050 900 2528'), '0509002528');
  assert.equal(normalizeUaeNumber('04 123 4567'), '041234567');

  // international forms must collapse to the local form Etisalat expects
  assert.equal(normalizeUaeNumber('971509002528'), '0509002528');
  assert.equal(normalizeUaeNumber('+971 50 900 2528'), '0509002528');
  assert.equal(normalizeUaeNumber('00971509002528'), '0509002528');
  assert.equal(normalizeUaeNumber('971 4 123 4567'), '041234567');

  // bare subscriber number
  assert.equal(normalizeUaeNumber('509002528'), '0509002528');
});

test('normalizeUaeNumber rejects anything it cannot vouch for', () => {
  for (const bad of ['', '   ', 'abc', '12', '05012345678901', null, undefined]) {
    assert.equal(normalizeUaeNumber(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});

test('an explicit TRUE is BLOCKED', () => {
  const out = evaluateDncrResponse({
    ok: true, httpStatus: 200, body: {
      details: [{ accountNumber: '0509002528', dncrStatus: 'TRUE' }],
      ackMessage: { status: 'SUCCESS' },
    }, requestedNumber: '0509002528',
  });
  assert.equal(out.status, 'BLOCKED');
});

test('an explicit FALSE is ALLOWED - the only path to ALLOWED', () => {
  const out = evaluateDncrResponse({
    ok: true, httpStatus: 200, body: {
      details: [{ accountNumber: '0509002528', dncrStatus: 'FALSE' }],
      ackMessage: { status: 'SUCCESS' },
    }, requestedNumber: '0509002528',
  });
  assert.equal(out.status, 'ALLOWED');
});

test('dncrStatus casing and padding do not change the verdict', () => {
  for (const raw of ['true', ' True ', 'TRUE']) {
    const out = evaluateDncrResponse({
      ok: true, httpStatus: 200,
      body: { details: [{ accountNumber: '0509002528', dncrStatus: raw }] },
      requestedNumber: '0509002528',
    });
    assert.equal(out.status, 'BLOCKED', `"${raw}" must be BLOCKED, not silently allowed`);
  }
});

test('the registry may echo the number in any format', () => {
  const out = evaluateDncrResponse({
    ok: true, httpStatus: 200,
    body: { details: [{ accountNumber: '971509002528', dncrStatus: 'TRUE' }] },
    requestedNumber: '0509002528',
  });
  assert.equal(out.status, 'BLOCKED');
});

// --- everything below must NOT be ALLOWED ---

test('an HTTP error is ERROR, not ALLOWED', () => {
  for (const [code, text] of [[401, 'Unauthorized'], [500, 'Internal Server Error']] as const) {
    const out = evaluateDncrResponse({
      ok: false, httpStatus: code, statusText: text, body: {}, requestedNumber: '0509002528',
    });
    assert.equal(out.status, 'ERROR', `HTTP ${code} must not be ALLOWED`);
  }
});

test('ackMessage FAILURE on a 200 is ERROR, not ALLOWED', () => {
  const out = evaluateDncrResponse({
    ok: true, httpStatus: 200, body: {
      ackMessage: { status: 'FAILURE', errorCode: 'TIB-002', errorMessage: 'Invalid Request' },
    }, requestedNumber: '0509002528',
  });
  assert.equal(out.status, 'ERROR');
  assert.match((out as any).error, /TIB-002|Invalid Request|FAILURE/);
});

test('an empty or missing details array is ERROR, not ALLOWED', () => {
  for (const body of [{ details: [] }, {}, { details: null }]) {
    const out = evaluateDncrResponse({ ok: true, httpStatus: 200, body, requestedNumber: '0509002528' });
    assert.equal(out.status, 'ERROR', `${JSON.stringify(body)} must not be ALLOWED`);
  }
});

test('a result for a different number is ERROR, not ALLOWED', () => {
  const out = evaluateDncrResponse({
    ok: true, httpStatus: 200,
    body: { details: [{ accountNumber: '0551234567', dncrStatus: 'FALSE' }] },
    requestedNumber: '0509002528',
  });
  assert.equal(out.status, 'ERROR');
});

test('an unrecognised dncrStatus is ERROR, not ALLOWED', () => {
  for (const raw of ['MAYBE', '', null, undefined, 'Y', '1']) {
    const out = evaluateDncrResponse({
      ok: true, httpStatus: 200,
      body: { details: [{ accountNumber: '0509002528', dncrStatus: raw }] },
      requestedNumber: '0509002528',
    });
    assert.equal(out.status, 'ERROR', `dncrStatus ${JSON.stringify(raw)} must not be ALLOWED`);
  }
});

test('an unparseable body is ERROR, not ALLOWED', () => {
  const out = evaluateDncrResponse({
    ok: true, httpStatus: 200, body: { error: 'Failed to parse JSON' }, requestedNumber: '0509002528',
  });
  assert.equal(out.status, 'ERROR');
});
