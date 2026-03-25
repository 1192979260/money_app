<template>
  <view class="login-page" :class="[isDark ? 'theme-dark' : 'theme-light']">
    <view class="bg-layer"></view>
    <view class="noise-layer"></view>
    <view class="halo halo-a"></view>
    <view class="halo halo-b"></view>

    <view class="theme-switch">
      <button class="mode-chip" :class="{ active: themeMode === 'light' }" @click="setTheme('light')">浅色</button>
      <button class="mode-chip" :class="{ active: themeMode === 'dark' }" @click="setTheme('dark')">深色</button>
      <button class="mode-chip" :class="{ active: themeMode === 'auto' }" @click="setTheme('auto')">跟随</button>
    </view>

    <view class="auth-card">
      <text class="eyebrow">Money App</text>
      <text class="title">优雅记账</text>
      <text class="subtitle">一笔一记，掌握每一份收支节奏</text>

      <button class="auth-btn primary gold-shine" :disabled="loading" @click="onGuestLogin">
        {{ loading ? '登录中...' : '游客登录' }}
      </button>
      <button
        v-if="wechatSupported"
        class="auth-btn secondary"
        :disabled="loading"
        @click="onWechatLogin"
      >
        微信登录
      </button>
      <text v-else class="hint">微信登录仅支持微信小程序环境</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getWechatCode, loginGuest, loginWechat } from '@/services/auth';
import { useUserStore } from '@/store/user';

type ThemeMode = 'light' | 'dark' | 'auto';

const user = useUserStore();
const loading = ref(false);
const themeMode = ref<ThemeMode>((uni.getStorageSync('appThemeMode') as ThemeMode) || 'auto');
const systemTheme = (uni.getSystemInfoSync().theme || 'light') as 'light' | 'dark';
const wechatSupported = process.env.UNI_PLATFORM === 'mp-weixin';
const isDark = computed(() => (themeMode.value === 'auto' ? systemTheme === 'dark' : themeMode.value === 'dark'));

if (user.token) {
  uni.reLaunch({ url: '/pages/chat/index' });
}

function setTheme(mode: ThemeMode) {
  themeMode.value = mode;
  uni.setStorageSync('appThemeMode', mode);
  uni.setStorageSync('loginThemeMode', mode);
}

