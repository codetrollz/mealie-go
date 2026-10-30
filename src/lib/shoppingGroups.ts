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

// Mealie seeds the A-Z order in the database, so which comparison produced it depends on the
// database (SQLite sorts by code point, so "Produce" comes before "alcohol"; others ignore case or
// use locale rules). A list counts as default if it is sorted under any of them.
const SORTED_BY: ((a: string, b: string) => boolean)[] = [
  (a, b) => a <= b,
  (a, b) => a.toLowerCase() <= b.toLowerCase(),
  (a, b) => a.localeCompare(b) <= 0,
];

/**
 * True when the saved section order is just A-Z by label name, which is what Mealie seeds every new
 * list with (it has no global order), so it says nothing about what the user wants. With fewer than
 * three labelled settings there is no order to speak of, so that counts as default too.
 */
export function isDefaultLabelOrder(labels: ShoppingLabel[], settings?: ShoppingListLabelSetting[]): boolean {
  if (!settings?.length) return true;
  const name = new Map(labels.map(l => [l.id, l.name]));
  const named = [...settings]
    .sort((a, b) => a.position - b.position)
    .map(s => name.get(s.labelId) ?? s.label?.name)
    .filter((n): n is string => !!n);
  if (named.length < 3) return true;
  return SORTED_BY.some(sorted => named.every((n, i) => i === 0 || sorted(named[i - 1], n)));
}

type ListRef = { id: string; updatedAt?: string; createdAt?: string; labelSettings?: ShoppingListLabelSetting[] };

/**
 * For a list still in the default A-Z order: the label settings of the most recently updated other
 * list that has a custom order (at most `limit` lists are looked at), or undefined. Mealie only bumps
 * a list's updatedAt when the list itself changes, so this is the newest touched list with a custom
 * order, not strictly the one reordered last. Labels are shared across lists, so those positions
 * apply to this list's labels directly. The list index already carries each list's label settings;
 * the detail request is only a fallback for servers that leave them out. A list that fails to load
 * is skipped, and any other failure just means no fallback.
 */
export async function findBorrowedLabelSettings(
  currentId: string,
  labels: ShoppingLabel[],
  getLists: () => Promise<{ items: ListRef[] }>,
  getList: (id: string) => Promise<{ labelSettings?: ShoppingListLabelSetting[] }>,
  limit = 5,
): Promise<ShoppingListLabelSetting[] | undefined> {
  try {
    const when = (l: ListRef) => l.updatedAt ?? l.createdAt ?? '';
    const others = (await getLists()).items
      .filter(l => l.id !== currentId)
      .sort((a, b) => (when(a) < when(b) ? 1 : when(a) > when(b) ? -1 : 0))
      .slice(0, limit);
    for (const other of others) {
      try {
        const settings = other.labelSettings ?? (await getList(other.id)).labelSettings;
        if (settings?.length && !isDefaultLabelOrder(labels, settings)) return settings;
      } catch {
        // skip a list that fails to load
      }
    }
  } catch {
    // no fallback
  }
  return undefined;
}
