import { moveItem } from '../reorder';

test('moves an item down and up, keeping the rest in order', () => {
  expect(moveItem(['a', 'b', 'c', 'd'], 1, 2)).toEqual(['a', 'c', 'b', 'd']);
  expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
  expect(moveItem(['a', 'b', 'c', 'd'], 0, 3)).toEqual(['b', 'c', 'd', 'a']);
});

test('does not change the original array', () => {
  const list = ['a', 'b', 'c'];
  moveItem(list, 0, 2);
  expect(list).toEqual(['a', 'b', 'c']);
});

test('no-op and out-of-range moves return the same array instance', () => {
  const list = ['a', 'b', 'c'];
  expect(moveItem(list, 1, 1)).toBe(list);
  expect(moveItem(list, 0, -1)).toBe(list);
  expect(moveItem(list, 2, 3)).toBe(list);
  expect(moveItem(list, 5, 0)).toBe(list);
  expect(moveItem([] as string[], 0, 0)).toEqual([]);
});
