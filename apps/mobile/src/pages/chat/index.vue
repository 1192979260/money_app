<template>
  <view class="page">
    <view class="header glass-card">
      <view class="header-top">
        <text class="title">语音速记账</text>
        <button class="start-btn" @click="onStartConversation">新建账单</button>
      </view>
      <text class="subtitle">像聊天一样记账，信息补齐后再入库</text>
    </view>

    <scroll-view
      class="chat-list glass-card"
      scroll-y
      :scroll-into-view="scrollIntoViewId"
      scroll-with-animation
      :style="{ paddingBottom: chatListPaddingBottom }"
    >
      <view v-for="item in chat.messages" :id="`msg-${item.id}`" :key="item.id">
        <ChatBubble :role="item.role" :text="item.text" />
      </view>
      <view v-if="!chat.messages.length" class="empty">按住说话，开始第一笔语音记账</view>
    </scroll-view>

    <view class="input-area glass-card">
      <view class="entry-row" v-if="!voiceMode">
        <button class="mode-btn" @click="voiceMode = true">🎤</button>
        <view class="input-shell">
          <input v-model="text" class="text-input" placeholder="输入补充信息，例如：今天午饭 28 元" />
        </view>
        <button class="send-btn" @click="onSend" aria-label="发送">
          <text class="send-icon">➤</text>
        </button>
      </view>

      <view class="entry-row" v-else>
        <button class="mode-btn" @click="voiceMode = false">⌨️</button>
        <VoiceButton block @recorded="onVoice" />
      </view>

      <view
        v-if="showSlotTags"
        class="slot-tag-panel glass-card"
      >
        <text class="slot-title">{{ slotTitle }}</text>
        <view v-if="showOccurredDatePicker" class="date-picker-panel">
          <picker mode="selector" :range="occurredYearOptions" @change="onOccurredYearChange">
            <view class="date-pick">年：{{ occurredYear }}年</view>
          </picker>
          <picker mode="selector" :range="occurredMonthOptions" @change="onOccurredMonthChange">
            <view class="date-pick">月：{{ occurredMonth }}月</view>
          </picker>
          <picker mode="selector" :range="occurredDayOptions" @change="onOccurredDayChange">
            <view class="date-pick">日：{{ occurredDay }}日</view>
          </picker>
          <button class="date-confirm-btn" @click="onConfirmOccurredAt">确认日期</button>
        </view>
        <view v-else class="slot-tags">
          <button
            v-for="item in slotOptions"
            :key="item.value"
            class="slot-tag"
            :class="{ active: isSlotOptionActive(item.value) }"
            @click="onChooseSlotOption(item.value, item.label)"
          >
            {{ item.label }}
          </button>
        </view>
      </view>
    </view>

    <view v-if="showRemarkChoice" class="modal-mask">
      <view class="modal-card glass-card">
        <text class="modal-title">是否需要记录账单备注？</text>
        <view class="modal-actions">
          <button class="modal-btn secondary" @click="onChooseRemark(false)">不需要</button>
          <button class="modal-btn primary" @click="onChooseRemark(true)">需要</button>
        </view>
      </view>
    </view>

    <view v-if="showConfirmModal" class="modal-mask">
      <view class="modal-card glass-card">
        <text class="modal-title">请确认本次账单</text>
        <text class="modal-desc">{{ confirmSummary }}</text>
        <view class="modal-actions">
          <button class="modal-btn secondary" @click="closeConfirmModal">再看看</button>
          <button class="modal-btn primary" @click="onConfirm">确认入账</button>
        </view>
      </view>
    </view>

    <AppTabBar current="chat" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from 'vue';
import AppTabBar from '@/components/AppTabBar.vue';
import ChatBubble from '@/components/ChatBubble.vue';
import VoiceButton from '@/components/VoiceButton.vue';
import { useChatStore } from '@/store/chat';
import { useUserStore } from '@/store/user';

const text = ref('');
const voiceMode = ref(false);
const scrollIntoViewId = ref('');
const confirmModalVisible = ref(false);
const selectedPlatform = ref('');
const forceRemarkChoice = ref(false);
const occurredYear = ref(new Date().getFullYear());
const occurredMonth = ref(new Date().getMonth() + 1);
const occurredDay = ref(new Date().getDate());
const chat = useChatStore();
const user = useUserStore();

