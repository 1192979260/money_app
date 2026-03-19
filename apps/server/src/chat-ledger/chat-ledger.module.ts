import { Module } from '@nestjs/common';
import { ChatLedgerController } from './chat-ledger.controller';
import { ChatLedgerService } from './chat-ledger.service';
import { OpenAiService } from '../common/openai.service';

@Module({
  controllers: [ChatLedgerController],
  providers: [ChatLedgerService, OpenAiService],
  exports: [ChatLedgerService]
})
export class ChatLedgerModule {}
