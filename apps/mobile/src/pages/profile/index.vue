<template>
  <view class="page">
    <view class="profile glass-card">
      <text class="title">账户中心</text>
      <text class="line">当前用户：{{ user.displayName || '游客用户' }}</text>
      <text class="line">登录模式：{{ user.loginType === 'wechat' ? '微信' : '游客' }}</text>
      <text v-if="authAutoMode === 'guest_fallback'" class="tip">自动微信登录失败，已回退游客模式</text>
      <button v-if="user.loginType !== 'wechat'" class="btn bind" @click="bindWechatAccount">绑定微信账号</button>
      <button class="btn" @click="reLogin">重新初始化游客身份</button>
    </view>

    <view class="profile glass-card">
      <text class="title">本地缓存</text>
      <text class="line">会话草稿：{{ !!draftSnapshot ? '已缓存' : '无' }}</text>
      <text class="line">最近账单：{{ ledgerCount }} 条</text>
      <text class="line">分析快照：{{ !!analyticsSnapshot ? '已缓存' : '无' }}</text>
    </view>

    <AppTabBar current="profile" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppTabBar from '@/components/AppTabBar.vue';
import { getWechatCode } from '@/services/auth';
import { useUserStore } from '@/store/user';

const user = useUserStore();
const draftSnapshot = ref<any>(null);
const analyticsSnapshot = ref<any>(null);
const authAutoMode = ref('');
const ledgerCount = computed(() => {
  const list = uni.getStorageSync('latestLedger') as unknown[];
  return Array.isArray(list) ? list.length : 0;
});

onMounted(async () => {
  await user.ensureLogin();
  draftSnapshot.value = uni.getStorageSync('chatSnapshot');
  analyticsSnapshot.value = uni.getStorageSync('analyticsSnapshot');
  authAutoMode.value = uni.getStorageSync('authAutoMode') || '';
});

async function bindWechatAccount() {
  try {
    await user.ensureLogin();
    const code = await getWechatCode();
    await user.bindWechatByCode(code);
    authAutoMode.value = 'wechat';
    uni.setStorageSync('authAutoMode', 'wechat');
    uni.showToast({ title: '微信绑定成功', icon: 'success' });
  } catch (_error) {
    uni.showToast({ title: '当前环境不支持微信绑定，请在微信小程序内操作', icon: 'none' });
  }
}

function reLogin() {
  user.logout();
  user.ensureLogin();
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 20rpx 20rpx 190rpx;
  background: var(--bg-base);
  box-sizing: border-box;
}

.profile {
  padding: 20rpx;
  margin-bottom: 14rpx;
  display: grid;
  gap: 10rpx;
}

.title {
  font-size: 34rpx;
  font-weight: 800;
}

.line {
  color: var(--text-primary);
}

.tip {
  color: #d56c89;
  font-size: 24rpx;
}

.btn {
  border-radius: 16rpx;
  border: none;
  background: #74a8ff;
  color: #fff;
  margin-top: 8rpx;
}

.bind {
  background: #83d8bf;
}
</style>
