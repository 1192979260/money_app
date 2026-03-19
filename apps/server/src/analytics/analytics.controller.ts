import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('monthly')
  async monthly(
    @CurrentUser() user: { userId: string },
    @Query('year') year: string,
    @Query('month') month: string
  ) {
    return this.service.monthly(user.userId, Number(year), Number(month));
  }

  @Get('yearly')
  async yearly(
    @CurrentUser() user: { userId: string },
    @Query('year') year: string
  ) {
    return this.service.yearly(user.userId, Number(year));
  }
}
