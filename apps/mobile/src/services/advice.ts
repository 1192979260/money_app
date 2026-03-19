import { apiRequest } from './http';

export async function generateAdvice(periodType: 'month' | 'year', periodKey: string) {
  return apiRequest<{ adviceText: string; createdAt: string }>('/ai-advice/generate', 'POST', {
    periodType,
    periodKey
  });
}
