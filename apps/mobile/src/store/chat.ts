import { defineStore } from 'pinia';
import { confirmDraft, patchDraft, sendMessage, sendMessageStream, startConversation } from '@/services/chat';
import type { ChatMessage } from '@/types/api';

interface ChatState {
  draftId: string;
  status: 'DRAFT' | 'COLLECTING' | 'CONFIRMING' | 'CONFIRMED';
  missingSlots: string[];
  slotValues: Record<string, unknown>;
  messages: ChatMessage[];
  lastRawText: string;
  isStreaming: boolean;
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
    lastRawText: initialSnapshot.lastRawText,
    isStreaming: false
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
      if (!this.draftId) {
        this.isStreaming = true;
        const assistantId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        this.messages.push({
          id: assistantId,
          role: 'assistant',
          text: ''
        });
        try {
          const res = await sendMessageStream(message, (delta) => {
            const target = this.messages.find((m) => m.id === assistantId);
            if (!target) return;
            target.text += delta;
            this.persist();
          });
          if (res) {
            this.draftId = res.draftId || '';
            this.status = res.status || 'DRAFT';
            this.missingSlots = res.missingSlots || [];
            this.slotValues = res.slotValues || this.slotValues;
            const target = this.messages.find((m) => m.id === assistantId);
            if (target && !target.text && res.assistantReply) {
              target.text = res.assistantReply;
            }
            if (res.switchedToLedger) {
              uni.showToast({ title: '已切换到记账流程', icon: 'none' });
            }
          }
          this.persist();
          return res;
        } catch (_error) {
          const fallback = await sendMessage(undefined, message);
          const target = this.messages.find((m) => m.id === assistantId);
          if (target) {
            target.text = fallback.assistantReply;
          }
          this.draftId = fallback.draftId || '';
          this.status = fallback.status || 'DRAFT';
          this.missingSlots = fallback.missingSlots || [];
          this.slotValues = fallback.slotValues || this.slotValues;
          if (fallback.switchedToLedger) {
            uni.showToast({ title: '已切换到记账流程', icon: 'none' });
          }
          this.persist();
          return fallback;
        } finally {
          this.isStreaming = false;
        }
      }

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
      this.isStreaming = false;
      uni.removeStorageSync('draftId');
      uni.removeStorageSync('messages');
      uni.removeStorageSync('chatSnapshot');
    }
  }
});
