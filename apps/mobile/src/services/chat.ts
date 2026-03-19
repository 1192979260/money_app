import type { DraftResponse, TranscribeResponse } from '@/types/api';
import { apiRequest } from './http';

export async function transcribeVoice(audioBase64: string, noisy = false) {
  return apiRequest<TranscribeResponse>('/chat-ledger/transcribe', 'POST', { audioBase64, noisy });
}

export async function startConversation() {
  return apiRequest<DraftResponse>('/chat-ledger/start', 'POST', {});
}

export async function sendMessage(draftId: string | undefined, message: string) {
  return apiRequest<DraftResponse>('/chat-ledger/message', 'POST', {
    message,
    ...(draftId ? { draftId } : {})
  });
}

export async function patchDraft(draftId: string, payload: Record<string, unknown>) {
  return apiRequest<DraftResponse>('/chat-ledger/patch', 'POST', { draftId, ...payload });
}

export async function confirmDraft(
  draftId: string,
  rawText: string,
  source: 'voice' | 'text',
  conversationHistory?: Array<{ role: 'user' | 'assistant'; text: string }>
) {
  return apiRequest<{ entryId: string; status: 'CONFIRMED' }>('/chat-ledger/confirm', 'POST', {
    draftId,
    rawText,
    source,
    ...(conversationHistory?.length ? { conversationHistory } : {})
  });
}
