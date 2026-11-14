import { Layers, Compass, Rocket, Code, type LucideIcon } from 'lucide-react';
export const icons: Record<string, LucideIcon> = { Layers, Compass, Rocket, Code };
export const short = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
export const date = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
export const inputDate = (value: string | null) => value?.slice(0, 10) || '';
export const iso = (value: FormDataEntryValue | null) =>
  value ? new Date(String(value) + 'T12:00:00').toISOString() : null;
