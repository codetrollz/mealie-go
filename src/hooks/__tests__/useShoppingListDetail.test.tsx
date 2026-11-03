import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useShoppingListDetail } from '../useShoppingLists';
import { api } from '../../lib/mealieApi';

jest.mock('../../lib/mealieApi', () => ({
  api: {
    getShoppingList: jest.fn(), getShoppingLists: jest.fn(), getShoppingLabels: jest.fn(), updateShoppingItem: jest.fn(), deleteShoppingItem: jest.fn(),
    addShoppingItem: jest.fn(),
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

describe('section order fallback', () => {
  const lab = (id: string, name: string) => ({ id, groupId: 'g', householdId: 'h', name });
  const labels = [lab('d', 'Dairy'), lab('m', 'Meat'), lab('p', 'Produce')];
  const st = (labelId: string, position: number) => ({ id: `s${labelId}`, shoppingListId: 'x', labelId, position });
  const azSettings = [st('d', 0), st('m', 1), st('p', 2)];
  const mine = [st('p', 0), st('m', 1), st('d', 2)];

  function setup(current: unknown[], others: unknown[] = [{ id: 'l' }, { id: 'nov2', updatedAt: '2026-10-30' }]) {
    (api.getShoppingLabels as jest.Mock).mockResolvedValue({ items: labels });
    (api.getShoppingLists as jest.Mock).mockResolvedValue({ items: others });
    (api.getShoppingList as jest.Mock).mockImplementation(async (id: string) =>
      id === 'nov2' ? { id, listItems: [], labelSettings: mine } : { id, name: 'L', listItems: [], labelSettings: current });
    return renderHook(() => useShoppingListDetail('l'));
  }

  test('a list still in A-Z order borrows the order of the latest customised list', async () => {
    const { result } = await setup(azSettings);
    await waitFor(() => expect(result.current.labelSettings).toBe(mine));
  });

  test('a list with its own custom order keeps it and fetches nothing else', async () => {
    const own = [st('m', 0), st('d', 1), st('p', 2)];
    const { result } = await setup(own);
    await waitFor(() => expect(result.current.list).not.toBeNull());
    expect(result.current.labelSettings).toBe(own);
    expect(api.getShoppingLists).not.toHaveBeenCalled();
  });

  test('while nothing better is found the list shows its own A-Z settings', async () => {
    const { result } = await setup(azSettings, [{ id: 'l' }]);
    await waitFor(() => expect(api.getShoppingLists).toHaveBeenCalled());
    await waitFor(() => expect(result.current.list).not.toBeNull());
    await act(async () => { await Promise.resolve(); });   // let the borrow lookup settle
    expect(result.current.labelSettings).toBe(azSettings);
  });

  test('once the open list gets its own custom order the borrowed one is dropped', async () => {
    const own = [st('m', 0), st('d', 1), st('p', 2)];
    const { result } = await setup(azSettings);
    await waitFor(() => expect(result.current.labelSettings).toBe(mine));
    (api.getShoppingList as jest.Mock).mockImplementation(async (id: string) => ({ id, name: 'L', listItems: [], labelSettings: own }));
    await act(async () => { await result.current.refresh(); });
    await waitFor(() => expect(result.current.labelSettings).toBe(own));
  });
});


describe('adding and checking off items', () => {
  const none = { createdItems: [], updatedItems: [], deletedItems: [] };
  const plain = (id: string, over = {}) => ({ id, shoppingListId: 'l', checked: false, position: 0, isFood: false, note: id, display: `1 ${id}`, ...over });

  test('an added item appears with its own text', async () => {
    const { result } = await load([]);
    (api.addShoppingItem as jest.Mock).mockResolvedValue({ ...none, createdItems: [plain('paper towels')] });
    await act(async () => { await result.current.addItem('paper towels'); });
    expect(api.addShoppingItem).toHaveBeenCalledWith('l', 'paper towels', undefined, undefined);
    expect(result.current.list!.listItems.map(i => i.display)).toEqual(['1 paper towels']);
  });

  test('text that Mealie merged into an existing line updates that line and adds nothing', async () => {
    const { result } = await load([plain('flour') as any]);
    (api.addShoppingItem as jest.Mock).mockResolvedValue({ ...none, updatedItems: [plain('flour', { display: '2 flour', quantity: 2 })] });
    await act(async () => { await result.current.addItem('flour'); });
    expect(result.current.list!.listItems.map(i => [i.id, i.display])).toEqual([['flour', '2 flour']]);
  });

  test('a reply that reports nothing leaves the list as it was (no blank row, no crash)', async () => {
    const { result } = await load([plain('flour') as any]);
    (api.addShoppingItem as jest.Mock).mockResolvedValue(none);
    await act(async () => { await result.current.addItem('anything'); });
    expect(result.current.list!.listItems.map(i => i.id)).toEqual(['flour']);
  });

  test('checking an item off uses what the server reports', async () => {
    const { result } = await load([plain('a') as any, plain('b') as any]);
    (api.updateShoppingItem as jest.Mock).mockResolvedValue({ ...none, updatedItems: [plain('a', { checked: true, display: '1 a (server)' })] });
    await act(async () => { await result.current.toggleItem(result.current.list!.listItems[0]); });
    expect(result.current.list!.listItems.map(i => [i.id, i.checked, i.display])).toEqual([['a', true, '1 a (server)'], ['b', false, '1 b']]);
    expect(api.updateShoppingItem).toHaveBeenCalledWith('a', expect.objectContaining({ id: 'a', checked: true }));
  });

  test('if the server does not say the item was updated, the change that was asked for is shown', async () => {
    const { result } = await load([plain('a') as any]);
    (api.updateShoppingItem as jest.Mock).mockResolvedValue(none);
    await act(async () => { await result.current.toggleItem(result.current.list!.listItems[0]); });
    expect(result.current.list!.listItems[0]).toMatchObject({ id: 'a', checked: true, display: '1 a' });
    await act(async () => { await result.current.toggleItem(result.current.list!.listItems[0]); });
    expect(result.current.list!.listItems[0].checked).toBe(false);
  });

  test('a failed add or toggle changes nothing and the error reaches the caller', async () => {
    const { result } = await load([plain('a') as any]);
    (api.addShoppingItem as jest.Mock).mockRejectedValue(new Error('500: boom'));
    await expect(act(async () => { await result.current.addItem('x'); })).rejects.toThrow('boom');
    (api.updateShoppingItem as jest.Mock).mockRejectedValue(new Error('500: boom'));
    await expect(act(async () => { await result.current.toggleItem(result.current.list!.listItems[0]); })).rejects.toThrow('boom');
    expect(result.current.list!.listItems.map(i => [i.id, i.checked])).toEqual([['a', false]]);
  });
});
