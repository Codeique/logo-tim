import { parsePagination } from '../../src/lib/pagination';

describe('parsePagination', () => {
  it('returns defaults when no query params given', () => {
    const result = parsePagination({});
    expect(result).toEqual({ skip: 0, take: 50, page: 1, limit: 50 });
  });

  it('computes skip correctly for page > 1', () => {
    const result = parsePagination({ page: '3', limit: '10' });
    expect(result).toEqual({ skip: 20, take: 10, page: 3, limit: 10 });
  });

  it('clamps page=0 to page=1', () => {
    const result = parsePagination({ page: '0' });
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('clamps negative page to page=1', () => {
    const result = parsePagination({ page: '-5' });
    expect(result.page).toBe(1);
  });

  it('falls back to page=1 for non-numeric page', () => {
    const result = parsePagination({ page: 'abc' });
    expect(result.page).toBe(1);
  });

  it('respects the default maxLimit of 100', () => {
    const result = parsePagination({ limit: '500' });
    expect(result.limit).toBe(100);
    expect(result.take).toBe(100);
  });

  it('respects a custom maxLimit', () => {
    const result = parsePagination({ limit: '500' }, 200);
    expect(result.limit).toBe(200);
  });

  it('treats limit=0 as falsy and falls back to default 50', () => {
    // parseInt('0') is 0 (falsy) → 0 || 50 = 50
    const result = parsePagination({ limit: '0' });
    expect(result.limit).toBe(50);
  });

  it('falls back to limit=50 for non-numeric limit', () => {
    const result = parsePagination({ limit: 'xyz' });
    expect(result.limit).toBe(50);
  });
});
