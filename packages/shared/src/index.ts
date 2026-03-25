export type MajorType = 'fixed' | 'extra' | 'income';

export type UsageType = 'family' | 'self' | 'child' | 'husband' | 'other';

export type EntrySource = 'voice' | 'text';
export type ExpenseNature = 'essential' | 'optional' | 'one_off';

export type ConversationStatus = 'DRAFT' | 'COLLECTING' | 'CONFIRMING' | 'CONFIRMED';

export type SlotName =
  | 'amount'
  | 'majorType'
  | 'platformTags'
  | 'usageType'
  | 'reason'
  | 'occurredAt'
  | 'needRemark'
  | 'remark';

export interface SlotValues {
  amount?: number;
  majorType?: MajorType;
  platformTags?: string[];
  usageType?: UsageType;
  reason?: string;
  occurredAt?: string;
  needRemark?: boolean;
  remark?: string;
}

export interface ConversationDraftDTO {
  id: string;
  userId: string;
  missingSlots: SlotName[];
  slotValues: SlotValues;
  jsonContext: string;
  lastQuestion?: string;
  status: ConversationStatus;
}

export interface LedgerEntryDTO {
  id: string;
  userId: string;
  amount: number;
  currency: 'CNY';
  majorType: MajorType;
  expenseNature?: ExpenseNature;
  platformTags: string[];
  usageType: UsageType;
  reason: string;
  occurredAt: string;
  note?: string;
  source: EntrySource;
  rawText: string;
  status: 'CONFIRMED';
  createdAt: string;
}

export interface AdviceReportDTO {
  id: string;
  userId: string;
  periodType: 'month' | 'year';
  periodKey: string;
  inputSnapshot: string;
  adviceText: string;
  createdAt: string;
}

export const DEFAULT_PLATFORM_TAGS = ['现金', '京东', '淘宝', '抖音', '饿了么', '叮咚买菜'] as const;
export const DEFAULT_USAGE_TYPES = ['家庭', '老婆', '孩子', '老公', '其他'] as const;
