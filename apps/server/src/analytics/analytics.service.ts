import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async monthly(userId: string, year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1);

    const rows = await this.prisma.ledgerEntry.findMany({
      where: { userId, occurredAt: { gte: from, lt: to } }
    });

    const fixedExpense = this.sum(rows, 'fixed');
    const extraExpense = this.sum(rows, 'extra');
    const usageStats = this.sumByUsage(rows);

    return {
      year,
      month,
      fixedExpense,
      extraExpense,
      totalExpense: fixedExpense + extraExpense,
      totalIncome: this.sum(rows, 'income'),
      usageStats
    };
  }

  async yearly(userId: string, year: number) {
    const from = new Date(year, 0, 1);
    const to = new Date(year + 1, 0, 1);

    const rows = await this.prisma.ledgerEntry.findMany({
      where: { userId, occurredAt: { gte: from, lt: to } }
    });

    const yearIncome = this.sum(rows, 'income');
    const yearFixedExpense = this.sum(rows, 'fixed');
    const yearExtraExpense = this.sum(rows, 'extra');
    const usageStats = this.sumByUsage(rows);

    return {
      year,
      yearIncome,
      yearFixedExpense,
      yearExtraExpense,
      balance: yearIncome - (yearFixedExpense + yearExtraExpense),
      usageStats
    };
  }

  private sum(rows: Array<{ amount: { toNumber(): number }; majorType: string }>, majorType: string) {
    return rows
      .filter((row) => row.majorType === majorType)
      .reduce((acc, row) => acc + row.amount.toNumber(), 0);
  }

  private sumByUsage(rows: Array<{ amount: { toNumber(): number }; usageType: string }>) {
    const base = {
      family: 0,
      self: 0,
      child: 0,
      husband: 0,
      other: 0
    };
    return rows.reduce((acc, row) => {
      const key = row.usageType as keyof typeof base;
      if (key in acc) {
        acc[key] += row.amount.toNumber();
      }
      return acc;
    }, base);
  }
}
