import { apiRequest } from './http';
import type { LedgerEntry } from '@/types/api';

export async function fetchLedger(params: Record<string, string>) {
  const query = Object.entries(params)
    .filter(([, value]) => value)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return apiRequest<Array<LedgerEntry>>(`/ledger${query ? `?${query}` : ''}`);
}

export async function fetchLedgerDetail(id: string) {
  return apiRequest<LedgerEntry>(`/ledger/${encodeURIComponent(id)}`);
}

export async function deleteLedgerEntry(id: string) {
  return apiRequest<{ success: boolean }>(`/ledger/${encodeURIComponent(id)}`, 'DELETE');
}