async function onGuestLogin() {
  if (loading.value) return;
  loading.value = true;
  try {
    const result = await loginGuest();
    user.applyAuth(result);
    uni.reLaunch({ url: '/pages/chat/index' });
  } catch (_error) {
    uni.showToast({ title: '游客登录失败，请重试', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function onWechatLogin() {
  if (loading.value) return;
  loading.value = true;
  try {
    const code = await getWechatCode();
    const result = await loginWechat(code);
    user.applyAuth(result);
    uni.reLaunch({ url: '/pages/chat/index' });
  } catch (_error) {
    uni.showToast({ title: '微信登录失败，请重试', icon: 'none' });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700;800&family=Source+Serif+4:wght@400;500;600&display=swap');

.login-page {
  --title-font: 'Playfair Display', 'Times New Roman', serif;
  --body-font: 'Source Serif 4', 'Noto Serif SC', serif;
  --accent: #c3922f;
  --border-soft: rgba(255, 255, 255, 0.28);
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: 46rpx 34rpx;
  box-sizing: border-box;
  font-family: var(--body-font);
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-light {
  --bg-a: #fffdf8;
  --bg-b: #f2ede3;
  --bg-c: #e8e0d4;
  --text-primary: #292724;
  --text-secondary: rgba(41, 39, 36, 0.72);
  --card-bg: rgba(255, 252, 246, 0.54);
  --card-edge: rgba(44, 40, 35, 0.14);
  --shadow-color: rgba(53, 43, 31, 0.2);
}

.theme-dark {
  --bg-a: #0d0d0d;
  --bg-b: #171717;
  --bg-c: #242220;
  --text-primary: #f4efe4;
  --text-secondary: rgba(244, 239, 228, 0.76);
  --card-bg: rgba(17, 17, 17, 0.58);
  --card-edge: rgba(218, 176, 98, 0.28);
  --shadow-color: rgba(0, 0, 0, 0.46);
}

.bg-layer,
.noise-layer,
.halo {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bg-layer {
  background: radial-gradient(140% 90% at 0% 0%, var(--bg-c) 0%, transparent 60%),
    linear-gradient(140deg, var(--bg-a) 0%, var(--bg-b) 55%, var(--bg-c) 100%);
}

.noise-layer {
  opacity: 0.22;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.2'/%3E%3C/svg%3E");
}

.halo {
  filter: blur(58rpx);
  transform-origin: center;
  animation: float 6s ease-in-out infinite;
}

.halo-a {
  background: radial-gradient(circle at 25% 30%, rgba(199, 150, 58, 0.36), transparent 62%);
}

.halo-b {
  background: radial-gradient(circle at 82% 72%, rgba(187, 142, 57, 0.22), transparent 58%);
  animation-delay: 2s;
}

.theme-switch {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 28rpx);
  right: 24rpx;
  z-index: 3;
  display: flex;
  gap: 12rpx;
}

.mode-chip {
  min-width: 90rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 999rpx;
  border: 1px solid rgba(195, 146, 47, 0.34);
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  font-family: var(--body-font);
  font-size: 24rpx;
  padding: 0 20rpx;
}

.mode-chip::after,
.auth-btn::after {
  border: none;
}

.mode-chip.active {
  color: #fff6e0;
  background: linear-gradient(135deg, #9e6f19, #d2a64d);
}

.auth-card {
  position: relative;
  z-index: 2;
  width: 86vw;
  max-width: 720rpx;
  padding: 62rpx 48rpx;
  border-radius: 34rpx;
  border: 1px solid var(--card-edge);
  background: linear-gradient(155deg, var(--card-bg), rgba(255, 255, 255, 0.07));
  box-shadow: 0 20rpx 60rpx var(--shadow-color);
  backdrop-filter: blur(16px) saturate(130%);
  display: grid;
  gap: 22rpx;
  transform: translateY(10rpx);
  animation: reveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.auth-card::after {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: 32rpx;
  border: 1px solid var(--border-soft);
  pointer-events: none;
}

.eyebrow {
  font-size: 22rpx;
  letter-spacing: 3rpx;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.title {
  font-family: var(--title-font);
  font-size: 72rpx;
  line-height: 1.06;
  color: var(--text-primary);
}

.subtitle {
  font-size: 30rpx;
  line-height: 1.45;
  color: var(--text-secondary);
  margin-bottom: 8rpx;
}

.auth-btn {
  width: 100%;
  height: 92rpx;
  line-height: 92rpx;
  border-radius: 999rpx;
  border: 1px solid transparent;
  font-size: 30rpx;
  font-weight: 600;
  font-family: var(--body-font);
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}

.auth-btn.primary {
  color: #271602;
  background: linear-gradient(125deg, #f0d18f 0%, #d9aa4a 44%, #a1721f 100%);
  box-shadow: 0 14rpx 28rpx rgba(158, 113, 24, 0.35);
}

.auth-btn.secondary {
  color: var(--text-primary);
  background: transparent;
  border-color: rgba(199, 154, 68, 0.52);
}

.gold-shine {
  position: relative;
  overflow: hidden;
}

.gold-shine::before {
  content: '';
  position: absolute;
  top: -140%;
  left: -35%;
  width: 34%;
  height: 370%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transform: rotate(18deg);
  animation: shine 2.8s ease-in-out infinite;
}

.hint {
  color: var(--text-secondary);
  text-align: center;
  font-size: 24rpx;
  margin-top: 8rpx;
}

.auth-btn[disabled] {
  opacity: 0.7;
}

@media (hover: hover) {
  .auth-btn:hover {
    transform: translateY(-4rpx) scale(1.01);
    box-shadow: 0 18rpx 34rpx rgba(176, 128, 34, 0.42);
  }
  .mode-chip:hover {
    transform: translateY(-2rpx);
  }
}

@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(26rpx) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10rpx);
  }
}

@keyframes shine {
  0% {
    left: -42%;
  }
  62%,
  100% {
    left: 130%;
  }
}
</style>
