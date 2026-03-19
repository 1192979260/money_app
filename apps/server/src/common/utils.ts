import { MajorType, SlotName, SlotValues } from '@money-app/shared';

const majorTypeMap: Record<string, MajorType> = {
  固定支出: 'fixed',
  房租: 'fixed',
  水电: 'fixed',
  额外支出: 'extra',
  消费: 'extra',
  收入: 'income',
  工资: 'income'
};

const usageMap: Record<string, SlotValues['usageType']> = {
  家庭: 'family',
  老婆: 'self',
  本人: 'self',
  孩子: 'child',
  老公: 'husband'
};

const reasonControlWords = new Set([
  '确认',
  '确认入账',
  '好的',
  '好',
  'ok',
  'okay',
  '是',
  '不是',
  '需要',
  '不需要',
  '无需',
  '不用',
  '无',
  '有',
  '嗯',
  '收到'
]);

export function isValidReasonText(text: string | undefined | null) {
  const normalized = (text || '').trim().toLowerCase();
  if (!normalized) return false;
  if (reasonControlWords.has(normalized)) return false;
  if (/^[-+]?(\d+(?:\.\d{1,2})?)\s*(元|块|rmb|￥)?$/i.test(normalized)) return false;
  if (/^金额[:：]?\s*[-+]?(\d+(?:\.\d{1,2})?)\s*(元|块|rmb|￥)?$/i.test(normalized)) return false;
  if (/^(现金|京东|淘宝|抖音|饿了么|叮咚买菜)$/.test(normalized)) return false;
  return true;
}

export function heuristicExtractSlots(text: string): Partial<SlotValues> {
  const amountMatch = text.match(/(\d+(?:\.\d{1,2})?)\s*(元|块)?/);
  const dateMatch = text.match(/(\d{4}-\d{1,2}-\d{1,2})/);
  const remarkMatch = text.match(/备注[:：\s]*(.+)$/);

  const extracted: Partial<SlotValues> = {};
  if (amountMatch) extracted.amount = Number(amountMatch[1]);

  for (const [k, v] of Object.entries(majorTypeMap)) {
    if (text.includes(k)) {
      extracted.majorType = v;
      break;
    }
  }

  for (const [k, v] of Object.entries(usageMap)) {
    if (text.includes(k)) {
      extracted.usageType = v;
      break;
    }
  }

  const platformCandidates = ['现金', '京东', '淘宝', '抖音', '饿了么', '叮咚买菜'];
  const tags = platformCandidates.filter((it) => text.includes(it));
  if (tags.length > 0) extracted.platformTags = tags;

  if (/不需要备注|无需备注|不用备注|没有备注|无备注/.test(text)) {
    extracted.needRemark = false;
    extracted.remark = '';
  } else if (/需要备注|有备注|备注一下/.test(text)) {
    extracted.needRemark = true;
  }

  if (remarkMatch?.[1]) {
    extracted.needRemark = true;
    extracted.remark = remarkMatch[1].trim();
  }

  const reasonText = text.trim();
  if (isValidReasonText(reasonText)) {
    extracted.reason = reasonText;
  }
  // Only fill occurredAt when user explicitly provides a date,
  // otherwise keep it missing so the conversation can ask for it.
  if (dateMatch) {
    extracted.occurredAt = new Date(dateMatch[1]).toISOString();
  }

  return extracted;
}

export function computeMissingSlots(slotValues: Partial<SlotValues>): SlotName[] {
  const required: SlotName[] = ['amount', 'majorType', 'platformTags', 'reason', 'occurredAt'];
  if (slotValues.majorType !== 'income') {
    required.push('usageType');
  }
  required.push('needRemark');
  return required
    .concat(slotValues.needRemark ? (['remark'] as SlotName[]) : [])
    .filter((slot) => {
      const value = slotValues[slot as keyof SlotValues];
      if (Array.isArray(value)) return value.length === 0;
      return value === undefined || value === null || value === '';
    });
}

export function slotQuestion(slot: SlotName): string {
  switch (slot) {
    case 'amount':
      return '这笔账单金额是多少？';
    case 'majorType':
      return '请确认大分类：固定支出、额外支出还是收入？';
    case 'platformTags':
      return '这笔消费的平台是哪些？例如现金、京东、淘宝、抖音、饿了么、叮咚买菜';
    case 'usageType':
      return '这笔账归属家庭、老婆、孩子还是老公？';
    case 'reason':
      return '请补充这笔账单的详细用途或来源。';
    case 'occurredAt':
      return '这笔账发生在什么时候？请提供日期。';
    case 'needRemark':
      return '是否需要记录账单备注？（回复：需要 / 不需要）';
    case 'remark':
      return '请补充账单备注内容。';
    default:
      return '请补充更多信息。';
  }
}
