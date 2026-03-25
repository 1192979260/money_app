<template>
  <view class="tab-wrap">
    <view class="tab glass-card">
      <view
        v-for="item in tabs"
        :key="item.key"
        :class="['tab-item', current === item.key ? 'active' : '']"
        @click="go(item.path)"
      >
        <text class="icon">{{ item.icon }}</text>
        <text class="label">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ current: 'chat' | 'ledger' | 'analytics' | 'advice' | 'profile' }>();

const tabs = [
  { key: 'chat', label: '记账', icon: '💬', path: '/pages/chat/index' },
  { key: 'ledger', label: '账单', icon: '📒', path: '/pages/ledger/index' },
  { key: 'analytics', label: '分析', icon: '📊', path: '/pages/analytics/index' },
  { key: 'advice', label: '建议', icon: '🧠', path: '/pages/advice/index' },
  { key: 'profile', label: '我的', icon: '👤', path: '/pages/profile/index' }
] as const;

function go(path: string) {
  const currentRoute = getCurrentPages().slice(-1)[0]?.route || '';
  const target = path.replace(/^\//, '');
  if (currentRoute === target) return;

  uni.redirectTo({
    url: path,
    fail: () =>
      uni.reLaunch({
        url: path
      })
  });
}
</script>

<style scoped>
.tab-wrap {
  position: fixed;
  left: 16rpx;
  right: 16rpx;
  bottom: calc(env(safe-area-inset-bottom) + 8rpx);
  z-index: 200;
}

.tab {
  padding: 10rpx 8rpx;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6rpx;
  border: 2rpx solid var(--border-soft);
  background: linear-gradient(145deg, var(--bg-elevated), rgba(255, 255, 255, 0.05));
}

.tab-item {
  min-height: 82rpx;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.tab-item.active {
  background: linear-gradient(145deg, rgba(220, 174, 89, 0.24), rgba(213, 161, 67, 0.42));
  color: var(--text-primary);
  box-shadow: inset 0 0 0 1px var(--border-strong);
}

.icon {
  font-size: 28rpx;
  line-height: 1;
}

.label {
  margin-top: 5rpx;
  font-size: 23rpx;
  font-weight: 700;
  font-family: var(--body-font);
}

@media (hover: hover) {
  .tab-item:hover {
    transform: translateY(-2rpx);
    background: rgba(214, 168, 82, 0.16);
    color: var(--text-primary);
  }
}
</style>
