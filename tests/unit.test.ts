import { describe, it, expect } from 'vitest';
import { taskInput, projectInput, canManage, midpoint } from '../lib/validation';
import { safeFile } from '../lib/storage';
describe('Validated boundaries', () => {
  it('rejects blank titles, invalid priorities and dates', () => {
    for (const data of [
      { title: ' ', columnId: 'x' },
      { title: 'OK', columnId: 'x', priority: 'Critical' },
      { title: 'OK', columnId: 'x', dueDate: 'yesterday' },
    ])
      expect(taskInput.safeParse(data).success).toBe(false);
  });
  it('normalizes titles and supplies defaults', () => {
    expect(taskInput.parse({ title: '  Ship it  ', columnId: 'c' })).toMatchObject({
      title: 'Ship it',
      priority: 'Medium',
      assigneeIds: [],
      labelIds: [],
    });
  });
  it('rejects CSS injection and oversized descriptions', () => {
    expect(projectInput.safeParse({ name: 'test', color: 'url(https://evil)' }).success).toBe(
      false,
    );
    expect(
      taskInput.safeParse({ title: 'test', columnId: 'c', description: 'x'.repeat(20001) }).success,
    ).toBe(false);
  });
  it('only owners and admins manage workspaces', () => {
    expect(['OWNER', 'ADMIN', 'MEMBER', 'guest', ''].map(canManage)).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
  });
  it('places cards at start, between and end', () => {
    expect(midpoint()).toBe(1024);
    expect(midpoint(undefined, 1024)).toBe(0);
    expect(midpoint(1024, 2048)).toBe(1536);
    expect(midpoint(2048)).toBe(3072);
  });
  it('rejects HTML/SVG and mismatched binary uploads', () => {
    expect(safeFile('evil.svg', Buffer.from('<svg/>'))).toBe(false);
    expect(safeFile('fake.png', Buffer.from('<script>'))).toBe(false);
    expect(safeFile('note.txt', Buffer.from('Hello'))).toBe(true);
    expect(safeFile('note.txt', Buffer.from([0, 1]))).toBe(false);
  });
});
