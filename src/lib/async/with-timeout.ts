export class TimeoutError extends Error {
  timeoutMs: number;
  label?: string;

  constructor(timeoutMs: number, label?: string) {
    super(
      label
        ? `${label} timed out after ${timeoutMs}ms`
        : `Operation timed out after ${timeoutMs}ms`,
    );
    this.name = "TimeoutError";
    this.timeoutMs = timeoutMs;
    this.label = label;
  }
}

/**
 * Enveloppe un `Promise` avec un timeout "fail-fast" pour éviter qu'une route
 * SSR reste bloquée jusqu'au timeout plateforme (ex. 504 Vercel).
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label?: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new TimeoutError(timeoutMs, label)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

