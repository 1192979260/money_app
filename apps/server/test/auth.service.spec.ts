import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../src/auth/auth.service';

describe('AuthService', () => {
  const userUpsert = jest.fn();
  const userFindUnique = jest.fn();
  const userCreate = jest.fn();
  const userUpdate = jest.fn();
  const userDelete = jest.fn();
  const ledgerUpdateMany = jest.fn();
  const draftUpdateMany = jest.fn();
  const adviceUpdateMany = jest.fn();

  const tx = {
    user: {
      findUnique: userFindUnique,
      update: userUpdate,
      delete: userDelete
    },
    ledgerEntry: {
      updateMany: ledgerUpdateMany
    },
    conversationDraft: {
      updateMany: draftUpdateMany
    },
    adviceReport: {
      updateMany: adviceUpdateMany
    }
  };

  const prisma = {
    user: { upsert: userUpsert, findUnique: userFindUnique, create: userCreate },
    $transaction: jest.fn(async (callback: (inner: typeof tx) => unknown) => callback(tx))
  } as any;

  const jwtService = { sign: jest.fn(() => 'mock-token') } as unknown as JwtService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loginByWechatCode should return token when code2session succeeds', async () => {
    const config = new ConfigService({ WECHAT_APPID: 'wx-appid', WECHAT_APP_SECRET: 'wx-secret' });
    const service = new AuthService(prisma, jwtService, config);

    userUpsert.mockResolvedValue({ id: 'u1', displayName: 'wx-user' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ openid: 'openid-123' })
    } as never);

    const result = await service.loginByWechatCode('mock-code');

    expect(userUpsert).toHaveBeenCalled();
    expect(result.token).toBe('mock-token');
    expect(result.user.loginType).toBe('wechat');
  });

  it('loginByWechatCode should throw when wechat returns error code', async () => {
    const config = new ConfigService({ WECHAT_APPID: 'wx-appid', WECHAT_APP_SECRET: 'wx-secret' });
    const service = new AuthService(prisma, jwtService, config);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ errcode: 40029, errmsg: 'invalid code' })
    } as never);

    await expect(service.loginByWechatCode('bad-code')).rejects.toThrow(UnauthorizedException);
  });

  it('bindWechatToCurrentUser should bind openid to current user directly', async () => {
    const config = new ConfigService({ WECHAT_APPID: 'wx-appid', WECHAT_APP_SECRET: 'wx-secret' });
    const service = new AuthService(prisma, jwtService, config);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ openid: 'openid-1' })
    } as never);

    userFindUnique.mockResolvedValueOnce({ id: 'guest-1', deviceId: 'dev-1', displayName: '游客A' });
    userFindUnique.mockResolvedValueOnce(null);
    userUpdate.mockResolvedValue({ id: 'guest-1', displayName: '游客A', wechatOpenid: 'openid-1' });

    const result = await service.bindWechatToCurrentUser('guest-1', 'good-code');

    expect(userUpdate).toHaveBeenCalledWith({ where: { id: 'guest-1' }, data: { wechatOpenid: 'openid-1' } });
    expect(result.user.loginType).toBe('wechat');
  });

  it('bindWechatToCurrentUser should merge guest data into existed wechat user', async () => {
    const config = new ConfigService({ WECHAT_APPID: 'wx-appid', WECHAT_APP_SECRET: 'wx-secret' });
    const service = new AuthService(prisma, jwtService, config);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ openid: 'openid-2' })
    } as never);

    userFindUnique.mockResolvedValueOnce({ id: 'guest-2', deviceId: 'dev-2', displayName: '游客B' });
    userFindUnique.mockResolvedValueOnce({
      id: 'wx-2',
      deviceId: null,
      displayName: '微信用户',
      wechatOpenid: 'openid-2'
    });
    userUpdate.mockResolvedValue({ id: 'wx-2', deviceId: 'dev-2', displayName: '微信用户' });

    const result = await service.bindWechatToCurrentUser('guest-2', 'good-code');

    expect(ledgerUpdateMany).toHaveBeenCalledWith({ where: { userId: 'guest-2' }, data: { userId: 'wx-2' } });
    expect(draftUpdateMany).toHaveBeenCalledWith({ where: { userId: 'guest-2' }, data: { userId: 'wx-2' } });
    expect(adviceUpdateMany).toHaveBeenCalledWith({ where: { userId: 'guest-2' }, data: { userId: 'wx-2' } });
    expect(userDelete).toHaveBeenCalledWith({ where: { id: 'guest-2' } });
    expect(result.user.id).toBe('wx-2');
  });

  it('registerByPhone should create account user and return account token', async () => {
    const config = new ConfigService({});
    const service = new AuthService(prisma, jwtService, config);

    userFindUnique.mockResolvedValueOnce(null);
    userCreate.mockResolvedValueOnce({
      id: 'u-phone-1',
      displayName: '用户1234'
    });

    const result = await service.registerByPhone({
      phone: '13800138000',
      password: 'abcdef',
      displayName: '用户1234'
    });

    expect(userCreate).toHaveBeenCalled();
    expect(result.user.id).toBe('u-phone-1');
    expect(result.user.loginType).toBe('account');
  });

  it('loginByPhone should reject when password is invalid', async () => {
    const config = new ConfigService({});
    const service = new AuthService(prisma, jwtService, config);

    userFindUnique.mockResolvedValueOnce({
      id: 'u-phone-2',
      displayName: '用户',
      passwordHash: 'bad-format'
    });

    await expect(
      service.loginByPhone({
        phone: '13800138000',
        password: 'wrong'
      })
    ).rejects.toThrow(UnauthorizedException);
  });
});
