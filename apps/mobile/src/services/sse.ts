import { getApiBase, getAuthToken } from './http';

export async function postSse(
  path: string,
  body: Record<string, unknown>,
  handlers: {
    onDelta: (delta: string) => void;
    onDone?: (payload: Record<string, unknown>) => void;
    onError?: (message: string) => void;
  }
) {
  if (typeof fetch === 'undefined' || typeof TextDecoder === 'undefined') {
    throw new Error('当前环境不支持流式请求');
  }

  const token = getAuthToken();
  const resp = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok || !resp.body) {
    throw new Error(`Stream request failed: ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf('\n\n');
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      parseSseBlock(block, handlers);
      boundary = buffer.indexOf('\n\n');
    }
  }
}

function parseSseBlock(
  block: string,
  handlers: {
    onDelta: (delta: string) => void;
    onDone?: (payload: Record<string, unknown>) => void;
    onError?: (message: string) => void;
  }
) {
  const lines = block.split('\n');
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (!dataLines.length) return;
  const raw = dataLines.join('\n');
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(raw);
  } catch (_error) {
    payload = { message: raw };
  }

  if (event === 'delta') {
    const delta = String(payload.delta || '');
    if (delta) handlers.onDelta(delta);
    return;
  }
  if (event === 'done') {
    handlers.onDone?.(payload);
    return;
  }
  if (event === 'error') {
    handlers.onError?.(String(payload.message || '流式请求失败'));
  }
}
