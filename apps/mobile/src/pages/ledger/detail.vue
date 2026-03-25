<template>
  <view class="page">
    <scroll-view class="page-scroll" scroll-y>
      <view class="head glass-card">
        <view class="head-top">
          <text class="title">账单详情</text>
          <button class="delete-btn" @click="onDelete">删除</button>
        </view>
        <text class="desc" v-if="entry">{{ formatDate(String(entry.occurredAt)) }} · {{ entry.amount }} 元</text>
      </view>

      <view v-if="entry" class="meta glass-card">
        <view class="line">分类：{{ typeText(String(entry.majorType)) }}</view>
        <view v-if="String(entry.majorType) === 'income'" class="line">来源：{{ normalizeIncomeSource(entry.reason) }}</view>
        <view v-else class="line">归属对象：{{ usageText(String(entry.usageType)) }}</view>
        <view class="line">平台：{{ (entry.platformTags || []).join(' / ') || '未填' }}</view>
        <view v-if="String(entry.majorType) !== 'income'" class="line">用途：{{ entry.reason }}</view>
        <view class="line">备注：{{ entry.note || '无' }}</view>
      </view>

      <view class="history glass-card">
        <text class="history-title">本次对话历史</text>
        <view v-if="history.length" class="history-list">
          <view
            v-for="(item, idx) in history"
            :key="`h-${idx}`"
            :class="['bubble-row', item.role === 'user' ? 'user' : 'assistant']"
          >
            <view :class="['bubble', item.role === 'user' ? 'bubble-user' : 'bubble-assistant']">
              <text class="bubble-text">{{ item.text }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty">暂无对话历史</view>
      </view>
      <view class="scroll-tail" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { deleteLedgerEntry, fetchLedgerDetail } from '@/services/ledger';
import type { LedgerConversationMessage, LedgerEntry } from '@/types/api';
import { useUserStore } from '@/store/user';

const user = useUserStore();
const entry = ref<LedgerEntry | null>(null);
const history = computed(() => (entry.value?.conversationHistory || []) as LedgerConversationMessage[]);
const entryId = ref('');

onLoad(async (query) => {
  const id = String(query?.id || '');
  if (!id) {
    uni.showToast({ title: '缺少账单ID', icon: 'none' });
    return;
  }

  await user.ensureLogin();
  entryId.value = id;
  entry.value = await fetchLedgerDetail(id);
});

async function onDelete() {
  if (!entryId.value) return;
  const result = await new Promise<UniApp.ShowModalRes>((resolve) => {
    uni.showModal({
      title: '删除账单',
      content: '确认删除这条账单吗？删除后不可恢复。',
      confirmText: '删除',
      cancelText: '取消',
      success: (res) => resolve(res)
    });
  });
  if (!result.confirm) return;
  await deleteLedgerEntry(entryId.value);
  uni.showToast({ title: '已删除', icon: 'success' });
  setTimeout(() => {
    uni.navigateBack();
  }, 280);
}

function typeText(type: string) {
  if (type === 'fixed') return '固定支出';
  if (type === 'extra') return '额外支出';
  if (type === 'income') return '收入';
  return type;
}

function usageText(type: string) {
  if (type === 'family') return '家庭';
  if (type === 'self') return '老婆';
  if (type === 'child') return '孩子';
  if (type === 'husband') return '老公';
  if (type === 'other') return '其他';
  return type;
}

function normalizeIncomeSource(reason: string | undefined) {
  const source = String(reason || '').trim();
  if (source === '老公') return '老公';
  if (source === '老婆' || source === '本人') return '老婆';
  return '其他';
}

function formatDate(iso: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}
</script>

<style scoped>
.page {
  height: 100vh;
  background: var(--bg-base);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-scroll {
  flex: 1;
  min-height: 0;
  padding: 20rpx 20rpx calc(env(safe-area-inset-bottom) + 24rpx);
  background: var(--bg-base);
  box-sizing: border-box;
}

.head,
.meta,
.history {
  padding: 20rpx;
  margin-bottom: 14rpx;
}

.head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.title {
  font-family: var(--title-font);
  font-size: 40rpx;
  font-weight: 700;
}

.delete-btn {
  height: 56rpx;
  line-height: 56rpx;
  border: 1px solid var(--border-soft);
  border-radius: 999rpx;
  background: linear-gradient(130deg, #c85b5b, #ad4141);
  color: #fff4ea;
  padding: 0 20rpx;
  font-size: 22rpx;
}

.desc {
  margin-top: 8rpx;
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary);
}

.history-title {
  font-family: var(--title-font);
  font-size: 32rpx;
  font-weight: 600;
  display: block;
  margin-bottom: 14rpx;
}

.line {
  margin-bottom: 8rpx;
  color: var(--text-primary);
  word-break: break-all;
}

.bubble-row {
  display: flex;
  margin-bottom: 12rpx;
}

.bubble-row.user {
  justify-content: flex-end;
}

.bubble-row.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 86%;
  border-radius: 26rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
}

.bubble-text {
  line-height: 1.5;
  word-break: break-all;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.bubble-user {
  background: var(--bubble-user);
  border-top-right-radius: 10rpx;
  color: #2a1902;
  border: 1px solid rgba(150, 111, 40, 0.34);
}

.bubble-assistant {
  background: var(--bubble-bot);
  border-top-left-radius: 10rpx;
  border: 1px solid var(--border-soft);
}

.empty {
  color: var(--text-secondary);
}

.scroll-tail {
  height: calc(env(safe-area-inset-bottom) + 160rpx);
}
</style>
