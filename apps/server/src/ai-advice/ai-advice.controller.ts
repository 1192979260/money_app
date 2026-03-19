import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AiAdviceService } from './ai-advice.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { GenerateAdviceDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('ai-advice')
export class AiAdviceController {
  constructor(private readonly service: AiAdviceService) {}

  @Post('generate')
  async generate(
    @CurrentUser() user: { userId: string },
    @Body() dto: GenerateAdviceDto
  ) {
    return this.service.generate(user.userId, dto.periodType, dto.periodKey);
  }
}
