import { IsOptional, IsString } from 'class-validator';

export class WechatLoginDto {
  @IsString()
  code!: string;
}

export class BindWechatDto {
  @IsString()
  code!: string;
}

export class GuestLoginDto {
  @IsString()
  deviceId!: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}
