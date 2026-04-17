import type { ApiResult } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function resolveUrl(path: string): string {
  if (!API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

export async function parseJsonResult<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiResult<T>;

  if (typeof payload?.code !== 'number') {
    throw new Error('服务端返回了无法识别的响应');
  }

  if (payload.code !== 200) {
    throw new Error(payload.message || '请求失败');
  }

  return payload.data;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveUrl(path), init);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('服务端返回了非 JSON 数据');
  }

  return parseJsonResult<T>(response);
}

export function createFormData(values: Record<string, string | File>): FormData {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

export function extractFileName(response: Response, fallback: string): string {
  const disposition = response.headers.get('content-disposition') || '';
  const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    return decodeURIComponent(encodedMatch[1]);
  }

  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || fallback;
}

export async function streamSSE(
  url: string,
  body: object,
  options: {
    onToken: (token: string) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  const response = await fetch(resolveUrl(url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    await parseJsonResult<unknown>(response);
    throw new Error('流式接口没有返回事件流');
  }

  if (!response.body) {
    throw new Error('浏览器未返回流式响应');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const eventBlock = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const data = eventBlock
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');

      if (data) {
        options.onToken(data.replace(/\\n/g, '\n').replace(/\\r/g, '\r'));
      }

      boundary = buffer.indexOf('\n\n');
    }
  }

  const tail = buffer.trim();
  if (tail.startsWith('data:')) {
    const data = tail
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');

    if (data) {
      options.onToken(data.replace(/\\n/g, '\n').replace(/\\r/g, '\r'));
    }
  }
}
