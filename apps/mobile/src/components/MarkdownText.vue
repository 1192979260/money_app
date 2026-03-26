<template>
  <rich-text class="md-content" :nodes="html" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { markdownToHtml } from '@/utils/markdown';

const props = defineProps<{
  text: string;
}>();

const html = computed(() => markdownToHtml(props.text || ''));
</script>

<style scoped>
.md-content {
  display: block;
  line-height: 1.6;
  color: var(--text-primary);
  word-break: break-word;
}

.md-content :deep(ul),
.md-content :deep(ol) {
  margin: 8rpx 0;
  padding-left: 34rpx;
}

.md-content :deep(li) {
  margin: 4rpx 0;
  line-height: 1.7;
}

.md-content :deep(h1),
.md-content :deep(h2),
.md-content :deep(h3) {
  margin: 12rpx 0 8rpx;
}
</style>
