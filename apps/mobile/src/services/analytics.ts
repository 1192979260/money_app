import { apiRequest } from './http';

export async function fetchMonthly(year: number, month: number) {
  return apiRequest<Record<string, number>>(`/analytics/monthly?year=${year}&month=${month}`);
}

export async function fetchYearly(year: number) {
  return apiRequest<Record<string, number>>(`/analytics/yearly?year=${year}`);
}
