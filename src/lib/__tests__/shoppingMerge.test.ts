import { mergeKey, planMerge } from '../shoppingMerge';
import type { ShoppingListItem } from '../../types';

let n = 0;
const item = (o: Partial<ShoppingListItem> & { foodId?: string; unitId?: string }): ShoppingListItem => {
  const { foodId, unitId, ...rest } = o;
  return {
    id: `i${++n}`, shoppingListId: 'l', checked: false, position: 0, isFood: !!foodId,
    food: foodId ? { id: foodId, name: foodId } : undefined,
    unit: unitId ? { id: unitId, name: unitId } : undefined,
    ...rest,
  } as ShoppingListItem;
};

test('the reported bug: different foods that share a note are not duplicates', () => {
  const items = [
    item({ foodId: 'sausage', unitId: 'lb', quantity: 1, note: 'for Pasta E Fagioli' }),
    item({ foodId: 'onion', quantity: 4, note: 'for Pasta E Fagioli' }),
    item({ foodId: 'celery', quantity: 4, note: 'for Pasta E Fagioli' }),
    item({ foodId: 'onion2', quantity: 1, note: 'chopped' }),
    item({ foodId: 'parsley', quantity: 1, note: 'chopped' }),
  ];
  expect(planMerge(items)).toEqual({ removedIds: [], quantityUpdates: [] });
});

test('same food and same unit: one keeper with the summed quantity, the rest removed', () => {
  const a = item({ foodId: 'onion', quantity: 1 });
  const b = item({ foodId: 'onion', quantity: 2 });
  const c = item({ foodId: 'onion', quantity: 1.5, note: 'diced' });
  expect(planMerge([a, b, c])).toEqual({
    removedIds: [b.id, c.id],
    quantityUpdates: [{ id: a.id, quantity: 4.5 }],
  });
});

test('the note does not matter for a food item: "sliced" and "diced" onions are one food', () => {
  const a = item({ foodId: 'onion', quantity: 1, note: 'sliced' });
  const b = item({ foodId: 'onion', quantity: 1, note: 'diced' });
  expect(planMerge([a, b]).removedIds).toEqual([b.id]);
});

test('same food in different units is never summed', () => {
  const lb = item({ foodId: 'beef', unitId: 'lb', quantity: 1 });
  const cup = item({ foodId: 'beef', unitId: 'cup', quantity: 1 });
  expect(planMerge([lb, cup])).toEqual({ removedIds: [], quantityUpdates: [] });
});

test('identical text-only lines collapse to one, with their quantities added', () => {
  const a = item({ note: 'eggs', quantity: 2 });
  const b = item({ note: ' Eggs ', quantity: 3 });
  const other = item({ note: 'paper towels', quantity: 1 });
  expect(planMerge([a, b, other])).toEqual({ removedIds: [b.id], quantityUpdates: [{ id: a.id, quantity: 5 }] });
});

test('text lines with no quantity just collapse', () => {
  const a = item({ note: 'Brussels sprouts, 1 1/2 lb' });
  const b = item({ note: 'brussels sprouts, 1 1/2 lb' });
  expect(planMerge([a, b])).toEqual({ removedIds: [b.id], quantityUpdates: [] });
});

test('a food without an id is identified by name and never falls back to its note', () => {
  const mk = (name: string, note: string) =>
    ({ id: `n${++n}`, shoppingListId: 'l', checked: false, position: 0, isFood: true, quantity: 1, note, food: { name } } as ShoppingListItem);
  const sausage = mk('sausage', 'for Pasta E Fagioli');
  const onion = mk('onion', 'for Pasta E Fagioli');
  expect(planMerge([sausage, onion])).toEqual({ removedIds: [], quantityUpdates: [] });
  const onion2 = mk('Onion ', 'diced');
  expect(planMerge([onion, onion2]).removedIds).toEqual([onion2.id]);
});

test('a unit without an id is identified by name, so lb and cup are not summed', () => {
  const mk = (unit: string) =>
    ({ id: `u${++n}`, shoppingListId: 'l', checked: false, position: 0, isFood: true, quantity: 1, food: { id: 'beef', name: 'beef' }, unit: { name: unit } } as ShoppingListItem);
  expect(planMerge([mk('lb'), mk('cup')])).toEqual({ removedIds: [], quantityUpdates: [] });
  const [a, b] = [mk('lb'), mk('LB')];
  expect(planMerge([a, b]).removedIds).toEqual([b.id]);
});

test('a food item with an empty note is keyed by its food', () => {
  const a = item({ foodId: 'onion', quantity: 1, note: '' });
  const b = item({ foodId: 'onion', quantity: 1, note: '' });
  expect(planMerge([a, b]).removedIds).toEqual([b.id]);
});

test('checked items are left alone', () => {
  const a = item({ foodId: 'onion', quantity: 1 });
  const b = item({ foodId: 'onion', quantity: 1, checked: true });
  expect(planMerge([a, b])).toEqual({ removedIds: [], quantityUpdates: [] });
});

test('items with nothing to identify them are skipped', () => {
  const blank = item({ note: '   ' });
  const none = item({});
  expect(mergeKey(blank)).toBeNull();
  expect(planMerge([blank, none])).toEqual({ removedIds: [], quantityUpdates: [] });
});

test('a keeper that already has the summed quantity is not updated', () => {
  const a = item({ foodId: 'egg', quantity: 3 });
  const b = item({ foodId: 'egg' });
  expect(planMerge([a, b])).toEqual({ removedIds: [b.id], quantityUpdates: [] });
});
