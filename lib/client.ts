'use client';
import { createAuthClient } from 'better-auth/react';
export const authClient = createAuthClient();
export async function request<T>(body: Record<string, unknown>): Promise<T> {
  const r = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}
