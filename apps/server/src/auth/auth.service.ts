import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GuestLoginDto, PhoneLoginDto, PhoneRegisterDto } from './dto';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async loginByWechatCode(code: string) {
    if (!code?.trim()) {
      throw new UnauthorizedException('Missing wechat login code');
    }

    const openid = await this.resolveOpenidByCode(code.trim());
    if (!openid) {
      throw new UnauthorizedException('Invalid wechat code');
    }

    const user = await this.prisma.user.upsert({
      where: { wechatOpenid: openid },
      update: {},
      create: { wechatOpenid: openid }
    });

    return this.buildAuthResult(user.id, user.displayName, 'wechat');
  }

  async bindWechatToCurrentUser(currentUserId: string, code: string) {
    if (!code?.trim()) {
      throw new UnauthorizedException('Missing wechat bind code');
    }

    const openid = await this.resolveOpenidByCode(code.trim());
    if (!openid) {
      throw new UnauthorizedException('Invalid wechat code');
    }

    return this.prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({ where: { id: currentUserId } });
      if (!currentUser) {
        throw new UnauthorizedException('Current user not found');
      }

      const existedWechatUser = await tx.user.findUnique({
        where: { wechatOpenid: openid }
      });

      if (!existedWechatUser) {
        const boundUser = await tx.user.update({
          where: { id: currentUserId },
          data: { wechatOpenid: openid }
        });
        return this.buildAuthResult(boundUser.id, boundUser.displayName, 'wechat');
      }

      if (existedWechatUser.id === currentUserId) {
        return this.buildAuthResult(existedWechatUser.id, existedWechatUser.displayName, 'wechat');
      }

      await tx.ledgerEntry.updateMany({
        where: { userId: currentUserId },
        data: { userId: existedWechatUser.id }
      });
      await tx.conversationDraft.updateMany({
        where: { userId: currentUserId },
        data: { userId: existedWechatUser.id }
      });
      await tx.adviceReport.updateMany({
        where: { userId: currentUserId },
        data: { userId: existedWechatUser.id }
      });

      const mergedUser = await tx.user.update({
        where: { id: existedWechatUser.id },
        data: {
          displayName: existedWechatUser.displayName || currentUser.displayName || undefined,
          deviceId: existedWechatUser.deviceId || currentUser.deviceId || undefined
        }
      });

      await tx.user.delete({ where: { id: currentUserId } });

      return this.buildAuthResult(mergedUser.id, mergedUser.displayName, 'wechat');
    });
  }

  async loginGuest(dto: GuestLoginDto) {
    const user = await this.prisma.user.upsert({
      where: { deviceId: dto.deviceId },
      update: { displayName: dto.displayName },
      create: {
        deviceId: dto.deviceId,
        displayName: dto.displayName ?? '游客'
      }
    });

    return this.buildAuthResult(user.id, user.displayName, 'guest');
  }

  async registerByPhone(dto: PhoneRegisterDto) {
    const phone = this.normalizePhone(dto.phone);
    const password = dto.password?.trim();
    if (!password || password.length < 6) {
      throw new BadRequestException('Password should be at least 6 chars');
    }

    const existed = await this.prisma.user.findUnique({ where: { phone } });
    if (existed) {
      throw new BadRequestException('Phone already registered');
    }

    const user = await this.prisma.user.create({
      data: {
        phone,
        passwordHash: this.hashPassword(password),
        displayName: dto.displayName?.trim() || `用户${phone.slice(-4)}`
      }
    });

    return this.buildAuthResult(user.id, user.displayName, 'account');
  }

  async loginByPhone(dto: PhoneLoginDto) {
    const phone = this.normalizePhone(dto.phone);
    const password = dto.password?.trim();
    if (!password) {
      throw new UnauthorizedException('Invalid phone or password');
    }

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user?.passwordHash || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid phone or password');
    }

    return this.buildAuthResult(user.id, user.displayName, 'account');
  }

  private signToken(userId: string): string {
    return this.jwtService.sign({ sub: userId });
  }

  private buildAuthResult(userId: string, displayName: string | null, loginType: 'wechat' | 'guest' | 'account') {
    return {
      token: this.signToken(userId),
      user: {
        id: userId,
        displayName,
        loginType
      }
    };
  }

  private normalizePhone(phone: string) {
    const normalized = String(phone || '').replace(/\s+/g, '');
    if (!/^1\d{10}$/.test(normalized)) {
      throw new BadRequestException('Invalid phone number');
    }
    return normalized;
  }

  private hashPassword(raw: string) {
    const salt = randomBytes(16).toString('hex');
    const digest = scryptSync(raw, salt, 64).toString('hex');
    return `${salt}:${digest}`;
  }

  private verifyPassword(raw: string, encoded: string) {
    const [salt, digest] = String(encoded || '').split(':');
    if (!salt || !digest) return false;
    const actual = scryptSync(raw, salt, 64);
    const expected = Buffer.from(digest, 'hex');
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  }

  private async resolveOpenidByCode(code: string): Promise<string | null> {
    const appid = this.configService.get<string>('WECHAT_APPID');
    const secret = this.configService.get<string>('WECHAT_APP_SECRET');
    if (!appid || !secret) {
      this.logger.error('Missing WECHAT_APPID or WECHAT_APP_SECRET');
      return null;
    }

    const endpoint = this.configService.get<string>(
      'WECHAT_CODE2SESSION_URL',
      'https://api.weixin.qq.com/sns/jscode2session'
    );
    const url = `${endpoint}?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) {
        this.logger.warn(`code2session HTTP error: ${response.status}`);
        return null;
      }

      const json = (await response.json()) as {
        openid?: string;
        session_key?: string;
        errcode?: number;
        errmsg?: string;
      };

      if (json.errcode) {
        this.logger.warn(`code2session error: ${json.errcode} ${json.errmsg ?? ''}`);
        return null;
      }

      return json.openid ?? null;
    } catch (error) {
      this.logger.error(`code2session request failed: ${String(error)}`);
      return null;
    }
  }
}
