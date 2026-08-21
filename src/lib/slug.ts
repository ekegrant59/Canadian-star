/**
 * Slug generation for public artist profile URLs (§4.3).
 *
 * Slugs come from user input and end up in a path, so anything that isn't a
 * safe URL segment gets stripped, not escaped. A slug that needs encoding to be
 * safe will eventually get rendered unencoded somewhere.
 */

const MAX_SLUG_LENGTH = 80;

/**
 * Converts an act name into a URL segment.
 *
 * NFKD plus stripping combining marks folds accented Latin to its base form,
 * so "Zoë Léger" comes out "zoe-leger" instead of losing both characters. Names
 * in scripts with no Latin equivalent reduce to empty; the caller handles that.
 */
export function slugify(input: string): string {
  return (
    input
      .normalize('NFKD')
      // Combining diacritical marks, left behind by NFKD.
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, MAX_SLUG_LENGTH)
      // A trailing hyphen can reappear after the slice.
      .replace(/-+$/g, '')
  );
}

/**
 * Builds a unique slug given the ones already taken.
 *
 * The caller supplies existing slugs from one indexed query. This is a
 * convenience, NOT the uniqueness guarantee. `artists_slug_idx` is a unique
 * index; a check-then-insert race gets resolved by catching that violation,
 * never by trusting this function.
 */
export function uniqueSlug(base: string, taken: ReadonlySet<string>, fallback: string): string {
  const root = slugify(base) || slugify(fallback) || 'artist';

  if (!taken.has(root)) return root;

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${root}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  // Pathological case: 1000 acts sharing a name. Fall through to something
  // guaranteed unique instead of looping forever.
  return `${root}-${Date.now().toString(36)}`;
}
