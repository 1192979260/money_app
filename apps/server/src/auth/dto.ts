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

export class PhoneRegisterDto {
  @IsString()
  phone!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}

export class PhoneLoginDto {
  @IsString()
  phone!: string;

  @IsString()
  password!: string;
}
