import { Injectable } from '@nestjs/common';
import { OpenAiService } from '../common/openai.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiAdviceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiService: OpenAiService
  ) {}

  async generate(userId: string, periodType: 'month' | 'year', periodKey: string) {
    const snapshot = await this.buildSnapshot(userId, periodType, periodKey);
    const advice = await this.openAiService.generateAdvice(snapshot, periodType === 'month' ? '月度' : '年度');

    const report = await this.prisma.adviceReport.create({
      data: {
        userId,
        periodType,
        periodKey,
        inputSnapshot: snapshot,
        adviceText: advice
      }
    });

    return {
      id: report.id,
      periodType: report.periodType,
      periodKey: report.periodKey,
      adviceText: report.adviceText,
      createdAt: report.createdAt.toISOString()
    };
  }

  private async buildSnapshot(userId: string, periodType: 'month' | 'year', periodKey: string) {
    if (periodType === 'year') {
      const year = Number(periodKey);
      const from = new Date(year, 0, 1);
      const to = new Date(year + 1, 0, 1);
      const entries = await this.prisma.ledgerEntry.findMany({ where: { userId, occurredAt: { gte: from, lt: to } } });
      return JSON.stringify(entries.map((entry) => ({ ...entry, amount: Number(entry.amount) })));
    }

    const [yearText, monthText] = periodKey.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1);
    const entries = await this.prisma.ledgerEntry.findMany({ where: { userId, occurredAt: { gte: from, lt: to } } });
    return JSON.stringify(entries.map((entry) => ({ ...entry, amount: Number(entry.amount) })));
  }
}
