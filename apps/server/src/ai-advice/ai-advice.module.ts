import { Module } from '@nestjs/common';
import { AiAdviceController } from './ai-advice.controller';
import { AiAdviceService } from './ai-advice.service';
import { OpenAiService } from '../common/openai.service';

@Module({
  controllers: [AiAdviceController],
  providers: [AiAdviceService, OpenAiService]
})
export class AiAdviceModule {}
