import {
  computeMissingSlots,
  heuristicExtractSlots,
  inferExpenseNature,
  normalizeMajorType,
  normalizeReasonText
} from '../src/common/utils';

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

  it('normalizes reason text and strips control words', () => {
    expect(normalizeReasonText('确认，午饭外卖')).toBe('午饭外卖');
    expect(normalizeReasonText('确认')).toBeUndefined();
  });

  it('normalizes majorType by spending signal', () => {
    expect(
      normalizeMajorType({
        majorType: 'fixed',
        reason: '饿了么外卖午餐',
        platformTags: ['饿了么']
      })
    ).toBe('extra');
    expect(
      normalizeMajorType({
        majorType: 'extra',
        reason: '房租'
      })
    ).toBe('fixed');
  });

  it('infers expense nature for optional, essential and one-off', () => {
    expect(
      inferExpenseNature({
        majorType: 'extra',
        reason: '奶茶',
        platformTags: ['饿了么'],
        amount: 20
      })
    ).toBe('optional');
    expect(
      inferExpenseNature({
        majorType: 'fixed',
        reason: '房租',
        amount: 2800
      })
    ).toBe('essential');
    expect(
      inferExpenseNature({
        majorType: 'extra',
        reason: '亲子乐园',
        amount: 680
      })
    ).toBe('one_off');
  });
});
