<template>
  <view :class="['app-root', themeClass]">
    <slot />
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';

const LOGIN_PATH = '/pages/login/index';
const HOME_PATH = '/pages/chat/index';
const themeClass = ref('theme-light');

function currentPath() {
  const route = getCurrentPages().slice(-1)[0]?.route || '';
  return route ? `/${route}` : '';
}

function syncTheme() {
  const mode = String(uni.getStorageSync('appThemeMode') || 'auto');
  const sysTheme = String(uni.getSystemInfoSync().theme || 'light');
  const isDark = mode === 'dark' || (mode === 'auto' && sysTheme === 'dark');
  themeClass.value = isDark ? 'theme-dark' : 'theme-light';
}

onShow(() => {
  syncTheme();
  const token = uni.getStorageSync('token');
  const path = currentPath();
  if (!path) return;

  if (!token && path !== LOGIN_PATH) {
    uni.reLaunch({ url: LOGIN_PATH });
    return;
  }
  if (token && path === LOGIN_PATH) {
    uni.reLaunch({ url: HOME_PATH });
  }
});
</script>

<style>
@import './styles/theme.css';

html,
body,
#app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

uni-page-body {
  height: 100%;
  overflow: hidden !important;
}

page {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--body-font);
  overflow-x: hidden;
  overflow-y: hidden;
}

.app-root {
  position: relative;
  height: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  overflow-y: hidden;
}

.app-root::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.16'/%3E%3C/svg%3E");
  opacity: 0.2;
  z-index: 0;
}

.app-root > * {
  position: relative;
  z-index: 1;
}
</style>
