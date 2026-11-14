export type Mutate = <T = unknown>(body: Record<string, unknown>) => Promise<T>;
export type Confirm = (
  value: { title: string; description: string; run: () => Promise<unknown> } | null,
) => void;
