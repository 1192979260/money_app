import { defineStore } from 'pinia';
import { confirmDraft, patchDraft, sendMessage, startConversation, transcribeVoice } from '@/services/chat';
import type { ChatMessage } from '@/types/api';

interface ChatState {
  draftId: string;
  status: 'DRAFT' | 'COLLECTING' | 'CONFIRMING' | 'CONFIRMED';
  missingSlots: string[];
  slotValues: Record<string, unknown>;
  messages: ChatMessage[];
  lastRawText: string;
}

const initialSnapshot = {
  draftId: '',
  status: 'DRAFT' as const,
  missingSlots: [] as string[],
  slotValues: {} as Record<string, unknown>,
  messages: [] as ChatMessage[],
  lastRawText: ''
};

function createMsg(role: 'user' | 'assistant', text: string): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    text
  };
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    draftId: uni.getStorageSync('draftId') || initialSnapshot.draftId,
    status: initialSnapshot.status,
    missingSlots: initialSnapshot.missingSlots,
    slotValues: initialSnapshot.slotValues,
    messages: uni.getStorageSync('messages') || initialSnapshot.messages,
    lastRawText: initialSnapshot.lastRawText
  }),
  actions: {
    persist() {
      uni.setStorageSync('draftId', this.draftId);
      uni.setStorageSync('messages', this.messages);
      uni.setStorageSync('chatSnapshot', {
        draftId: this.draftId,
        status: this.status,
        missingSlots: this.missingSlots,
        slotValues: this.slotValues
      });
    },

    async onVoice(audioBase64: string) {
      const res = await transcribeVoice(audioBase64);
      this.lastRawText = res.transcribedText || '';
      return this.lastRawText;
    },

    async quickStartConversation() {
      this.clearConversation();
      const res = await startConversation();
      this.draftId = res.draftId;
      this.status = res.status;
      this.missingSlots = res.missingSlots;
      this.slotValues = res.slotValues || {};
      if (res.assistantReply) {
        this.messages.push(createMsg('assistant', res.assistantReply));
      }
      this.persist();
      return res;
    },

    async onText(message: string) {
      this.messages.push(createMsg('user', message));
      const res = await sendMessage(this.draftId, message);
      this.draftId = res.draftId;
      this.status = res.status;
      this.missingSlots = res.missingSlots;
      this.slotValues = res.slotValues || this.slotValues;
      this.messages.push(createMsg('assistant', res.assistantReply));
      this.persist();
      return res;
    },

    async quickPatch(payload: Record<string, unknown>, userMessage?: string) {
      if (userMessage) {
        this.messages.push(createMsg('user', userMessage));
      }
      const res = await patchDraft(this.draftId, payload);
      this.status = res.status;
      this.missingSlots = res.missingSlots;
      this.slotValues = res.slotValues || this.slotValues;
      this.messages.push(createMsg('assistant', res.assistantReply));
      this.persist();
    },

    async confirm() {
      const mergedText = this.messages
        .filter((m) => m.role === 'user')
        .map((m) => m.text)
        .join('；');
      const conversationHistory = this.messages.map((item) => ({ role: item.role, text: item.text }));
      await confirmDraft(
        this.draftId,
        mergedText || this.lastRawText,
        this.lastRawText ? 'voice' : 'text',
        conversationHistory
      );
      this.clearConversation();
    },

    clearConversation() {
      this.draftId = initialSnapshot.draftId;
      this.status = initialSnapshot.status;
      this.missingSlots = [];
      this.slotValues = {};
      this.messages = [];
      this.lastRawText = initialSnapshot.lastRawText;
      uni.removeStorageSync('draftId');
      uni.removeStorageSync('messages');
      uni.removeStorageSync('chatSnapshot');
    }
  }
});
