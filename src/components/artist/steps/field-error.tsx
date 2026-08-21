'use client';

/**
 * Inline field error.
 *
 * WCAG 2.2 3.3.1 wants errors identified in text, not by colour alone, and tied
 * to the field they describe. Each instance takes an `id` the input points at
 * through aria-describedby. role="alert" means the message gets announced when
 * it appears instead of merely being visible.
 */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="app-field-error">
      {message}
    </p>
  );
}

/**
 * Merges client-side issues with server-returned ones.
 *
 * Client issues win. They're the fresher judgement about what's in the field
 * right now. Otherwise a stale server error from the last submit sits under a
 * field the artist already fixed.
 */
export function mergeIssues(
  local: Record<string, string>,
  server: Record<string, string>,
): Record<string, string> {
  return { ...server, ...local };
}
