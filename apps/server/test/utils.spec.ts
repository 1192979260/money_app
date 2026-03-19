import { computeMissingSlots, heuristicExtractSlots } from '../src/common/utils';

describe('utils', () => {
  it('extracts slots from natural language', () => {
    const result = heuristicExtractSlots('昨天淘宝给孩子买文具花了123.5元，额外支出');
    expect(result.amount).toBe(123.5);
    expect(result.majorType).toBe('extra');
    expect(result.platformTags).toContain('淘宝');
    expect(result.usageType).toBe('child');
  });

  it('does not auto-fill occurredAt when no explicit date is provided', () => {
    const result = heuristicExtractSlots('今天午饭 28 元，淘宝，额外支出');
    expect(result.occurredAt).toBeUndefined();
  });

  it('detects missing slots and includes remark decision', () => {
    const missing = computeMissingSlots({ amount: 88, majorType: 'fixed', platformTags: ['现金'] });
    expect(missing).toContain('usageType');
    expect(missing).toContain('reason');
    expect(missing).toContain('occurredAt');
    expect(missing).toContain('needRemark');
  });

  it('asks remark content only when needRemark is true', () => {
    const missing = computeMissingSlots({
      amount: 88,
      majorType: 'fixed',
      platformTags: ['现金'],
      usageType: 'self',
      reason: '午饭',
      occurredAt: new Date().toISOString(),
      needRemark: true
    });
    expect(missing).toContain('remark');
  });
});
