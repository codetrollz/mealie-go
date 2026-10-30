import type { ShoppingListItem } from '../types';

/**
 * Two items are duplicates only when they are the same thing:
 *   - a food item: same food AND same unit (so 1 lb + 1 cup is never summed), or
 *   - a free-text line with no food: identical text.
 * The note is NOT part of a food item's identity. It is free text, usually a prep
 * instruction ("chopped"), so grouping by it merged unrelated foods. A food or unit
 * that arrives without an id is identified by its name instead, and an item that has a
 * food never falls back to its note.
 */
export function mergeKey(item: ShoppingListItem): string | null {
  if (item.food) {
    const food = item.food.id ?? `name:${item.food.name.trim().toLowerCase()}`;
    const unit = item.unit ? (item.unit.id ?? `name:${item.unit.name.trim().toLowerCase()}`) : '';
    return `food:${food}|unit:${unit}`;
  }
  const text = (item.note ?? '').trim().toLowerCase();
  return text ? `text:${text}` : null;
}

export interface MergePlan {
  /** Items to delete: every member of a duplicate group except its first. */
  removedIds: string[];
  /** Keepers whose quantity must become the sum of their group. */
  quantityUpdates: { id: string; quantity: number }[];
}

/** Plans a merge over the unchecked items; the same plan drives the button count. */
export function planMerge(items: ShoppingListItem[]): MergePlan {
  const groups = new Map<string, ShoppingListItem[]>();
  for (const item of items) {
    if (item.checked) continue;
    const key = mergeKey(item);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  const removedIds: string[] = [];
  const quantityUpdates: MergePlan['quantityUpdates'] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const [keeper, ...rest] = group;
    rest.forEach(i => removedIds.push(i.id));
    // Quantities are added up for every kind of line (a manual "eggs" x2 and "eggs" x3 become 5),
    // never dropped with the deleted duplicates.
    const summed = group.reduce((sum, i) => sum + (i.quantity ?? 0), 0);
    if (summed > 0 && summed !== keeper.quantity) quantityUpdates.push({ id: keeper.id, quantity: summed });
  }
  return { removedIds, quantityUpdates };
}
