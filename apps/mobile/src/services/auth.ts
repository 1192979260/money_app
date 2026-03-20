import type { AuthResult } from '@/types/api';
import { apiRequest } from './http';

const DEV_LOCKED_DEVICE_ID_DEFAULT = 'dev-1773970839136-dkshf7';

function resolveDeviceId() {
  const env = (import.meta as unknown as { env?: Record<string, string | boolean> }).env || {};
  const isDev = Boolean(env.DEV);
  const lockedId = String(env.VITE_DEV_DEVICE_ID || DEV_LOCKED_DEVICE_ID_DEFAULT).trim();

  if (isDev && lockedId) {
    uni.setStorageSync('deviceId', lockedId);
    return lockedId;
  }

  let deviceId = uni.getStorageSync('deviceId') as string | undefined;
  if (!deviceId) {
    deviceId = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    uni.setStorageSync('deviceId', deviceId);
  }
  return deviceId;
}

function saveAuth(result: AuthResult) {
  uni.setStorageSync('token', result.token);
  uni.setStorageSync('user', result.user);
}

export async function loginGuest() {
  const deviceId = resolveDeviceId();

  const result = await apiRequest<AuthResult>('/auth/guest', 'POST', {
    deviceId,
    displayName: '游客用户'
  });

  saveAuth(result);
  return result;
}

export async function bindWechat(code: string) {
  const result = await apiRequest<AuthResult>('/auth/wechat/bind', 'POST', { code });
  saveAuth(result);
  return result;
}

export async function loginWechat(code: string) {
  const result = await apiRequest<AuthResult>('/auth/wechat', 'POST', { code });
  saveAuth(result);
  return result;
}

export async function getWechatCode(): Promise<string> {
  const loginResult = await new Promise<UniApp.LoginRes>((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res) => resolve(res),
      fail: (err) => reject(err)
    });
  });
  if (!loginResult.code) {
    throw new Error('missing wechat code');
  }
  return loginResult.code;
}
