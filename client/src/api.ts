import type { Doc } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    // Nest error bodies look like { message, statusCode, ... }; surface the message.
    const body = await response.json().catch(() => null);
    const message = typeof body?.message === 'string' ? body.message : undefined;
    throw new ApiError(message ?? `Request to ${path} failed with status ${response.status}`, response.status);
  }

  return response.json();
}

export function fetchDocuments() {
  return request<Doc[]>('/documents');
}

export function createDocument(title: string) {
  return request<Doc>('/documents', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export function bulkDeleteDocuments(ids: string[]) {
  return request<{ success: boolean }>('/documents/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}
