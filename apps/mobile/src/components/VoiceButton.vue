<template>
  <button
    :class="['voice-btn', block ? 'block' : '', isPressing ? 'pressing' : '']"
    @touchstart.prevent="startPress"
    @touchend.prevent="endPress"
    @touchcancel.prevent="endPress"
    @mousedown.prevent="startPress"
    @mouseup.prevent="endPress"
    @mouseleave.prevent="endPress"
  >
    {{ isPressing ? '松开结束' : '按住说话' }}
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';

withDefaults(
  defineProps<{
    block?: boolean;
  }>(),
  {
    block: false
  }
);

const emit = defineEmits<{ (e: 'recorded', base64: string): void }>();

let recorder: UniApp.RecorderManager | null = null;
let recorderReady = false;
const isPressing = ref(false);

let mediaRecorder: any = null;
let mediaStream: any = null;
let mediaChunks: BlobPart[] = [];

const isH5 = typeof window !== 'undefined' && typeof navigator !== 'undefined';

function initUniRecorder() {
  if (recorderReady) return;
  recorder = uni.getRecorderManager();
  recorder.onStop((res) => {
    if (!res.tempFilePath) return;
    uni.getFileSystemManager().readFile({
      filePath: res.tempFilePath,
      encoding: 'base64',
      success: (file) => {
        emit('recorded', file.data as string);
      },
      fail: () => {
        uni.showToast({ title: '录音读取失败', icon: 'none' });
      }
    });
  });
  recorderReady = true;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const data = String(reader.result || '');
      const base64 = data.includes(',') ? data.split(',')[1] : data;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('file reader failed'));
    reader.readAsDataURL(blob);
  });
}

async function startH5Recorder() {
  const mediaDevices = (navigator as any).mediaDevices;
  const RecorderCtor = (window as any).MediaRecorder;

  if (!mediaDevices?.getUserMedia || !RecorderCtor) {
    throw new Error('MediaRecorder not supported');
  }

  mediaStream = await mediaDevices.getUserMedia({ audio: true });
  mediaChunks = [];
  mediaRecorder = new RecorderCtor(mediaStream);

  mediaRecorder.ondataavailable = (event: any) => {
    if (event.data && event.data.size > 0) {
      mediaChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = async () => {
    try {
      const blob = new Blob(mediaChunks, { type: mediaChunks[0]?.type || 'audio/webm' });
      const base64 = await blobToBase64(blob);
      emit('recorded', base64);
    } catch (error) {
      uni.showToast({ title: 'H5 录音转换失败', icon: 'none' });
    } finally {
      if (mediaStream?.getTracks) {
        mediaStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
      mediaStream = null;
      mediaChunks = [];
      mediaRecorder = null;
    }
  };

  mediaRecorder.start();
}

async function start() {
  if (isPressing.value) return;
  isPressing.value = true;
  if (isH5) {
    try {
      await startH5Recorder();
      return;
    } catch (_error) {
      // H5 fallback to uni recorder if available
    }
  }

  try {
    initUniRecorder();
    recorder?.start({ format: 'mp3', duration: 120000 });
  } catch (error) {
    isPressing.value = false;
    uni.showToast({ title: '当前端暂不支持录音', icon: 'none' });
  }
}

function stop() {
  if (!isPressing.value) return;
  isPressing.value = false;
  if (isH5 && mediaRecorder?.state === 'recording') {
    mediaRecorder.stop();
    return;
  }
  recorder?.stop();
}

function startPress() {
  void start();
}

function endPress() {
  stop();
}
</script>

<style scoped>
.voice-btn {
  border: none;
  border-radius: 999rpx;
  background: #ffffff;
  color: #5a6787;
  border: 2rpx solid #e6ecff;
  font-weight: 600;
  font-size: 28rpx;
  height: 82rpx;
  line-height: 82rpx;
}

.voice-btn.block {
  width: 100%;
  background: #f4f7ff;
  border: 2rpx solid #dfe7ff;
  color: #fff;
  color: #4f5f82;
}

.voice-btn.pressing {
  background: #dde8ff;
  border-color: #c8d8ff;
  color: #405481;
}
</style>
