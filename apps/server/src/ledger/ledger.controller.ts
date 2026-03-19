import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('ledger')
export class LedgerController {
  constructor(private readonly service: LedgerService) {}

  @Get()
  async list(
    @CurrentUser() user: { userId: string },
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('flowType') flowType?: 'income' | 'expense',
    @Query('majorType') majorType?: 'fixed' | 'extra' | 'income',
    @Query('platform') platform?: string,
    @Query('usageType') usageType?: 'family' | 'self' | 'child' | 'husband' | 'other',
    @Query('keyword') keyword?: string
  ) {
    return this.service.listEntries(user.userId, {
      year,
      month,
      flowType,
      majorType,
      platform,
      usageType,
      keyword
    });
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string
  ) {
    return this.service.getEntryDetail(user.userId, id);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string
  ) {
    return this.service.deleteEntry(user.userId, id);
  }
}