const currentSlot = computed(() => chat.missingSlots[0] || '');
const showRemarkChoice = computed(
  () => chat.status !== 'CONFIRMED' && (currentSlot.value === 'needRemark' || forceRemarkChoice.value)
);
const showSlotTags = computed(
  () => chat.status !== 'CONFIRMED' && !!currentSlot.value && currentSlot.value !== 'remark' && currentSlot.value !== 'needRemark'
);
const showOccurredDatePicker = computed(() => currentSlot.value === 'occurredAt');
const showConfirmModal = computed(() => chat.status === 'CONFIRMING' && confirmModalVisible.value);
const chatListPaddingBottom = computed(() => (showSlotTags.value ? '440rpx' : '300rpx'));
const confirmSummary = computed(() => {
  const lastAssistant = [...chat.messages].reverse().find((item) => item.role === 'assistant');
  return lastAssistant?.text || '请确认后入账。';
});

const slotTitleMap: Record<string, string> = {
  amount: '选择金额',
  majorType: '选择分类',
  platformTags: '选择平台',
  usageType: '选择归属对象',
  occurredAt: '选择时间'
};

const slotOptionsMap: Record<string, Array<{ label: string; value: string }>> = {
  amount: [
    { label: '10元', value: '10' },
    { label: '20元', value: '20' },
    { label: '30元', value: '30' },
    { label: '50元', value: '50' },
    { label: '100元', value: '100' }
  ],
  majorType: [
    { label: '固定支出', value: 'fixed' },
    { label: '额外支出', value: 'extra' },
    { label: '收入', value: 'income' }
  ],
  platformTags: [
    { label: '现金', value: '现金' },
    { label: '京东', value: '京东' },
    { label: '淘宝', value: '淘宝' },
    { label: '抖音', value: '抖音' },
    { label: '饿了么', value: '饿了么' },
    { label: '叮咚买菜', value: '叮咚买菜' }
  ],
  usageType: [
    { label: '家庭', value: 'family' },
    { label: '老婆', value: 'self' },
    { label: '孩子', value: 'child' },
    { label: '老公', value: 'husband' },
    { label: '其他', value: 'other' }
  ],
  reason: [],
  occurredAt: []
};

const expenseReasonOptions = [
  { label: '餐饮', value: '餐饮消费' },
  { label: '日用品', value: '日用品采购' },
  { label: '教育', value: '教育支出' },
  { label: '交通', value: '交通出行' },
  { label: '娱乐', value: '休闲娱乐' },
  { label: '购物', value: '电商购物' }
];
const incomeReasonOptions = [
  { label: '老公', value: '老公' },
  { label: '老婆', value: '老婆' },
  { label: '其他', value: '其他' }
];
const currentMajorType = computed(() => String(chat.slotValues?.majorType || ''));
const slotTitle = computed(() => {
  if (currentSlot.value === 'reason') {
    return currentMajorType.value === 'income' ? '选择收入来源' : '选择用途';
  }
  return slotTitleMap[currentSlot.value] || '快速选择';
});
const slotOptions = computed(() => {
  if (currentSlot.value === 'reason') {
    return currentMajorType.value === 'income' ? incomeReasonOptions : expenseReasonOptions;
  }
  return slotOptionsMap[currentSlot.value] || [];
});
const occurredYearOptions = computed(() => {
  const currentYear = new Date().getFullYear();
  const options: number[] = [];
  for (let y = currentYear; y >= 2026; y -= 1) {
    options.push(y);
  }
  return options;
});
const occurredMonthOptions = computed(() => {
  const now = new Date();
  const maxMonth = occurredYear.value === now.getFullYear() ? now.getMonth() + 1 : 12;
  return Array.from({ length: maxMonth }, (_, i) => i + 1);
});
const occurredDayOptions = computed(() => {
  const maxDay = getMaxSelectableDay(occurredYear.value, occurredMonth.value);
  return Array.from({ length: maxDay }, (_, i) => i + 1);
});

onMounted(async () => {
  await user.ensureLogin();
});

watch(
  () => chat.messages.length,
  async () => {
    await nextTick();
    const last = chat.messages[chat.messages.length - 1];
    scrollIntoViewId.value = last ? `msg-${last.id}` : '';
  },
  { immediate: true }
);

watch(
  () => chat.status,
  (status) => {
    if (status === 'CONFIRMING') {
      confirmModalVisible.value = true;
      return;
    }
    confirmModalVisible.value = false;
  },
  { immediate: true }
);

watch(
  () => currentSlot.value,
  (slot) => {
    if (slot !== 'platformTags') {
      selectedPlatform.value = '';
    }
    if (slot === 'occurredAt') {
      setOccurredDateToToday();
    }
  }
);

async function onVoice(base64: string) {
  uni.showLoading({ title: '转写中...' });
  try {
    const transcribedText = (await chat.onVoice(base64))?.trim();
    if (!transcribedText) {
      uni.showToast({ title: '未识别到语音内容', icon: 'none' });
      return;
    }
    await chat.onText(transcribedText);
  } finally {
    uni.hideLoading();
  }
}

