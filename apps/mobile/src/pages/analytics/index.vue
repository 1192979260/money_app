<template>
  <view class="page">
    <view class="head glass-card">
      <text class="title">收支分析</text>
      <text class="desc">快速查看月度与年度资金结构</text>
    </view>

    <view class="panel pastel-a glass-card">
      <text class="label">月度分析（{{ year }}年{{ month }}月）</text>
      <view class="grid2">
        <text class="value-link" @click="jumpLedger({ majorType: 'fixed' })">固定支出：{{ monthly.fixedExpense || 0 }}</text>
        <text class="value-link" @click="jumpLedger({ majorType: 'extra' })">额外支出：{{ monthly.extraExpense || 0 }}</text>
        <text class="value-link" @click="jumpLedger({ majorType: 'income' })">月收入：{{ monthly.totalIncome || 0 }}</text>
        <text class="value-link" @click="jumpLedger()">总支出：{{ monthly.totalExpense || 0 }}</text>
      </view>
    </view>

    <view class="panel pastel-b glass-card">
      <text class="label">年度分析（{{ year }}年）</text>
      <view class="grid2">
        <text class="value-link" @click="jumpLedger({ majorType: 'income', month: '' })">年收入：{{ yearly.yearIncome || 0 }}</text>
        <text class="value-link" @click="jumpLedger({ majorType: 'fixed', month: '' })">固定支出：{{ yearly.yearFixedExpense || 0 }}</text>
        <text class="value-link" @click="jumpLedger({ majorType: 'extra', month: '' })">额外支出：{{ yearly.yearExtraExpense || 0 }}</text>
        <text class="value-link" @click="jumpLedger({ month: '' })">收支结余：{{ yearly.balance || 0 }}</text>
      </view>
    </view>

    <view class="panel pastel-c glass-card">
      <text class="label">归属对象统计（点击查看账单）</text>
      <view class="grid2">
        <text class="value-link" @click="jumpLedger({ usageType: 'family' })">家庭：{{ monthlyUsage.family }}</text>
        <text class="value-link" @click="jumpLedger({ usageType: 'self' })">老婆：{{ monthlyUsage.self }}</text>
        <text class="value-link" @click="jumpLedger({ usageType: 'child' })">孩子：{{ monthlyUsage.child }}</text>
        <text class="value-link" @click="jumpLedger({ usageType: 'husband' })">老公：{{ monthlyUsage.husband }}</text>
        <text class="value-link" @click="jumpLedger({ usageType: 'other' })">其他：{{ monthlyUsage.other }}</text>
      </view>
    </view>

    <button class="refresh flat-btn" @click="load">刷新数据</button>

    <AppTabBar current="analytics" />
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppTabBar from '@/components/AppTabBar.vue';
import { fetchMonthly, fetchYearly } from '@/services/analytics';
import { useUserStore } from '@/store/user';

const user = useUserStore();
const now = new Date();
const year = ref(now.getFullYear());
const month = ref(now.getMonth() + 1);
const monthly = ref<Record<string, number>>({});
const yearly = ref<Record<string, number>>({});
const monthlyUsage = ref<Record<string, number>>({ family: 0, self: 0, child: 0, husband: 0, other: 0 });

async function load() {
  await user.ensureLogin();
  monthly.value = await fetchMonthly(year.value, month.value);
  yearly.value = await fetchYearly(year.value);
  monthlyUsage.value = monthly.value.usageStats || { family: 0, self: 0, child: 0, husband: 0, other: 0 };
  uni.setStorageSync('analyticsSnapshot', { monthly: monthly.value, yearly: yearly.value });
}

function jumpLedger(extra?: { majorType?: string; usageType?: string; month?: string }) {
  const q = new URLSearchParams();
  q.set('year', String(year.value));
  q.set('month', extra?.month === '' ? '' : String(month.value));
  if (extra?.majorType) q.set('majorType', extra.majorType);
  if (extra?.usageType) q.set('usageType', extra.usageType);
  const query = q
    .toString()
    .split('&')
    .filter((item) => !item.endsWith('='))
    .join('&');
  uni.switchTab({
    url: '/pages/ledger/index',
    fail: () => {
      uni.navigateTo({ url: `/pages/ledger/index${query ? `?${query}` : ''}` });
    }
  });
  uni.setStorageSync('ledgerPrefillQuery', { year: String(year.value), month: extra?.month === '' ? '' : String(month.value), ...extra });
}

onMounted(load);
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

.panel {
  margin-bottom: 14rpx;
  padding: 20rpx;
  border: 1px solid var(--border-soft);
  background: linear-gradient(145deg, var(--bg-surface), rgba(255, 255, 255, 0.04));
}

.pastel-a {
  background: linear-gradient(140deg, rgba(216, 168, 79, 0.18), rgba(255, 255, 255, 0.02));
}

.pastel-b {
  background: linear-gradient(140deg, rgba(169, 129, 58, 0.14), rgba(255, 255, 255, 0.02));
}

.pastel-c {
  background: linear-gradient(140deg, rgba(132, 104, 52, 0.18), rgba(255, 255, 255, 0.02));
}

.label {
  font-family: var(--title-font);
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
  display: block;
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10rpx;
}

.value-link {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px dashed var(--border-strong);
  padding-bottom: 2rpx;
}

.refresh {
  height: 82rpx;
  line-height: 82rpx;
  border-radius: 16rpx;
  border: 1px solid var(--border-strong);
}
</style>
