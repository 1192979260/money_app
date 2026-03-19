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
      <button class="btn flat-btn" @click="run">生成建议</button>
    </view>

    <view class="result glass-card">
      <text class="label">建议内容</text>
      <text class="text">{{ adviceText || '点击“生成建议”后展示内容' }}</text>
    </view>

    <AppTabBar current="advice" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
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
  await user.ensureLogin();
  const res = await generateAdvice(periodType.value, periodKey.value);
  adviceText.value = res.adviceText;
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 20rpx 20rpx 190rpx;
  background: var(--bg-base);
  box-sizing: border-box;
}

.head {
  padding: 20rpx;
  margin-bottom: 14rpx;
}

.title {
  font-size: 34rpx;
  font-weight: 800;
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
  margin-bottom: 14rpx;
}

.pick {
  min-height: 72rpx;
  display: flex;
  align-items: center;
  padding: 0 16rpx;
  border-radius: 16rpx;
  background: #f7f9ff;
  border: 2rpx solid #e8eeff;
}

.btn {
  border-radius: 16rpx;
  height: 78rpx;
  line-height: 78rpx;
}

.result {
  padding: 20rpx;
  background: #f7fff6;
}

.label {
  font-weight: 700;
  margin-bottom: 10rpx;
  display: block;
}

.text {
  line-height: 1.8;
  color: var(--text-primary);
  word-break: break-all;
}
</style>
