import { Injectable, NotFoundException } from '@nestjs/common';
import { MajorType, UsageType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface LedgerQuery {
  year?: string;
  month?: string;
  flowType?: 'income' | 'expense';
  majorType?: 'fixed' | 'extra' | 'income';
  platform?: string;
  usageType?: 'family' | 'self' | 'child' | 'husband' | 'other';
  keyword?: string;
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async listEntries(userId: string, query: LedgerQuery) {
    const where: Record<string, unknown> = { userId };

    if (query.flowType === 'income') {
      where.majorType = 'income';
    } else if (query.flowType === 'expense') {
      where.majorType = { in: ['fixed', 'extra'] };
    }

    if (query.majorType) where.majorType = query.majorType as MajorType;
    if (query.usageType) where.usageType = query.usageType as UsageType;
    if (query.platform) where.platformTags = { has: query.platform };
    if (query.keyword) {
      where.OR = [
        { reason: { contains: query.keyword, mode: 'insensitive' } },
        { note: { contains: query.keyword, mode: 'insensitive' } },
        { rawText: { contains: query.keyword, mode: 'insensitive' } }
      ];
    }

    if (query.year) {
      const month = query.month ? Number(query.month) - 1 : 0;
      const from = new Date(Number(query.year), month, 1);
      const to = query.month
        ? new Date(Number(query.year), Number(query.month), 1)
        : new Date(Number(query.year) + 1, 0, 1);
      where.occurredAt = { gte: from, lt: to };
    }

    const list = await this.prisma.ledgerEntry.findMany({
      where,
      orderBy: { occurredAt: 'desc' }
    });

    return list.map((entry) => ({
      ...entry,
      amount: Number(entry.amount),
      occurredAt: entry.occurredAt.toISOString(),
      createdAt: entry.createdAt.toISOString()
    }));
  }

  async getEntryDetail(userId: string, entryId: string) {
    const entry = await this.prisma.ledgerEntry.findUnique({
      where: { id: entryId }
    });
    if (!entry || entry.userId !== userId) {
      throw new NotFoundException('Ledger entry not found');
    }

    return {
      ...entry,
      amount: Number(entry.amount),
      occurredAt: entry.occurredAt.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      conversationHistory: Array.isArray(entry.conversationHistory) ? entry.conversationHistory : []
    };
  }

  async deleteEntry(userId: string, entryId: string) {
    const entry = await this.prisma.ledgerEntry.findUnique({
      where: { id: entryId }
    });
    if (!entry || entry.userId !== userId) {
      throw new NotFoundException('Ledger entry not found');
    }

    await this.prisma.ledgerEntry.delete({
      where: { id: entryId }
    });

    return { success: true };
  }
}
