<template>
  <view class="page">
    <view class="head glass-card">
      <text class="title">AI 消费建议</text>
      <text class="desc">把周期账单交给模型，生成优化建议</text>
    </view>

    <view class="header glass-card">
      <picker mode="selector" :range="periodTypeOptions" @change="onTypeChange">
        <view class="pick">周期：{{ periodLabel }}</view>
      </picker>
      <picker mode="selector" :range="periodKeyOptions" @change="onPeriodKeyChange">
        <view class="pick">日期：{{ periodKeyLabel }}</view>
      </picker>
      <button :class="['btn', 'flat-btn', loading ? 'is-loading' : '']" :disabled="loading" @click="run">
        <view v-if="loading" class="btn-loading">
          <text class="btn-dot">◆</text>
          <text class="btn-text">正在生成建议</text>
        </view>
        <text v-else>生成建议</text>
      </button>
    </view>

    <view :class="['result', 'glass-card', loading ? 'is-busy' : '']">
      <text class="label">建议内容</text>
      <scroll-view class="result-scroll" scroll-y :scroll-into-view="scrollToId" scroll-with-animation>
        <view v-if="loading" class="loading-panel">
          <view class="shimmer-line l1" />
          <view class="shimmer-line l2" />
          <view class="shimmer-line l3" />
          <view class="shimmer-line l4" />
          <view class="shimmer-line l5" />
        </view>
        <text v-else class="text">{{ adviceText || '点击“生成建议”后展示内容' }}</text>
        <view id="advice-tail" class="scroll-tail" />
      </scroll-view>
    </view>

    <AppTabBar current="advice" />
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import AppTabBar from '@/components/AppTabBar.vue';
import { generateAdvice } from '@/services/advice';
import { useUserStore } from '@/store/user';

const user = useUserStore();
const periodTypeOptions = ['月度', '年度'];
const periodType = ref<'month' | 'year'>('month');
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const yearOptions = Array.from({ length: currentYear - 2026 + 1 }, (_, i) => String(currentYear - i));
const monthKeyOptions = yearOptions.flatMap((year) =>
  Array.from({ length: 12 }, (_, idx) => `${year}-${String(idx + 1).padStart(2, '0')}`)
);
const periodKey = ref(`${currentYear}-${String(currentMonth).padStart(2, '0')}`);
const adviceText = ref('');
const loading = ref(false);
const scrollToId = ref('');
const periodLabel = computed(() => (periodType.value === 'month' ? '月度' : '年度'));
const periodKeyOptions = computed(() => (periodType.value === 'month' ? monthKeyOptions : yearOptions));
const periodKeyLabel = computed(() => {
  if (periodType.value === 'year') {
    return `${periodKey.value}年`;
  }
  const [y, m] = periodKey.value.split('-');
  return `${y}年${Number(m)}月`;
});

function onTypeChange(e: { detail: { value: string } }) {
  const idx = Number(e.detail.value);
  periodType.value = idx === 0 ? 'month' : 'year';
  periodKey.value =
    periodType.value === 'month' ? `${currentYear}-${String(currentMonth).padStart(2, '0')}` : String(currentYear);
}

function onPeriodKeyChange(e: { detail: { value: string } }) {
  const idx = Number(e.detail.value);
  periodKey.value = periodKeyOptions.value[idx] || periodKey.value;
}

async function run() {
  if (loading.value) return;
  loading.value = true;
  try {
    await user.ensureLogin();
    const res = await generateAdvice(periodType.value, periodKey.value);
    adviceText.value = res.adviceText;
    await nextTick();
    scrollToId.value = 'advice-tail';
    setTimeout(() => {
      scrollToId.value = '';
    }, 220);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page {
  height: 100vh;
  padding: 20rpx 20rpx calc(env(safe-area-inset-bottom) + 128rpx);
  background: var(--bg-base);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  overflow: hidden;
}

.head {
  padding: 20rpx;
}

.title {
  font-family: var(--title-font);
  font-size: 40rpx;
  font-weight: 700;
}

.desc {
  margin-top: 8rpx;
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary);
}

.header {
  padding: 18rpx;
  display: grid;
  gap: 12rpx;
}

.pick {
  min-height: 72rpx;
  display: flex;
  align-items: center;
  padding: 0 16rpx;
  border-radius: 16rpx;
  background: linear-gradient(145deg, var(--bg-elevated), rgba(255, 255, 255, 0.02));
  border: 1px solid var(--border-soft);
}

.btn {
  border-radius: 16rpx;
  height: 78rpx;
  line-height: 78rpx;
  border: 1px solid var(--border-strong);
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: -140%;
  left: -30%;
  width: 28%;
  height: 380%;
  transform: rotate(20deg);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.38), transparent);
  opacity: 0;
}

.btn.is-loading::before {
  opacity: 1;
  animation: btn-shine 1.6s ease-in-out infinite;
}

.btn[disabled] {
  opacity: 0.96;
}

.btn-loading {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}

.btn-dot {
  font-size: 20rpx;
  color: #fff3d9;
  animation: spin-diamond 1.1s linear infinite;
}

.btn-text {
  color: #fff6e2;
}

.result {
  flex: 1;
  min-height: 0;
  padding: 20rpx;
  background: linear-gradient(145deg, var(--bg-surface), rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border-soft);
  display: flex;
  flex-direction: column;
}

.result.is-busy {
  box-shadow: 0 0 0 1px rgba(216, 170, 84, 0.35), var(--shadow-soft);
}

.label {
  font-family: var(--title-font);
  font-weight: 600;
  margin-bottom: 10rpx;
  display: block;
  font-size: 32rpx;
}

.text {
  display: block;
  line-height: 1.8;
  color: var(--text-primary);
  word-break: break-all;
  white-space: pre-wrap;
}

.result-scroll {
  flex: 1;
  min-height: 0;
  padding-bottom: 0;
}

.scroll-tail {
  height: calc(env(safe-area-inset-bottom) + 220rpx);
}

.loading-panel {
  display: grid;
  gap: 16rpx;
  padding-top: 6rpx;
}

.shimmer-line {
  position: relative;
  height: 28rpx;
  border-radius: 999rpx;
  background: rgba(216, 170, 84, 0.2);
  overflow: hidden;
}

.shimmer-line::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.42), transparent);
  animation: shimmer-move 1.35s ease-in-out infinite;
}

.shimmer-line.l1 {
  width: 94%;
}

.shimmer-line.l2 {
  width: 88%;
}

.shimmer-line.l3 {
  width: 96%;
}

.shimmer-line.l4 {
  width: 84%;
}

.shimmer-line.l5 {
  width: 76%;
}

@keyframes shimmer-move {
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(130%);
  }
}

@keyframes btn-shine {
  0% {
    left: -36%;
  }
  100% {
    left: 132%;
  }
}

@keyframes spin-diamond {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (hover: hover) {
  .btn:hover {
    transform: translateY(-2rpx);
  }
}
</style>
