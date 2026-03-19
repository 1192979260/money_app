import type { AuthResult } from '@/types/api';
import { apiRequest } from './http';

function saveAuth(result: AuthResult) {
  uni.setStorageSync('token', result.token);
  uni.setStorageSync('user', result.user);
}

export async function loginGuest() {
  let deviceId = uni.getStorageSync('deviceId') as string | undefined;
  if (!deviceId) {
    deviceId = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    uni.setStorageSync('deviceId', deviceId);
  }

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
