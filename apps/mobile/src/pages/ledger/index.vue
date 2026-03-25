<template>
  <view class="page">
    <view class="head glass-card">
      <text class="title">账单筛选</text>
      <text class="desc">按年月、分类、归属对象、平台、关键词查看历史账单</text>
    </view>

    <view class="filters-shell glass-card">
      <view class="filters-head" @click="toggleFilters">
        <text class="filters-title">筛选项</text>
        <text class="filters-summary">{{ filterSummaryText }}</text>
        <button class="filters-toggle-btn" @click.stop="toggleFilters">{{ filtersExpanded ? '收起' : '展开' }}</button>
      </view>

      <view v-if="filtersExpanded" class="filters-body">
        <picker mode="selector" :range="yearOptions" @change="onYearChange">
          <view class="pick">发生年份：{{ yearLabel }}</view>
        </picker>
        <picker mode="selector" :range="monthOptions" @change="onMonthChange">
          <view class="pick">发生月份：{{ monthLabel }}</view>
        </picker>
        <picker mode="selector" :range="flowTypeOptions" @change="onFlowTypeChange">
          <view class="pick">收支类型：{{ flowTypeLabel }}</view>
        </picker>
        <picker v-if="showMajorTypeFilter" mode="selector" :range="majorTypeOptions" @change="onTypeChange">
          <view class="pick">分类：{{ majorTypeLabel }}</view>
        </picker>
        <picker mode="selector" :range="usageTypeOptions" @change="onUsageChange">
          <view class="pick">归属对象：{{ usageTypeLabel }}</view>
        </picker>
        <picker mode="selector" :range="platformOptions" @change="onPlatformChange">
          <view class="pick">平台：{{ platformLabel }}</view>
        </picker>
        <input v-model="keyword" class="year-input" :placeholder="keywordPlaceholder" />
        <button class="query-btn" @click="load">筛选</button>
      </view>
    </view>

    <view class="summary glass-card">
      <text class="summary-label">筛选总金额</text>
      <text class="summary-amount">{{ totalAmountText }}</text>
      <text class="summary-count">共 {{ list.length }} 笔</text>
    </view>

    <view class="usage-pie-card glass-card">
      <text class="usage-pie-title">{{ pieTitle }}</text>
      <view v-if="list.length" class="usage-pie-content">
        <view class="usage-pie" :style="usagePieStyle" />
        <view class="usage-legend">
          <view v-for="item in usageBreakdown" :key="item.key" class="legend-row">
            <view class="legend-left">
              <text class="legend-dot" :style="{ background: item.color }" />
              <text class="legend-label">{{ item.label }}</text>
            </view>
            <text class="legend-value">{{ item.ratioText }}（{{ item.amountText }}）</text>
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无可统计数据</view>
    </view>
    <view v-if="showExpenseMajorPie" class="usage-pie-card glass-card">
      <text class="usage-pie-title">支出分类占比（按筛选结果）</text>
      <view v-if="list.length" class="usage-pie-content">
        <view class="usage-pie" :style="expenseTypePieStyle" />
        <view class="usage-legend">
          <view v-for="item in expenseTypeBreakdown" :key="item.key" class="legend-row">
            <view class="legend-left">
              <text class="legend-dot" :style="{ background: item.color }" />
              <text class="legend-label">{{ item.label }}</text>
            </view>
            <text class="legend-value">{{ item.ratioText }}（{{ item.amountText }}）</text>
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无可统计数据</view>
    </view>

    <scroll-view class="list" scroll-y>
      <view
        v-for="(item, idx) in list"
        :key="String(item.id)"
        class="swipe-row"
        :class="{ 'show-delete': !isDesktop && swipedId === String(item.id), desktop: isDesktop }"
        @touchstart="!isDesktop && onTouchStart($event, String(item.id))"
        @touchend="!isDesktop && onTouchEnd($event, String(item.id))"
        @mousedown="!isDesktop && onMouseDown($event, String(item.id))"
        @mousemove="!isDesktop && onMouseMove($event, String(item.id))"
        @mouseup="!isDesktop && onMouseUp($event, String(item.id))"
        @mouseleave="!isDesktop && onMouseLeave($event, String(item.id))"
      >
        <view v-if="!isDesktop" class="delete-actions">
          <button class="delete-action-btn danger" @click.stop="confirmDelete(String(item.id))">删除</button>
          <button class="delete-action-btn cancel" @click.stop="closeSwipe">取消</button>
        </view>
        <view
          class="item glass-card"
          :class="{ shifted: !isDesktop && swipedId === String(item.id) }"
          :style="{ animationDelay: `${idx * 40}ms` }"
          @click="onCardClick(String(item.id))"
          @contextmenu.prevent="isDesktop ? confirmDelete(String(item.id)) : undefined"
          @longpress="confirmDelete(String(item.id))"
        >
          <view class="item-top">
            <view class="line strong">{{ item.amount }} 元</view>
            <button v-if="isDesktop" class="desktop-delete-btn" @click.stop="confirmDelete(String(item.id))">删除</button>
          </view>
          <view class="line">发生时间：{{ formatDate(String(item.occurredAt)) }}</view>
          <view class="line">入账时间：{{ formatDate(String(item.createdAt)) }}</view>
          <view v-if="String(item.majorType) === 'income'" class="line">
            分类：{{ typeText(String(item.majorType)) }} ｜ 来源：{{ normalizeIncomeSource(item.reason) }}
          </view>
          <view v-else class="line">
            分类：{{ typeText(String(item.majorType)) }} ｜ 归属对象：{{ usageText(String(item.usageType)) }}
          </view>
          <view class="line">平台：{{ (item.platformTags || []).join(' / ') || '未填' }}</view>
          <view v-if="String(item.majorType) !== 'income'" class="line">用途：{{ item.reason }}</view>
          <view class="line">备注：{{ item.note || '无' }}</view>
        </view>
      </view>
      <view v-if="!list.length" class="empty">暂无账单记录</view>
      <view class="scroll-tail" />
    </scroll-view>

    <AppTabBar current="ledger" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import AppTabBar from '@/components/AppTabBar.vue';
