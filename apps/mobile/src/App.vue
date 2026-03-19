<template>
  <view class="app-root">
    <slot />
  </view>
</template>

<script setup lang="ts"></script>

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
  font-family: 'SF Pro Text', 'PingFang SC', sans-serif;
  overflow-x: hidden;
  overflow-y: hidden;
}

.app-root {
  height: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  overflow-y: hidden;
}
</style>
