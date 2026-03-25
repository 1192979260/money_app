import { apiRequest } from './http';
import { postSse } from './sse';

export async function generateAdvice(periodType: 'month' | 'year', periodKey: string) {
  return apiRequest<{ adviceText: string; createdAt: string }>('/ai-advice/generate', 'POST', {
    periodType,
    periodKey
  });
}

export async function getLatestAdvice() {
  return apiRequest<{
    id: string;
    periodType: 'month' | 'year';
    periodKey: string;
    adviceText: string;
    createdAt: string;
  } | null>('/ai-advice/latest', 'GET');
}

export async function generateAdviceStream(
  periodType: 'month' | 'year',
  periodKey: string,
  onDelta: (delta: string) => void
) {
  let finalPayload: { adviceText: string; createdAt: string } | null = null;
  await postSse('/ai-advice/generate/stream', { periodType, periodKey }, {
    onDelta,
    onDone: (payload) => {
      finalPayload = payload as unknown as { adviceText: string; createdAt: string };
    },
    onError: (msg) => {
      throw new Error(msg);
    }
  });
  return finalPayload;
}
