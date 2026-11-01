export interface RecipeShareTextInput {
  name: string;
  description?: string;
  /** Already-worded stats such as "Prep: 10 min", "Serves: 4". Empty entries are dropped. */
  meta: string[];
  /** Ingredient lines as shown on screen (scaled, unit-converted). `title` starts a new section. */
  ingredients: { text: string; title?: string }[];
  steps: { text: string; title?: string }[];
  notes: { title?: string; text: string }[];
  /** Section headings in the user's language. */
  labels: { ingredients: string; instructions: string; notes: string };
  /** Public share link, if the caller wants one included. */
  link?: string;
}

const clean = (s?: string) => (s ?? '').trim();

/**
 * Plain text version of a recipe for the system share sheet (Messages, WhatsApp, Notes, email...).
 * Sections with nothing in them are left out entirely, so a recipe without notes has no empty
 * "Notes" heading. Blank-only ingredient/step lines are skipped for the same reason.
 */
export function buildRecipeShareText(input: RecipeShareTextInput): string {
  const blocks: string[] = [clean(input.name)];

  const description = clean(input.description);
  if (description) blocks.push(description);

  const meta = input.meta.map(clean).filter(Boolean);
  if (meta.length) blocks.push(meta.join(' · '));

  const ingredientLines: string[] = [];
  for (const ing of input.ingredients) {
    const text = clean(ing.text);
    if (!text) continue;
    const title = clean(ing.title);
    if (title) ingredientLines.push(`${ingredientLines.length ? '\n' : ''}${title}`);
    ingredientLines.push(`• ${text}`);
  }
  if (ingredientLines.length) blocks.push([input.labels.ingredients, ...ingredientLines].join('\n'));

  const stepLines = input.steps
    .filter(step => clean(step.text))
    .map((step, i) => {
      const title = clean(step.title);
      return `${i + 1}. ${title ? `${title} — ` : ''}${clean(step.text)}`;
    });
  if (stepLines.length) blocks.push([input.labels.instructions, ...stepLines].join('\n'));

  const noteLines = input.notes
    .filter(n => clean(n.text))
    .map(n => (clean(n.title) ? `${clean(n.title)}: ${clean(n.text)}` : clean(n.text)));
  if (noteLines.length) blocks.push([input.labels.notes, ...noteLines].join('\n'));

  const link = clean(input.link);
  if (link) blocks.push(link);

  return blocks.join('\n\n');
}
