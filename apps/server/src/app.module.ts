import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ChatLedgerModule } from './chat-ledger/chat-ledger.module';
import { LedgerModule } from './ledger/ledger.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiAdviceModule } from './ai-advice/ai-advice.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ChatLedgerModule,
    LedgerModule,
    AnalyticsModule,
    AiAdviceModule
  ]
})
export class AppModule {}