async function onSend() {
  if (!text.value.trim()) return;
  const message = text.value;
  text.value = '';
  await chat.onText(message);
}

async function onChooseRemark(needRemark: boolean) {
  forceRemarkChoice.value = false;
  if (needRemark) {
    await chat.quickPatch({ needRemark: true, remark: '' }, '需要备注');
    confirmModalVisible.value = chat.status === 'CONFIRMING';
    return;
  }
  await chat.quickPatch({ needRemark: false, remark: '' }, '不需要备注');
  confirmModalVisible.value = chat.status === 'CONFIRMING';
}

async function onConfirm() {
  await chat.confirm();
  text.value = '';
  confirmModalVisible.value = false;
  uni.showToast({ title: '已入账', icon: 'success' });
}

async function onStartConversation() {
  await user.ensureLogin();
  forceRemarkChoice.value = false;
  await chat.quickStartConversation();
}

function isSlotOptionActive(value: string) {
  return currentSlot.value === 'platformTags' && selectedPlatform.value === value;
}

async function onChooseSlotOption(value: string, label: string) {
  if (currentSlot.value === 'amount') {
    await chat.quickPatch({ amount: Number(value) }, `${label}`);
    return;
  }
  if (currentSlot.value === 'majorType') {
    await chat.quickPatch({ majorType: value }, label);
    return;
  }
  if (currentSlot.value === 'platformTags') {
    selectedPlatform.value = value;
    await chat.quickPatch({ platformTags: [value] }, `平台：${label}`);
    return;
  }
  if (currentSlot.value === 'usageType') {
    await chat.quickPatch({ usageType: value }, label);
    return;
  }
  if (currentSlot.value === 'reason') {
    await chat.quickPatch({ reason: value }, label);
    return;
  }
}

function closeConfirmModal() {
  confirmModalVisible.value = false;
  forceRemarkChoice.value = true;
}

