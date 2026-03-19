import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BindWechatDto, GuestLoginDto, WechatLoginDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wechat')
  async wechatLogin(@Body() dto: WechatLoginDto) {
    return this.authService.loginByWechatCode(dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('wechat/bind')
  async bindWechat(
    @CurrentUser() user: { userId: string },
    @Body() dto: BindWechatDto
  ) {
    return this.authService.bindWechatToCurrentUser(user.userId, dto.code);
  }

  @Post('guest')
  async guestLogin(@Body() dto: GuestLoginDto) {
    return this.authService.loginGuest(dto);
  }
}
