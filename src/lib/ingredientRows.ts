import type { RecipeIngredient } from '../types';

/** One ingredient line in the recipe editor. */
export interface IngredientRow {
  key: string;
  text: string;
  /** Set once the line has been parsed into quantity/unit/food; `text` is then a read-only preview. */
  parsed?: RecipeIngredient;
  /** Section heading shown above this row (e.g. "Sauce"). */
  title?: string;
  /** What steps use to point at this ingredient. Kept equal to `parsed.referenceId` when the row is parsed (on save, a parsed row writes its own, a plain row writes this one). */
  referenceId?: string;
}

/**
 * The editor's rows after the "parse ingredients" review. The review hands back one ingredient per line it
 * was given, but it lets the user reorder and remove them, so a result is matched to the row it came from by the
 * line's original text (the line exactly as it was sent; not by position). A matched row keeps its section title
 * and its reference id (so steps that point at it still do; the parser would otherwise give it a fresh id). Editing
 * a result's food, unit or note in the review does not change that text, so it still matches. A result with no
 * matching row (no original text) becomes a plain new row. Blank rows, including one that only has a section
 * title, are not sent to the review and are not carried over.
 */
export function applyParsedIngredients(
  rows: IngredientRow[],
  results: RecipeIngredient[],
  makeKey: () => string,
  preview: (ingredient: RecipeIngredient) => string,
): IngredientRow[] {
  const pool = rows.filter(r => r.text.trim()).map(row => ({ row, used: false }));
  return results.map(ing => {
    const wanted = (ing.originalText ?? '').trim();
    const hit = wanted ? pool.find(p => !p.used && p.row.text.trim() === wanted) : undefined;
    if (hit) hit.used = true;
    const referenceId = (hit && (hit.row.referenceId ?? hit.row.parsed?.referenceId)) ?? ing.referenceId;
    return {
      key: makeKey(),
      text: preview(ing),
      parsed: ing.disableAmount ? undefined : { ...ing, ...(referenceId ? { referenceId } : {}) },
      title: hit?.row.title,
      referenceId,
    };
  });
}
