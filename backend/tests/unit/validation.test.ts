/**
 * TEST-04: Unit tests for all 8 validation files.
 * Uses a minimal express app stub with supertest-style request simulation via express-validator's run().
 */
import { Request } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/** Run validation chains against a fake request body/query and return error messages. */
async function validate(
  chains: ValidationChain[],
  body: Record<string, unknown> = {},
  query: Record<string, unknown> = {},
): Promise<string[]> {
  const req = { body, query, params: {}, headers: {}, cookies: {} } as unknown as Request;
  await Promise.all(chains.map(c => c.run(req)));
  return validationResult(req).array().map(e => e.msg);
}

// --- auth ---
import { loginValidation, refreshValidation } from '../../src/modules/auth/auth.validation';

describe('loginValidation', () => {
  it('accepts valid credentials', async () => {
    expect(await validate(loginValidation, { email: 'a@b.com', password: 'secret' })).toHaveLength(0);
  });
  it('rejects missing email', async () => {
    const errs = await validate(loginValidation, { password: 'secret' });
    expect(errs.some(e => /email/i.test(e))).toBe(true);
  });
  it('rejects invalid email', async () => {
    const errs = await validate(loginValidation, { email: 'not-an-email', password: 'secret' });
    expect(errs.some(e => /email/i.test(e))).toBe(true);
  });
  it('rejects missing password', async () => {
    const errs = await validate(loginValidation, { email: 'a@b.com' });
    expect(errs.some(e => /password/i.test(e))).toBe(true);
  });
});

describe('refreshValidation', () => {
  it('accepts valid refresh token', async () => {
    expect(await validate(refreshValidation, { refreshToken: 'sometoken' })).toHaveLength(0);
  });
  it('rejects missing refresh token', async () => {
    expect(await validate(refreshValidation, {})).not.toHaveLength(0);
  });
});

// --- transactions ---
import { createTransactionValidation } from '../../src/modules/transactions/transactions.validation';

describe('createTransactionValidation', () => {
  it('accepts valid transaction', async () => {
    expect(await validate(createTransactionValidation, { patientId: 1, amount: 10.5 })).toHaveLength(0);
  });
  it('rejects invalid patientId', async () => {
    const errs = await validate(createTransactionValidation, { patientId: 0, amount: 10 });
    expect(errs.length).toBeGreaterThan(0);
  });
  it('rejects zero amount', async () => {
    const errs = await validate(createTransactionValidation, { patientId: 1, amount: 0 });
    expect(errs.length).toBeGreaterThan(0);
  });
  it('rejects invalid type', async () => {
    const errs = await validate(createTransactionValidation, { patientId: 1, amount: 10, type: 'INVALID' });
    expect(errs.length).toBeGreaterThan(0);
  });
  it('accepts valid enum type', async () => {
    expect(await validate(createTransactionValidation, { patientId: 1, amount: 10, type: 'PAYMENT' })).toHaveLength(0);
  });
});

// --- travelOrders ---
import { generateValidation } from '../../src/modules/travelOrders/travelOrders.validation';

describe('generateValidation', () => {
  it('accepts valid query', async () => {
    expect(await validate(generateValidation, {}, { patientId: '1', month: '6', year: '2024' })).toHaveLength(0);
  });
  it('rejects invalid patientId', async () => {
    const errs = await validate(generateValidation, {}, { patientId: '0', month: '6', year: '2024' });
    expect(errs.length).toBeGreaterThan(0);
  });
  it('rejects month out of range', async () => {
    const errs = await validate(generateValidation, {}, { patientId: '1', month: '13', year: '2024' });
    expect(errs.length).toBeGreaterThan(0);
  });
  it('rejects non-numeric year', async () => {
    const errs = await validate(generateValidation, {}, { patientId: '1', month: '6', year: 'abc' });
    expect(errs.length).toBeGreaterThan(0);
  });
});

// --- rooms ---
import { createRoomValidation, updateRoomValidation } from '../../src/modules/rooms/rooms.validation';

describe('createRoomValidation', () => {
  it('accepts valid name', async () => {
    expect(await validate(createRoomValidation, { name: 'Room A' })).toHaveLength(0);
  });
  it('rejects empty name', async () => {
    const errs = await validate(createRoomValidation, { name: '' });
    expect(errs.length).toBeGreaterThan(0);
  });
  it('rejects missing name', async () => {
    const errs = await validate(createRoomValidation, {});
    expect(errs.length).toBeGreaterThan(0);
  });
});

describe('updateRoomValidation', () => {
  it('accepts valid isActive', async () => {
    expect(await validate(updateRoomValidation, { isActive: true })).toHaveLength(0);
  });
  it('rejects non-boolean isActive', async () => {
    const errs = await validate(updateRoomValidation, { isActive: 'yes' });
    expect(errs.length).toBeGreaterThan(0);
  });
  it('accepts partial update with only name', async () => {
    expect(await validate(updateRoomValidation, { name: 'New Name' })).toHaveLength(0);
  });
});
