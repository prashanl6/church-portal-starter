export const PROCESS_AUDIENCES = ['public', 'steward'] as const;
export type ProcessAudience = (typeof PROCESS_AUDIENCES)[number];

export function isProcessAudience(value: unknown): value is ProcessAudience {
  return value === 'public' || value === 'steward';
}

export function parseProcessAudience(
  value: unknown,
  label = 'Audience'
): { ok: true; value: ProcessAudience } | { ok: false; error: string } {
  if (!isProcessAudience(value)) {
    return { ok: false, error: `${label} must be "public" or "steward"` };
  }
  return { ok: true, value };
}
