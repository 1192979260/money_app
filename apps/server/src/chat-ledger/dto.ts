import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class VoiceInputDto {
  @IsBoolean()
  @IsOptional()
  noisy?: boolean;
}

export class MessageInputDto {
  @IsOptional()
  @IsString()
  draftId?: string;

  @IsOptional()
  @IsString()
  mode?: 'ledger' | 'chat';

  @IsString()
  message!: string;
}

export class ConfirmInputDto {
  @IsString()
  draftId!: string;

  @IsString()
  rawText!: string;

  @IsString()
  source!: 'voice' | 'text';

  @IsOptional()
  @IsArray()
  conversationHistory?: Array<{ role: 'user' | 'assistant'; text: string }>;
}

export class VoicePayloadDto {
  @IsString()
  audioBase64!: string;

  @IsBoolean()
  @IsOptional()
  noisy?: boolean;
}

export class PatchDraftDto {
  @IsString()
  draftId!: string;

  @IsOptional()
  @IsArray()
  platformTags?: string[];

  @IsOptional()
  amount?: number;

  @IsOptional()
  @IsString()
  majorType?: 'fixed' | 'extra' | 'income';

  @IsOptional()
  @IsString()
  usageType?: 'family' | 'self' | 'child' | 'husband' | 'other';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  occurredAt?: string;

  @IsOptional()
  @IsBoolean()
  needRemark?: boolean;

  @IsOptional()
  @IsString()
  remark?: string;
}
