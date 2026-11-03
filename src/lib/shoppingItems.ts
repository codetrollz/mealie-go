import type { ShoppingListItem } from '../types';

/** The text to show for an item: Mealie's own `display`, else the typed note, else the food name; empty text counts as missing. */
export function itemLabel(item: ShoppingListItem): string | undefined {
  return item.display?.trim() || item.note?.trim() || item.food?.name || undefined;
}

/**
 * What changed on a list after creating or updating items. Mealie 3.x answers `POST` and `PUT`
 * on /api/households/shopping/items with a wrapper (ShoppingListItemsCollectionOut) holding these
 * three arrays, NOT with the item itself; older servers answered with the item.
 */
export interface ShoppingItemChanges {
  createdItems: ShoppingListItem[];
  updatedItems: ShoppingListItem[];
  deletedItems: ShoppingListItem[];
}

const items = (v: unknown): ShoppingListItem[] =>
  Array.isArray(v) ? (v.filter(x => x && typeof x === 'object' && typeof (x as any).id === 'string') as ShoppingListItem[]) : [];

/**
 * Reads either reply shape. A plain item (older servers) counts as `created` after a POST and as
 * `updated` after a PUT, which is what `kind` says. Anything else (an empty or unexpected body)
 * means "no changes reported", so the caller falls back to what it already knows.
 */
export function normalizeItemChanges(response: unknown, kind: 'created' | 'updated'): ShoppingItemChanges {
  const none: ShoppingItemChanges = { createdItems: [], updatedItems: [], deletedItems: [] };
  if (!response || typeof response !== 'object') return none;
  const r = response as Record<string, unknown>;
  if ('createdItems' in r || 'updatedItems' in r || 'deletedItems' in r) {
    return { createdItems: items(r.createdItems), updatedItems: items(r.updatedItems), deletedItems: items(r.deletedItems) };
  }
  if (typeof r.id === 'string') {
    return kind === 'created'
      ? { ...none, createdItems: [r as unknown as ShoppingListItem] }
      : { ...none, updatedItems: [r as unknown as ShoppingListItem] };
  }
  return none;
}

/**
 * The list's items after applying `changes`: deleted ones go, updated ones replace the item with the
 * same id (Mealie merges a repeated entry into the existing line and reports it as updated), created ones
 * are appended unless already present.
 */
export function applyItemChanges(list: ShoppingListItem[], changes: ShoppingItemChanges): ShoppingListItem[] {
  const deleted = new Set(changes.deletedItems.map(i => i.id));
  const updated = new Map(changes.updatedItems.map(i => [i.id, i]));
  const next = list.filter(i => !deleted.has(i.id)).map(i => updated.get(i.id) ?? i);
  const known = new Set(next.map(i => i.id));
  for (const created of changes.createdItems) {
    if (!known.has(created.id)) {
      next.push(created);
      known.add(created.id);
    }
  }
  return next;
}
