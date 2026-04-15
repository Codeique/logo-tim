import { hashToken, verifyToken } from '../../src/modules/auth/auth.service';

// generateTokens requires JWT_SECRET env var — tested via integration
describe('hashToken / verifyToken', () => {
  const raw = 'some.jwt.refresh.token.string';

  it('hashes to a 64-char hex string', () => {
    expect(hashToken(raw)).toHaveLength(64);
    expect(hashToken(raw)).toMatch(/^[a-f0-9]+$/);
  });

  it('is deterministic', () => {
    expect(hashToken(raw)).toBe(hashToken(raw));
  });

  it('verifyToken returns true for matching pair', () => {
    const hash = hashToken(raw);
    expect(verifyToken(raw, hash)).toBe(true);
  });

  it('verifyToken returns false for wrong token', () => {
    const hash = hashToken(raw);
    expect(verifyToken('different.token', hash)).toBe(false);
  });

  it('different inputs produce different hashes', () => {
    expect(hashToken('tokenA')).not.toBe(hashToken('tokenB'));
  });
});
