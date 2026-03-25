<template>
  <view :class="['bubble-row', role === 'user' ? 'user' : 'assistant']">
    <view :class="['bubble', role === 'user' ? 'bubble-user' : 'bubble-assistant', 'jelly-enter']">
      <text class="bubble-text">{{ text }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  role: 'user' | 'assistant';
  text: string;
}>();
</script>

<style scoped>
.bubble-row {
  display: flex;
  margin-bottom: 16rpx;
}

.bubble-row.user {
  justify-content: flex-end;
}

.bubble-row.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 82%;
  border-radius: 28rpx;
  padding: 18rpx 22rpx;
  color: var(--text-primary);
  box-sizing: border-box;
  border: 1px solid var(--border-soft);
  box-shadow: var(--shadow-soft);
}

.bubble-text {
  display: block;
  line-height: 1.55;
  word-break: break-all;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.bubble-user {
  background: var(--bubble-user);
  border-top-right-radius: 12rpx;
  color: #2a1902;
  border-color: rgba(150, 111, 40, 0.34);
}

.bubble-assistant {
  background: var(--bubble-bot);
  border-top-left-radius: 12rpx;
}
</style>
