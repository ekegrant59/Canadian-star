/**
 * The shape every Server Action returns.
 *
 * Actions return a result instead of throwing, so a form can render an error
 * without an error boundary eating the page. Only redirect() and the
 * framework's own control-flow throws are exempt.
 *
 * `fieldErrors` carries per-field messages a form attaches to its inputs. It
 * gets populated for AUTHORIZED callers and nobody else. Hand field-level
 * detail to an anonymous request and you've leaked the schema shape.
 */
export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function actionOk(): ActionResult<undefined>;
export function actionOk<T>(data: T): ActionResult<T>;
export function actionOk<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function actionError(
  error: string,
  fieldErrors?: Record<string, string>,
): ActionResult<never> {
  return { ok: false, error, ...(fieldErrors ? { fieldErrors } : {}) };
}

/**
 * Flattens Zod issues into one message per field.
 *
 * Keeps only the FIRST issue per field. A form shows one message under an
 * input; three concatenated together read as noise.
 */
export function fieldErrorsFromZod(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || '_form';
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}

/** Generic copy for a failure whose detail must not reach the client. */
export const GENERIC_ERROR = 'Something went wrong. Please try again.';
