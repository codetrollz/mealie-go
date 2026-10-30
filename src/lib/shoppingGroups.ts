import type { ShoppingLabel, ShoppingListItem, ShoppingListLabelSetting } from '../types';

export type GroupedSection = { label: ShoppingLabel | null; items: ShoppingListItem[] };

/**
 * Splits items into one section per label (in the order the labels are given), with a final
 * unlabelled section. With no labels at all it is a single unlabelled section.
 * An item whose labelId matches none of the labels (for instance one deleted since) goes into
 * the unlabelled section rather than disappearing from the list.
 */
export function groupByLabel(items: ShoppingListItem[], labels: ShoppingLabel[]): GroupedSection[] {
  if (labels.length === 0) return [{ label: null, items }];
  const known = new Set(labels.map(l => l.id));
  const byLabel = new Map<string, ShoppingListItem[]>();
  const unlabelled: ShoppingListItem[] = [];
  for (const item of items) {
    if (item.labelId && known.has(item.labelId)) {
      byLabel.set(item.labelId, [...(byLabel.get(item.labelId) ?? []), item]);
    } else {
      unlabelled.push(item);
    }
  }
  const groups: GroupedSection[] = [];
  for (const label of labels) {
    const group = byLabel.get(label.id);
    if (group?.length) groups.push({ label, items: group });
  }
  if (unlabelled.length) groups.push({ label: null, items: unlabelled });
  return groups;
}

/**
 * Labels in the order this list's owner set in Mealie (its per-list label settings, lowest position
 * first). A label with no setting keeps its original relative order, after the ones that have one.
 */
export function orderLabels(labels: ShoppingLabel[], settings?: ShoppingListLabelSetting[]): ShoppingLabel[] {
  if (!settings?.length) return labels;
  const position = new Map(settings.map(s => [s.labelId, s.position]));
  return labels
    .map((label, i) => ({ label, i }))
    .sort((a, b) => {
      const pa = position.get(a.label.id), pb = position.get(b.label.id);
      if (pa !== undefined && pb !== undefined) return pa - pb || a.i - b.i;
      if (pa !== undefined) return -1;
      if (pb !== undefined) return 1;
      return a.i - b.i;
    })
    .map(x => x.label);
}
