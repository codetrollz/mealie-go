import { applyItemChanges, itemLabel, normalizeItemChanges } from '../shoppingItems';
import type { ShoppingListItem } from '../../types';

const item = (id: string, over: Partial<ShoppingListItem> = {}): ShoppingListItem =>
  ({ id, shoppingListId: 'l', checked: false, position: 0, isFood: false, ...over } as ShoppingListItem);

// What Mealie 3.29 really answered to adding "paper towels" (ids shortened).
const MEALIE_3_CREATED = {
  createdItems: [{ quantity: 1.0, note: 'paper towels', display: '1 paper towels', shoppingListId: 'l', checked: false, position: 0, labelId: null, id: 'new1' }],
  updatedItems: [], deletedItems: [],
};

describe('normalizeItemChanges', () => {
  test('reads the Mealie 3 wrapper', () => {
    const c = normalizeItemChanges(MEALIE_3_CREATED, 'created');
    expect(c.createdItems.map(i => [i.id, i.display])).toEqual([['new1', '1 paper towels']]);
    expect(c.updatedItems).toEqual([]);
  });

  test('a wrapper with missing or null arrays is still a wrapper', () => {
    expect(normalizeItemChanges({ updatedItems: [{ id: 'a' }] }, 'created')).toEqual({ createdItems: [], updatedItems: [{ id: 'a' }], deletedItems: [] });
    expect(normalizeItemChanges({ createdItems: null, updatedItems: 'x', deletedItems: undefined }, 'created'))
      .toEqual({ createdItems: [], updatedItems: [], deletedItems: [] });
  });

  test('an older server answers with the item itself: created after a POST, updated after a PUT', () => {
    const plain = { id: 'a', note: 'milk', display: 'milk' };
    expect(normalizeItemChanges(plain, 'created')).toEqual({ createdItems: [plain], updatedItems: [], deletedItems: [] });
    expect(normalizeItemChanges(plain, 'updated')).toEqual({ createdItems: [], updatedItems: [plain], deletedItems: [] });
  });

  test('empty, null and unexpected replies mean no reported changes, never a crash', () => {
    const none = { createdItems: [], updatedItems: [], deletedItems: [] };
    for (const reply of [null, undefined, '', 'ok', 5, [], {}, { detail: 'nope' }]) {
      expect(normalizeItemChanges(reply, 'created')).toEqual(none);
    }
  });

  test('entries without an id are dropped rather than put on the list', () => {
    const c = normalizeItemChanges({ createdItems: [{ note: 'no id' }, null, 5, { id: 'ok' }], updatedItems: [], deletedItems: [] }, 'created');
    expect(c.createdItems).toEqual([{ id: 'ok' }]);
  });
});

describe('applyItemChanges', () => {
  const none = { createdItems: [], updatedItems: [], deletedItems: [] };

  test('a created item is appended with its text, in the reply it came with', () => {
    const next = applyItemChanges([item('a', { display: 'flour' })], normalizeItemChanges(MEALIE_3_CREATED, 'created'));
    expect(next.map(i => i.id)).toEqual(['a', 'new1']);
    expect(next[1].display).toBe('1 paper towels');
  });

  test('adding text already on the list: Mealie merges it into that line and reports it as updated, so no second row appears', () => {
    const merged = { ...item('a', { note: 'paper towels', display: '2 paper towels', quantity: 2 }) };
    const next = applyItemChanges([item('a', { note: 'paper towels', display: '1 paper towels', quantity: 1 }), item('b')],
      { ...none, updatedItems: [merged] });
    expect(next.map(i => i.id)).toEqual(['a', 'b']);
    expect(next[0].display).toBe('2 paper towels');
  });

  test('deleted items go; the other items keep their order and identity', () => {
    const list = [item('a'), item('b'), item('c')];
    const next = applyItemChanges(list, { ...none, deletedItems: [item('b')] });
    expect(next.map(i => i.id)).toEqual(['a', 'c']);
    expect(next[0]).toBe(list[0]);
  });

  test('a created item that is already on the list is not added twice', () => {
    const next = applyItemChanges([item('new1')], { ...none, createdItems: [item('new1'), item('new1')] });
    expect(next.map(i => i.id)).toEqual(['new1']);
  });

  test('the original array is not changed', () => {
    const list = [item('a')];
    applyItemChanges(list, { ...none, createdItems: [item('b')], deletedItems: [item('a')] });
    expect(list.map(i => i.id)).toEqual(['a']);
  });

  test('an update that leaves out fields keeps them on the row (merged, not swapped in)', () => {
    const rich = item('a', { note: 'chicken', display: '1 lb chicken', food: { id: 'f', name: 'chicken' } as any,
      label: { id: 'meat', name: 'Meat' }, labelId: 'meat', recipeReferences: [{ id: 'r1' } as any], checked: false });
    const next = applyItemChanges([rich], { ...none, updatedItems: [{ id: 'a', checked: true, display: '1 lb chicken' } as any] });
    expect(next[0]).toMatchObject({ checked: true, food: { name: 'chicken' }, label: { name: 'Meat' }, labelId: 'meat' });
    expect(next[0].recipeReferences).toHaveLength(1);
  });

  test('checking an item off that Mealie merged into a duplicate: the checked item is deleted and the other is updated', () => {
    const list = [item('a', { display: '1 milk', quantity: 1 }), item('b', { display: '1 milk', quantity: 1, checked: true })];
    const next = applyItemChanges(list, { ...none, deletedItems: [item('b')], updatedItems: [item('a', { display: '2 milk', quantity: 2 })] });
    expect(next.map(i => [i.id, i.display])).toEqual([['a', '2 milk']]);
  });

  test('updates for items that are not on the list are ignored, not added', () => {
    expect(applyItemChanges([item('a')], { ...none, updatedItems: [item('zzz')] }).map(i => i.id)).toEqual(['a']);
  });

  test('no changes returns an equal list', () => {
    const list = [item('a'), item('b')];
    expect(applyItemChanges(list, none)).toEqual(list);
  });
});

describe('itemLabel', () => {
  test('uses display, then the typed note, then the food name', () => {
    expect(itemLabel(item('a', { display: '1 milk', note: 'milk' }))).toBe('1 milk');
    expect(itemLabel(item('a', { note: 'milk' }))).toBe('milk');
    expect(itemLabel(item('a', { food: { id: 'f', name: 'butter' } as any }))).toBe('butter');
  });

  test('empty or blank text counts as missing instead of showing a blank row', () => {
    expect(itemLabel(item('a', { display: '', note: 'paper towels' }))).toBe('paper towels');
    expect(itemLabel(item('a', { display: '   ', note: '  ', food: { id: 'f', name: 'butter' } as any }))).toBe('butter');
    expect(itemLabel(item('a', { display: '', note: '' }))).toBeUndefined();
  });
});