import { deleteLedgerEntry, fetchLedger } from '@/services/ledger';
import { useUserStore } from '@/store/user';
import type { LedgerEntry } from '@/types/api';

const user = useUserStore();
const year = ref(String(new Date().getFullYear()));
const month = ref('');
const flowType = ref<'income' | 'expense'>('expense');
const platform = ref('');
const keyword = ref('');
const majorType = ref('');
const majorTypeOptions = ['全部', '固定支出', '额外支出'];
const flowTypeOptions = ['支出', '收入'];
const usageType = ref('');
const usageTypeOptions = ['全部', '家庭', '老婆', '孩子', '老公', '其他'];
const platformOptions = ['全部', '现金', '京东', '淘宝', '抖音', '饿了么', '叮咚买菜'];
const list = ref<LedgerEntry[]>([]);
const swipedId = ref('');
const touchStartX = ref(0);
const mouseStartX = ref(0);
const mouseDragId = ref('');
const hasMouseDragged = ref(false);
const isDesktop = ref(false);
const filtersExpanded = ref(false);

const majorTypeLabel = computed(() => majorType.value || '全部');
const usageTypeLabel = computed(() => usageType.value || '全部');
const flowTypeLabel = computed(() => (flowType.value === 'income' ? '收入' : '支出'));
const showMajorTypeFilter = computed(() => flowType.value !== 'income');
const keywordPlaceholder = computed(() =>
  flowType.value === 'income' ? '关键词（收入来源/备注/原文）' : '关键词（用途/备注/原文）'
);
const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear();
  const options: string[] = [];
  for (let y = currentYear; y >= 2026; y -= 1) {
    options.push(String(y));
  }
  return options;
});
const monthOptions = ['全部', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const yearLabel = computed(() => `${year.value}年`);
const monthLabel = computed(() => (month.value ? `${month.value}月` : '全部'));
const platformLabel = computed(() => platform.value || '全部');
const totalAmount = computed(() => list.value.reduce((sum, item) => sum + Number(item.amount || 0), 0));
const totalAmountText = computed(() => `${totalAmount.value.toFixed(2)} 元`);
const filterSummaryText = computed(() => {
  const parts = [
    `${flowTypeLabel.value}`,
    `${yearLabel.value}${month.value ? monthLabel.value : ''}`,
    `分类:${showMajorTypeFilter.value ? majorTypeLabel.value : '全部'}`,
    `归属:${usageTypeLabel.value}`,
    `平台:${platformLabel.value}`
  ];
  if (keyword.value.trim()) {
    parts.push(`关键词:${keyword.value.trim()}`);
  }
  return parts.join(' ｜ ');
});
const usageColorMap: Record<string, string> = {
  family: '#5B8FF9',
  self: '#F6BD16',
  child: '#5AD8A6',
  husband: '#F6903D',
  other: '#9270CA'
};
const expenseTypeColorMap: Record<string, string> = {
  fixed: '#5B8FF9',
  extra: '#F6903D'
};
const expenseTypeLabelMap: Record<string, string> = {
  fixed: '固定支出',
  extra: '额外支出'
};
const usageLabelMap: Record<string, string> = {
  family: '家庭',
  self: '老婆',
  child: '孩子',
  husband: '老公',
  other: '其他'
};
const incomeSourceColors = ['#5B8FF9', '#F6BD16', '#5AD8A6', '#F6903D', '#9270CA', '#F08BB4', '#6DC8EC'];
const pieTitle = computed(() =>
  flowType.value === 'income' ? '收入来源占比（按筛选结果）' : '归属对象占比（按筛选结果）'
);
const usageBreakdown = computed(() => {
  if (flowType.value === 'income') {
    const base: Record<string, number> = { 老公: 0, 老婆: 0, 其他: 0 };
    list.value.forEach((item) => {
      const amount = Number(item.amount || 0);
      const source = normalizeIncomeSource(item.reason);
      base[source] += amount;
    });

    const total = Object.values(base).reduce((sum, value) => sum + value, 0);
    return (Object.keys(base) as Array<keyof typeof base>).map((source, index) => {
      const amount = base[source];
      const ratio = total > 0 ? amount / total : 0;
      return {
        key: source,
        label: source,
        amount,
        ratio,
        color: incomeSourceColors[index % incomeSourceColors.length],
        amountText: `${amount.toFixed(2)}元`,
        ratioText: `${(ratio * 100).toFixed(1)}%`
      };
      });
  }

  const base: Record<string, number> = { family: 0, self: 0, child: 0, husband: 0, other: 0 };
  list.value.forEach((item) => {
    const key = String(item.usageType || 'other');
    const amount = Number(item.amount || 0);
    if (Object.prototype.hasOwnProperty.call(base, key)) {
      base[key] += amount;
      return;
    }
    base.other += amount;
  });

  const total = Object.values(base).reduce((sum, value) => sum + value, 0);
  return (Object.keys(base) as Array<keyof typeof base>).map((key) => {
    const amount = base[key];
    const ratio = total > 0 ? amount / total : 0;
    return {
      key,
      label: usageLabelMap[key],
      amount,
      ratio,
      color: usageColorMap[key],
      amountText: `${amount.toFixed(2)}元`,
      ratioText: `${(ratio * 100).toFixed(1)}%`
    };
  });
});
const usagePieStyle = computed(() => {
  const total = usageBreakdown.value.reduce((sum, item) => sum + item.amount, 0);
  if (!total) {
    return { background: '#edf2ff' };
  }

  let currentPercent = 0;
  const segments = usageBreakdown.value.map((item) => {
    const start = currentPercent;
    currentPercent += item.ratio * 100;
    return `${item.color} ${start.toFixed(2)}% ${currentPercent.toFixed(2)}%`;
  });
  return { background: `conic-gradient(${segments.join(', ')})` };
});
const showExpenseMajorPie = computed(() => flowType.value === 'expense');
const expenseTypeBreakdown = computed(() => {
  const base: Record<string, number> = { fixed: 0, extra: 0 };
  list.value.forEach((item) => {
    const key = String(item.majorType || '');
    const amount = Number(item.amount || 0);
    if (key === 'fixed' || key === 'extra') {
      base[key] += amount;
    }
  });

  const total = Object.values(base).reduce((sum, value) => sum + value, 0);
  return (Object.keys(base) as Array<keyof typeof base>).map((key) => {
    const amount = base[key];
    const ratio = total > 0 ? amount / total : 0;
    return {
      key,
      label: expenseTypeLabelMap[key],
      amount,
      ratio,
      color: expenseTypeColorMap[key],
      amountText: `${amount.toFixed(2)}元`,
      ratioText: `${(ratio * 100).toFixed(1)}%`
    };
  });
});
const expenseTypePieStyle = computed(() => {
  const total = expenseTypeBreakdown.value.reduce((sum, item) => sum + item.amount, 0);
  if (!total) {
    return { background: '#edf2ff' };
  }

  let currentPercent = 0;
  const segments = expenseTypeBreakdown.value.map((item) => {
    const start = currentPercent;
    currentPercent += item.ratio * 100;
    return `${item.color} ${start.toFixed(2)}% ${currentPercent.toFixed(2)}%`;
  });
  return { background: `conic-gradient(${segments.join(', ')})` };
});

function onYearChange(e: { detail: { value: string } }) {
  const index = Number(e.detail.value);
  year.value = yearOptions.value[index] || year.value;
}

function toggleFilters() {
  filtersExpanded.value = !filtersExpanded.value;
}

function onMonthChange(e: { detail: { value: string } }) {
  const index = Number(e.detail.value);
  month.value = index <= 0 ? '' : String(index);
}

function onFlowTypeChange(e: { detail: { value: string } }) {
  const index = Number(e.detail.value);
  const label = flowTypeOptions[index];
  flowType.value = label === '收入' ? 'income' : 'expense';
  if (flowType.value === 'income') {
    majorType.value = '';
  }
}

function onTypeChange(e: { detail: { value: string } }) {
  const index = Number(e.detail.value);
  const label = majorTypeOptions[index];
  majorType.value = label === '全部' ? '' : label;
}

function onUsageChange(e: { detail: { value: string } }) {
  const index = Number(e.detail.value);
  const label = usageTypeOptions[index];
  usageType.value = label === '全部' ? '' : label;
}

function onPlatformChange(e: { detail: { value: string } }) {
  const index = Number(e.detail.value);
  const label = platformOptions[index];
  platform.value = label === '全部' ? '' : label;
}

function toApiType(label: string) {
  if (label === '固定支出') return 'fixed';
  if (label === '额外支出') return 'extra';
  return '';
}

function toApiUsage(label: string) {
  if (label === '家庭') return 'family';
  if (label === '老婆') return 'self';
  if (label === '本人') return 'self';
  if (label === '孩子') return 'child';
  if (label === '老公') return 'husband';
  if (label === '其他') return 'other';
  return '';
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

async function load() {
  await user.ensureLogin();
  list.value = await fetchLedger({
    year: year.value,
    month: month.value,
    flowType: flowType.value,
    majorType: toApiType(majorType.value),
    usageType: toApiUsage(usageType.value),
    platform: platform.value.trim(),
    keyword: keyword.value.trim()
  });
  uni.setStorageSync('latestLedger', list.value);
}

function openDetail(id: string) {
  if (!id) return;
  uni.navigateTo({ url: `/pages/ledger/detail?id=${encodeURIComponent(id)}` });
}

function onCardClick(id: string) {
  if (hasMouseDragged.value) {
    hasMouseDragged.value = false;
    return;
  }
  if (swipedId.value === id) {
    swipedId.value = '';
    return;
  }
  openDetail(id);
}

function onTouchStart(event: any, id: string) {
  if (swipedId.value && swipedId.value !== id) {
    swipedId.value = '';
  }
  touchStartX.value = Number(event?.changedTouches?.[0]?.clientX || 0);
}

function onTouchEnd(event: any, id: string) {
  const endX = Number(event?.changedTouches?.[0]?.clientX || 0);
  const deltaX = endX - touchStartX.value;
  if (deltaX < -36) {
    swipedId.value = id;
    return;
  }
  if (deltaX > 24) {
    swipedId.value = '';
  }
}

function onMouseDown(event: any, id: string) {
  mouseStartX.value = event.clientX;
  mouseDragId.value = id;
  hasMouseDragged.value = false;
}

function onMouseMove(event: any, id: string) {
  if (mouseDragId.value !== id) return;
  const deltaX = event.clientX - mouseStartX.value;
  if (deltaX < -20) {
    swipedId.value = id;
    hasMouseDragged.value = true;
  }
}

function onMouseUp(event: any, id: string) {
  if (mouseDragId.value !== id) return;
  const deltaX = event.clientX - mouseStartX.value;
  if (deltaX < -24) {
    swipedId.value = id;
    hasMouseDragged.value = true;
    mouseDragId.value = '';
    return;
  }
  if (deltaX > 16) {
    swipedId.value = '';
    hasMouseDragged.value = true;
  }
  mouseDragId.value = '';
}

function onMouseLeave(event: any, id: string) {
  if (mouseDragId.value !== id) return;
  const deltaX = event.clientX - mouseStartX.value;
  if (deltaX < -24) {
    swipedId.value = id;
    hasMouseDragged.value = true;
  }
  mouseDragId.value = '';
}

async function confirmDelete(id: string) {
  if (!id) return;
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

  await deleteLedgerEntry(id);
  list.value = list.value.filter((item) => String(item.id) !== id);
  swipedId.value = '';
  uni.showToast({ title: '已删除', icon: 'success' });
}

function closeSwipe() {
  swipedId.value = '';
}

onMounted(load);

onLoad((query) => {
  const prefill = {
    ...(query || {}),
    ...(uni.getStorageSync('ledgerPrefillQuery') || {})
  } as Record<string, string | undefined>;

  if (prefill.year) year.value = String(prefill.year);
  if (typeof prefill.month === 'string') month.value = prefill.month;
  if (prefill.flowType === 'income' || prefill.flowType === 'expense') {
    flowType.value = prefill.flowType;
  }
  if (prefill.platform) platform.value = String(prefill.platform);
  if (prefill.keyword) keyword.value = String(prefill.keyword);

  const mt = String(prefill.majorType || '');
  if (mt === 'fixed') majorType.value = '固定支出';
  if (mt === 'extra') majorType.value = '额外支出';
  if (mt === 'income') {
    flowType.value = 'income';
    majorType.value = '';
  }

  const ut = String(prefill.usageType || '');
  if (ut === 'family') usageType.value = '家庭';
  if (ut === 'self') usageType.value = '老婆';
  if (ut === 'child') usageType.value = '孩子';
  if (ut === 'husband') usageType.value = '老公';
  if (ut === 'other') usageType.value = '其他';

  uni.removeStorageSync('ledgerPrefillQuery');
});

onMounted(() => {
  const { windowWidth } = uni.getSystemInfoSync();
  isDesktop.value = windowWidth >= 768;
});
</script>

<style scoped>
.page {
  height: 100vh;
  padding: 20rpx 20rpx calc(env(safe-area-inset-bottom) + 128rpx);
  background: var(--bg-base);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.filters-shell {
  padding: 14rpx 16rpx;
  margin-bottom: 14rpx;
}

.filters-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12rpx;
}

.filters-title {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.filters-summary {
  font-size: 22rpx;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filters-toggle-btn {
  height: 52rpx;
  line-height: 52rpx;
  border: 1px solid var(--border-soft);
  border-radius: 999rpx;
  padding: 0 18rpx;
  background: linear-gradient(145deg, var(--bg-elevated), rgba(255, 255, 255, 0.02));
  color: var(--text-primary);
  font-size: 22rpx;
}

.filters-body {
  margin-top: 12rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10rpx;
}

.pick,
.year-input {
  background: linear-gradient(145deg, var(--bg-elevated), rgba(255, 255, 255, 0.02));
  border: 1px solid var(--border-soft);
  border-radius: 16rpx;
  min-height: 72rpx;
  display: flex;
  align-items: center;
  padding: 0 16rpx;
}

.query-btn {
  border: 1px solid var(--border-strong);
  border-radius: 16rpx;
  background: linear-gradient(130deg, var(--accent), var(--accent-2));
  color: #fff5df;
  grid-column: 1 / span 2;
}

.summary {
  margin-bottom: 14rpx;
  padding: 18rpx 20rpx;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.summary-label {
  font-size: 24rpx;
  color: var(--text-secondary);
}

.summary-amount {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--accent);
  font-family: var(--title-font);
}

.summary-count {
  margin-left: auto;
  font-size: 22rpx;
  color: var(--text-secondary);
}

.usage-pie-card {
  margin-bottom: 14rpx;
  padding: 18rpx 20rpx;
}

.usage-pie-title {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.usage-pie-content {
  margin-top: 14rpx;
  display: grid;
  grid-template-columns: 180rpx 1fr;
  gap: 14rpx;
  align-items: center;
}

.usage-pie {
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  border: 8rpx solid rgba(215, 165, 69, 0.2);
  box-sizing: border-box;
}

.usage-legend {
  display: grid;
  gap: 8rpx;
}

.legend-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
}

.legend-left {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.legend-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  display: inline-block;
}

.legend-label {
  font-size: 22rpx;
  color: var(--text-primary);
}

.legend-value {
  font-size: 20rpx;
  color: var(--text-secondary);
}

.list {
  flex: 1;
  min-height: 0;
  padding-bottom: 0;
  box-sizing: border-box;
}

.scroll-tail {
  height: calc(env(safe-area-inset-bottom) + 180rpx);
}

.item {
  margin-bottom: 0;
  padding: 18rpx;
  animation: jelly-enter 0.18s ease-out both;
  transition: transform 0.2s ease;
  position: relative;
  z-index: 2;
}

.swipe-row {
  position: relative;
  margin-bottom: 14rpx;
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.swipe-row.desktop {
  overflow: visible;
}

.delete-actions {
  position: absolute;
  top: 0;
  right: 0;
  width: 140rpx;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 8rpx;
  box-sizing: border-box;
  z-index: 6;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.delete-action-btn {
  flex: 1;
  border: 1px solid var(--border-soft);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
}

.delete-action-btn.danger {
  background: linear-gradient(130deg, #c85b5b, #ad4141);
}

.delete-action-btn.cancel {
  background: rgba(138, 128, 110, 0.58);
}

.swipe-row.show-delete .delete-actions {
  opacity: 1;
  pointer-events: auto;
  z-index: 8;
}

.item.shifted {
  transform: translateX(-140rpx);
  z-index: 2;
}

.item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
}

.desktop-delete-btn {
  height: 52rpx;
  line-height: 52rpx;
  border: 1px solid var(--border-soft);
  border-radius: 999rpx;
  padding: 0 18rpx;
  font-size: 22rpx;
  background: linear-gradient(130deg, #c85b5b, #ad4141);
  color: #fff4ea;
  flex-shrink: 0;
}

.line {
  margin-bottom: 6rpx;
  color: var(--text-primary);
  word-break: break-all;
}

.strong {
  font-size: 28rpx;
  font-weight: 700;
  font-family: var(--title-font);
}

.empty {
  text-align: center;
  margin-top: 100rpx;
  color: var(--text-secondary);
}

@media (hover: hover) {
  .query-btn:hover,
  .filters-toggle-btn:hover,
  .desktop-delete-btn:hover {
    transform: translateY(-2rpx);
  }

  .item:hover {
    transform: translateY(-2rpx);
  }
}
</style>
