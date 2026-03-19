export interface AuthResult {
  token: string;
  user: {
    id: string;
    displayName?: string;
    loginType: 'wechat' | 'guest';
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export interface DraftResponse {
  transcribedText?: string;
  draftId: string;
  status: 'DRAFT' | 'COLLECTING' | 'CONFIRMING' | 'CONFIRMED';
  missingSlots: string[];
  slotValues: Record<string, unknown>;
  assistantReply: string;
}

export interface TranscribeResponse {
  transcribedText: string;
}

export interface LedgerConversationMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface LedgerEntry {
  id: string;
  amount: number;
  majorType: 'fixed' | 'extra' | 'income';
  platformTags: string[];
  usageType: 'family' | 'self' | 'child' | 'husband' | 'other';
  reason: string;
  note?: string;
  occurredAt: string;
  createdAt: string;
  conversationHistory?: LedgerConversationMessage[];
}
