import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ChatLedgerService } from './chat-ledger.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ConfirmInputDto, MessageInputDto, PatchDraftDto, VoicePayloadDto } from './dto';
import type { Response } from 'express';

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
    return this.service.handleTextMessage(user.userId, dto.draftId, dto.message, dto.mode);
  }

  @Post('message/stream')
  async messageStream(
    @CurrentUser() user: { userId: string },
    @Body() dto: MessageInputDto,
    @Res() res: Response
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      const result = await this.service.streamLedgerAnalysisChat(
        user.userId,
        dto.message,
        (delta) => {
          res.write(`event: delta\ndata: ${JSON.stringify({ delta })}\n\n`);
        }
      );
      res.write(`event: done\ndata: ${JSON.stringify(result)}\n\n`);
    } catch (error) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: String(error) })}\n\n`);
    } finally {
      res.end();
    }
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
