import { z } from 'zod';
export const title = z.string().trim().min(1).max(160);
export const date = z.string().datetime().nullable().optional();
export const taskInput = z.object({
  title,
  description: z.string().max(20000).default(''),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  columnId: z.string().min(1),
  dueDate: date,
  assigneeIds: z.array(z.string()).max(30).default([]),
  labelIds: z.array(z.string()).max(20).default([]),
});
export const projectInput = z.object({
  name: title,
  description: z.string().max(3000).default(''),
  color: z
    .string()
    .regex(/^#[a-fA-F0-9]{6}$/)
    .default('#8b7cf8'),
  icon: z.enum(['Layers', 'Rocket', 'Compass', 'Code']).default('Layers'),
  status: z.enum(['Planning', 'In progress', 'On hold', 'Completed']).default('In progress'),
  startDate: date,
  dueDate: date,
  memberIds: z.array(z.string()).max(100).default([]),
});
export function canManage(role: string) {
  return role === 'OWNER' || role === 'ADMIN';
}
export function midpoint(before?: number, after?: number) {
  if (before !== undefined && after !== undefined) return (before + after) / 2;
  if (before !== undefined) return before + 1024;
  if (after !== undefined) return after - 1024;
  return 1024;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
