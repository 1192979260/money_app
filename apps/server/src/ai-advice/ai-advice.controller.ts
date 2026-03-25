import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { AiAdviceService } from './ai-advice.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { GenerateAdviceDto } from './dto';
import type { Response } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('ai-advice')
export class AiAdviceController {
  constructor(private readonly service: AiAdviceService) {}

  @Get('latest')
  async latest(@CurrentUser() user: { userId: string }) {
    return this.service.latest(user.userId);
  }

  @Post('generate')
  async generate(
    @CurrentUser() user: { userId: string },
    @Body() dto: GenerateAdviceDto
  ) {
    return this.service.generate(user.userId, dto.periodType, dto.periodKey);
  }

  @Post('generate/stream')
  async generateStream(
    @CurrentUser() user: { userId: string },
    @Body() dto: GenerateAdviceDto,
    @Res() res: Response
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      const result = await this.service.streamGenerate(
        user.userId,
        dto.periodType,
        dto.periodKey,
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
}
