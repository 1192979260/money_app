import { defineStore } from 'pinia';
import { bindWechat, getWechatCode, loginGuest, loginWechat } from '@/services/auth';

interface UserState {
  token: string;
  userId: string;
  displayName: string;
  loginType: 'guest' | 'wechat';
}

function loadLocalUser() {
  return (uni.getStorageSync('user') || {}) as {
    id?: string;
    displayName?: string;
    loginType?: 'guest' | 'wechat';
  };
}

function isMpWeixinPlatform() {
  return process.env.UNI_PLATFORM === 'mp-weixin';
}

export const useUserStore = defineStore('user', {
  state: (): UserState => {
    const localUser = loadLocalUser();
    return {
      token: uni.getStorageSync('token') || '',
      userId: localUser.id || '',
      displayName: localUser.displayName || '游客用户',
      loginType: localUser.loginType || 'guest'
    };
  },
  actions: {
    applyAuth(result: { token: string; user: { id: string; displayName?: string; loginType: 'guest' | 'wechat' } }) {
      this.token = result.token;
      this.userId = result.user.id;
      this.displayName = result.user.displayName || '游客用户';
      this.loginType = result.user.loginType;
    },

    async ensureLogin() {
      if (this.token) return;
      if (isMpWeixinPlatform()) {
        try {
          const code = await getWechatCode();
          const result = await loginWechat(code);
          this.applyAuth(result);
          uni.setStorageSync('authAutoMode', 'wechat');
          return;
        } catch (_error) {
          uni.setStorageSync('authAutoMode', 'guest_fallback');
        }
      }

      const guestResult = await loginGuest();
      this.applyAuth(guestResult);
    },

    async bindWechatByCode(code: string) {
      const result = await bindWechat(code);
      this.applyAuth(result);
      return result;
    },

    logout() {
      uni.removeStorageSync('token');
      uni.removeStorageSync('user');
      this.token = '';
      this.userId = '';
      this.displayName = '游客用户';
      this.loginType = 'guest';
    }
  }
});
