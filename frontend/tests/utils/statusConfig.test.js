import { describe, it, expect } from 'vitest';
import {
  SESSION_STATUS,
  ROLE_CONFIG,
  ROLE_OPTIONS,
  ACTION_CONFIG,
  TRANSACTION_TYPE,
} from '../../src/utils/statusConfig';

describe('SESSION_STATUS', () => {
  const KEYS = ['SCHEDULED', 'COMPLETED', 'CANCELED'];

  it('has exactly SCHEDULED, COMPLETED, and CANCELED keys', () => {
    expect(Object.keys(SESSION_STATUS)).toEqual(expect.arrayContaining(KEYS));
    expect(Object.keys(SESSION_STATUS)).toHaveLength(3);
  });

  it.each(KEYS)('%s entry has label, chipColor, hex, and bg', (key) => {
    const entry = SESSION_STATUS[key];
    expect(entry).toHaveProperty('label');
    expect(entry).toHaveProperty('chipColor');
    expect(entry).toHaveProperty('hex');
    expect(entry).toHaveProperty('bg');
    expect(typeof entry.label).toBe('string');
  });

  it('SCHEDULED uses primary chip color', () => {
    expect(SESSION_STATUS.SCHEDULED.chipColor).toBe('primary');
  });

  it('COMPLETED uses success chip color', () => {
    expect(SESSION_STATUS.COMPLETED.chipColor).toBe('success');
  });

  it('CANCELED uses error chip color', () => {
    expect(SESSION_STATUS.CANCELED.chipColor).toBe('error');
  });
});

describe('ROLE_CONFIG', () => {
  const ROLES = ['ADMIN', 'THERAPIST', 'CHIEF_THERAPIST', 'PATIENT'];

  it('has entries for all four roles', () => {
    expect(Object.keys(ROLE_CONFIG)).toEqual(expect.arrayContaining(ROLES));
    expect(Object.keys(ROLE_CONFIG)).toHaveLength(4);
  });

  it.each(ROLES)('%s entry has label, color, bg, and border', (role) => {
    const entry = ROLE_CONFIG[role];
    expect(entry).toHaveProperty('label');
    expect(entry).toHaveProperty('color');
    expect(entry).toHaveProperty('bg');
    expect(entry).toHaveProperty('border');
    expect(typeof entry.label).toBe('string');
  });

  it('CHIEF_THERAPIST has a distinct color from THERAPIST', () => {
    expect(ROLE_CONFIG.CHIEF_THERAPIST.color).not.toBe(ROLE_CONFIG.THERAPIST.color);
  });
});

describe('ROLE_OPTIONS', () => {
  it('contains exactly 3 options', () => {
    expect(ROLE_OPTIONS).toHaveLength(3);
  });

  it('each option has a string value and label', () => {
    for (const opt of ROLE_OPTIONS) {
      expect(opt).toHaveProperty('value');
      expect(opt).toHaveProperty('label');
      expect(typeof opt.value).toBe('string');
      expect(typeof opt.label).toBe('string');
    }
  });

  it('does not include PATIENT role (patients cannot be created via role selection)', () => {
    const values = ROLE_OPTIONS.map((o) => o.value);
    expect(values).not.toContain('PATIENT');
  });

  it('includes ADMIN, THERAPIST, and CHIEF_THERAPIST', () => {
    const values = ROLE_OPTIONS.map((o) => o.value);
    expect(values).toContain('ADMIN');
    expect(values).toContain('THERAPIST');
    expect(values).toContain('CHIEF_THERAPIST');
  });
});

describe('ACTION_CONFIG', () => {
  const ACTIONS = ['CREATE', 'UPDATE', 'DELETE'];

  it('has CREATE, UPDATE, and DELETE entries', () => {
    expect(Object.keys(ACTION_CONFIG)).toEqual(expect.arrayContaining(ACTIONS));
    expect(Object.keys(ACTION_CONFIG)).toHaveLength(3);
  });

  it.each(ACTIONS)('%s has color and label', (action) => {
    expect(ACTION_CONFIG[action]).toHaveProperty('color');
    expect(ACTION_CONFIG[action]).toHaveProperty('label');
  });

  it('CREATE is success, UPDATE is warning, DELETE is error', () => {
    expect(ACTION_CONFIG.CREATE.color).toBe('success');
    expect(ACTION_CONFIG.UPDATE.color).toBe('warning');
    expect(ACTION_CONFIG.DELETE.color).toBe('error');
  });
});

describe('TRANSACTION_TYPE', () => {
  it('has PAYMENT and REFUND entries', () => {
    expect(TRANSACTION_TYPE).toHaveProperty('PAYMENT');
    expect(TRANSACTION_TYPE).toHaveProperty('REFUND');
    expect(Object.keys(TRANSACTION_TYPE)).toHaveLength(2);
  });

  it('each entry has label and color', () => {
    for (const type of Object.values(TRANSACTION_TYPE)) {
      expect(type).toHaveProperty('label');
      expect(type).toHaveProperty('color');
    }
  });

  it('PAYMENT is success and REFUND is error', () => {
    expect(TRANSACTION_TYPE.PAYMENT.color).toBe('success');
    expect(TRANSACTION_TYPE.REFUND.color).toBe('error');
  });
});
