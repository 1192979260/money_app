import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ChatLedgerService } from './chat-ledger.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ConfirmInputDto, MessageInputDto, PatchDraftDto, VoicePayloadDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('chat-ledger')
export class ChatLedgerController {
  constructor(private readonly service: ChatLedgerService) {}

  @Post('start')
  async start(@CurrentUser() user: { userId: string }) {
    return this.service.startConversation(user.userId);
  }

  @Post('transcribe')
  async transcribe(@Body() dto: VoicePayloadDto) {
    return this.service.transcribeVoice(dto.audioBase64, !!dto.noisy);
  }

  @Post('message')
  async message(
    @CurrentUser() user: { userId: string },
    @Body() dto: MessageInputDto
  ) {
    return this.service.handleTextMessage(user.userId, dto.draftId, dto.message);
  }

  @Post('patch')
  async patch(
    @CurrentUser() user: { userId: string },
    @Body() dto: PatchDraftDto
  ) {
    return this.service.patchDraft(user.userId, dto);
  }

  @Post('confirm')
  async confirm(
    @CurrentUser() user: { userId: string },
    @Body() dto: ConfirmInputDto
  ) {
    return this.service.confirm(user.userId, dto);
  }
}
