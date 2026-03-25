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
</style>