function setOccurredDateToToday() {
  const now = new Date();
  occurredYear.value = now.getFullYear();
  occurredMonth.value = now.getMonth() + 1;
  occurredDay.value = now.getDate();
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getMaxSelectableDay(year: number, month: number) {
  const now = new Date();
  if (year === now.getFullYear() && month === now.getMonth() + 1) {
    return now.getDate();
  }
  return getDaysInMonth(year, month);
}

function clampOccurredDate() {
  const maxMonth = occurredMonthOptions.value[occurredMonthOptions.value.length - 1] || 1;
  if (occurredMonth.value > maxMonth) {
    occurredMonth.value = maxMonth;
  }

  const maxDay = getMaxSelectableDay(occurredYear.value, occurredMonth.value);
  if (occurredDay.value > maxDay) {
    occurredDay.value = maxDay;
  }
}

function onOccurredYearChange(e: { detail: { value: string } }) {
  const index = Number(e.detail.value);
  const selected = occurredYearOptions.value[index];
  if (!selected) return;
  occurredYear.value = selected;
  clampOccurredDate();
}

function onOccurredMonthChange(e: { detail: { value: string } }) {
  const index = Number(e.detail.value);
  const selected = occurredMonthOptions.value[index];
  if (!selected) return;
  occurredMonth.value = selected;
  clampOccurredDate();
}

function onOccurredDayChange(e: { detail: { value: string } }) {
  const index = Number(e.detail.value);
  const selected = occurredDayOptions.value[index];
  if (!selected) return;
  occurredDay.value = selected;
}

async function onConfirmOccurredAt() {
  const selectedDate = new Date(occurredYear.value, occurredMonth.value - 1, occurredDay.value, 12, 0, 0);
  const now = new Date();
  const minDate = new Date(2026, 0, 1, 0, 0, 0);
  const selectedDateOnly = new Date(occurredYear.value, occurredMonth.value - 1, occurredDay.value, 0, 0, 0, 0);
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  if (selectedDate < minDate || selectedDateOnly > todayOnly) {
    uni.showToast({ title: '日期超出可选范围', icon: 'none' });
    return;
  }
  const label = `${occurredYear.value}-${String(occurredMonth.value).padStart(2, '0')}-${String(occurredDay.value).padStart(2, '0')}`;
  await chat.quickPatch({ occurredAt: selectedDate.toISOString() }, label);
}
</script>

<style scoped>
.page {
  height: 100vh;
  padding: 20rpx 20rpx calc(env(safe-area-inset-bottom) + 24rpx);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16rpx;
  background: var(--bg-base);
  box-sizing: border-box;
  overflow: hidden;
  overscroll-behavior: none;
}

.header {
  padding: 20rpx;
  flex: 0 0 auto;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.title {
  font-family: var(--title-font);
  font-size: 42rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.subtitle {
  margin-top: 8rpx;
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary);
}

.start-btn {
  height: 58rpx;
  line-height: 58rpx;
  padding: 0 20rpx;
  border: 1px solid var(--border-strong);
  border-radius: 999rpx;
  background: linear-gradient(130deg, var(--accent), var(--accent-2));
  color: #fff5df;
  font-size: 22rpx;
  font-weight: 700;
  box-shadow: 0 8rpx 16rpx rgba(143, 101, 27, 0.28);
}

.chat-list {
  height: 100%;
  padding: 20rpx;
  padding-bottom: 300rpx;
  box-sizing: border-box;
  width: 100%;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chat-list::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

:deep(.uni-scroll-view::-webkit-scrollbar) {
  display: none;
  width: 0;
  height: 0;
}

:deep(.uni-scroll-view-scrollbar) {
  display: none !important;
}

.empty {
  margin-top: 45%;
  text-align: center;
  color: var(--text-secondary);
}

.input-area {
  position: fixed;
  left: 20rpx;
  right: 20rpx;
  bottom: calc(env(safe-area-inset-bottom) + 118rpx);
  padding: 14rpx;
  display: grid;
  gap: 10rpx;
  z-index: 260;
}

.entry-row {
  display: grid;
  grid-template-columns: 78rpx 1fr 78rpx;
  align-items: center;
  gap: 10rpx;
}

.mode-btn {
  width: 78rpx;
  height: 78rpx;
  line-height: 78rpx;
  border-radius: 999rpx;
  border: 1px solid var(--border-soft);
  background: linear-gradient(145deg, var(--bg-elevated), rgba(255, 255, 255, 0.02));
  color: var(--text-primary);
  font-size: 30rpx;
  padding: 0;
}

.input-shell {
  height: 78rpx;
  background: linear-gradient(145deg, var(--bg-elevated), rgba(255, 255, 255, 0.02));
  border: 1px solid var(--border-soft);
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  padding: 0 22rpx;
}

.text-input {
  width: 100%;
  height: 100%;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--body-font);
}

.send-btn {
  width: 78rpx;
  height: 78rpx;
  line-height: 78rpx;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  background: linear-gradient(130deg, var(--accent), var(--accent-2));
  color: #fff6e7;
  font-size: 30rpx;
  font-weight: 700;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 24rpx rgba(143, 101, 27, 0.34);
}

.send-icon {
  display: block;
  transform: translateX(2rpx);
  line-height: 1;
}

.slot-tag-panel {
  padding: 12rpx;
}

.slot-title {
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary);
  margin-bottom: 8rpx;
}

.slot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.date-picker-panel {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8rpx;
}

.date-pick {
  min-height: 58rpx;
  border: 1px solid var(--border-soft);
  border-radius: 16rpx;
  background: linear-gradient(145deg, var(--bg-elevated), rgba(255, 255, 255, 0.02));
  color: var(--text-primary);
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

.date-confirm-btn {
  grid-column: 1 / span 3;
  border: 1px solid var(--border-strong);
  border-radius: 16rpx;
  height: 58rpx;
  line-height: 58rpx;
  background: linear-gradient(130deg, var(--accent), var(--accent-2));
  color: #fff5df;
  font-size: 22rpx;
  font-weight: 700;
}

.slot-tag {
  border: 1px solid var(--border-soft);
  border-radius: 999rpx;
  background: linear-gradient(145deg, var(--bg-elevated), rgba(255, 255, 255, 0.02));
  color: var(--text-primary);
  font-size: 22rpx;
  padding: 0 18rpx;
  height: 58rpx;
  line-height: 58rpx;
}

.slot-tag.active {
  background: linear-gradient(145deg, rgba(215, 165, 69, 0.24), rgba(213, 161, 67, 0.4));
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(18, 14, 9, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  z-index: 400;
}

.modal-card {
  width: 100%;
  max-width: 620rpx;
  padding: 28rpx;
}

.modal-title {
  font-family: var(--title-font);
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.modal-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
  line-height: 1.6;
  word-break: break-all;
}

.modal-actions {
  margin-top: 20rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14rpx;
}

.modal-btn {
  border: 1px solid var(--border-strong);
  border-radius: 18rpx;
  color: #fff6e1;
  font-weight: 700;
}

.modal-btn.primary {
  background: linear-gradient(130deg, var(--accent), var(--accent-2));
}

.modal-btn.secondary {
  background: rgba(150, 140, 121, 0.52);
}

@media (hover: hover) {
  .start-btn:hover,
  .send-btn:hover,
  .date-confirm-btn:hover,
  .modal-btn.primary:hover {
    transform: translateY(-2rpx);
  }
}
</style>
