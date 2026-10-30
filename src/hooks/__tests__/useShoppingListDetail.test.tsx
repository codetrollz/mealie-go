import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useShoppingListDetail } from '../useShoppingLists';
import { api } from '../../lib/mealieApi';

jest.mock('../../lib/mealieApi', () => ({
  api: {
    getShoppingList: jest.fn(), getShoppingLabels: jest.fn(), updateShoppingItem: jest.fn(), deleteShoppingItem: jest.fn(),
  },
}));

const row = (id: string, food: string, quantity: number, note?: string, unit = 'lb') => ({
  id, shoppingListId: 'l', checked: false, position: 0, isFood: true, quantity, note,
  food: { id: food, name: food }, unit: { id: unit, name: unit },
});

beforeEach(() => {
  jest.clearAllMocks();
  (api.getShoppingLabels as jest.Mock).mockResolvedValue({ items: [] });
  (api.updateShoppingItem as jest.Mock).mockResolvedValue({});
  (api.deleteShoppingItem as jest.Mock).mockResolvedValue(undefined);
});

async function load(items: ReturnType<typeof row>[]) {
  (api.getShoppingList as jest.Mock).mockResolvedValue({ id: 'l', name: 'L', listItems: items });
  const hook = await renderHook(() => useShoppingListDetail('l'));
  await waitFor(() => expect(hook.result.current.list).not.toBeNull());
  return hook;
}

test('a shared note no longer makes the app offer, or perform, a merge', async () => {
  const { result } = await load([
    row('a', 'sausage', 1, 'for Pasta E Fagioli'), row('b', 'onion', 4, 'for Pasta E Fagioli'), row('c', 'celery', 4, 'for Pasta E Fagioli'),
  ]);
  expect(result.current.duplicateCount).toBe(0);
  let removed: number | undefined;
  await act(async () => { removed = await result.current.mergeDuplicates(); });
  expect(removed).toBe(0);
  expect(api.updateShoppingItem).not.toHaveBeenCalled();
  expect(api.deleteShoppingItem).not.toHaveBeenCalled();
});

test('true duplicates are merged: quantity summed onto the first, the others deleted, count matches', async () => {
  const { result } = await load([row('a', 'onion', 1), row('b', 'onion', 2), row('c', 'beef', 1)]);
  expect(result.current.duplicateCount).toBe(1);
  // What the server holds after the merge, returned by the re-read that follows it.
  (api.getShoppingList as jest.Mock).mockResolvedValue({ id: 'l', name: 'L', listItems: [row('a', 'onion', 3), row('c', 'beef', 1)] });
  let removed: number | undefined;
  await act(async () => { removed = await result.current.mergeDuplicates(); });
  expect(removed).toBe(1);
  expect(api.updateShoppingItem).toHaveBeenCalledWith('a', expect.objectContaining({ id: 'a', quantity: 3 }));
  expect(api.deleteShoppingItem).toHaveBeenCalledTimes(1);
  expect(api.deleteShoppingItem).toHaveBeenCalledWith('b');
  expect(result.current.list!.listItems.map(i => i.id)).toEqual(['a', 'c']);
  expect(result.current.list!.listItems[0].quantity).toBe(3);
  expect(result.current.duplicateCount).toBe(0);
});

test('a failed update deletes nothing, re-reads the list and reports the error', async () => {
  const { result } = await load([row('a', 'onion', 1), row('b', 'onion', 2)]);
  (api.updateShoppingItem as jest.Mock).mockRejectedValueOnce(new Error('network down'));
  const reads = (api.getShoppingList as jest.Mock).mock.calls.length;
  await act(async () => { await expect(result.current.mergeDuplicates()).rejects.toThrow('network down'); });
  expect(api.deleteShoppingItem).not.toHaveBeenCalled();
  expect((api.getShoppingList as jest.Mock).mock.calls.length).toBeGreaterThan(reads);
});

test('after a successful merge the list is re-read so the shown text is the server\'s', async () => {
  const { result } = await load([row('a', 'onion', 1), row('b', 'onion', 2)]);
  const reads = (api.getShoppingList as jest.Mock).mock.calls.length;
  await act(async () => { await result.current.mergeDuplicates(); });
  expect((api.getShoppingList as jest.Mock).mock.calls.length).toBeGreaterThan(reads);
});
