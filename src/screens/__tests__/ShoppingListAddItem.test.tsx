import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import ShoppingListDetailScreen from '../ShoppingListDetailScreen';
import { renderScreen } from '../../testing/render';

// The REAL api module here; only the network is faked, and it answers the way Mealie 3.29 does.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => (key.includes('proxy') ? null : 'https://mealie.test')),
  setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));

const nav: any = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn(), addListener: () => () => {} };
const route: any = { key: 'r', name: 'ShoppingListDetail', params: { listId: 'l', listName: 'Weekly' } };

type Item = Record<string, unknown>;
let server: { items: Item[]; calls: { method: string; path: string; body?: any }[] };

const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });

function mealie3(method: string, path: string, body?: any) {
  server.calls.push({ method, path, body });
  if (method === 'GET' && path.startsWith('/api/households/shopping/lists/l')) {
    return json({ id: 'l', name: 'Weekly', groupId: 'g', householdId: 'h', listItems: server.items, labelSettings: [] });
  }
  if (method === 'GET' && path.startsWith('/api/groups/labels')) return json({ items: [], total_pages: 1 });
  if (method === 'GET' && path.startsWith('/api/households/shopping/lists')) return json({ items: [], total_pages: 1 });
  if (method === 'POST' && path === '/api/households/shopping/items') {
    const same = server.items.find(i => i.note === body.note && !i.checked);
    if (same) {                                     // Mealie merges a repeated entry into the existing line
      same.quantity = (same.quantity as number) + 1;
      same.display = `${same.quantity} ${same.note}`;
      return json({ createdItems: [], updatedItems: [same], deletedItems: [] }, 201);
    }
    const created = { id: `new-${server.items.length + 1}`, shoppingListId: body.shoppingListId, note: body.note, quantity: 1,
      display: `1 ${body.note}`, checked: false, position: server.items.length, labelId: body.labelId ?? null };
    server.items.push(created);
    return json({ createdItems: [created], updatedItems: [], deletedItems: [] }, 201);
  }
  if (method === 'PUT' && path.startsWith('/api/households/shopping/items/')) {
    const item = server.items.find(i => i.id === path.split('/').pop())!;
    Object.assign(item, body);
    return json({ createdItems: [], updatedItems: [item], deletedItems: [] });
  }
  throw new Error(`unhandled ${method} ${path}`);
}

beforeEach(async () => {
  await AsyncStorage.setItem('mealie_go.server_url', 'https://mealie.test');
  await AsyncStorage.setItem('mealie_go.auth_token', 'token');
  server = { items: [{ id: 'old1', shoppingListId: 'l', note: 'flour', display: '1 flour', quantity: 1, checked: false, position: 0, isFood: false }], calls: [] };
  (global as any).fetch = jest.fn(async (url: string, init: any = {}) =>
    mealie3(init.method ?? 'GET', url.replace('https://mealie.test', ''), init.body ? JSON.parse(init.body) : undefined));
});

const addByTyping = async (text: string) => {
  await fireEvent.changeText(screen.getByPlaceholderText('Add item…'), text);
  await fireEvent.press(screen.getByText('Add'));
};

test('typing an item and adding it shows what was typed, not the word "Item"', async () => {
  await renderScreen(<ShoppingListDetailScreen navigation={nav} route={route} />);
  expect(await screen.findByText('1 flour')).toBeTruthy();
  await addByTyping('paper towels');
  expect(await screen.findByText('1 paper towels')).toBeTruthy();
  expect(screen.queryByText('Item')).toBeNull();
  const post = server.calls.find(c => c.method === 'POST')!;
  expect(post.body).toMatchObject({ note: 'paper towels', shoppingListId: 'l', isFood: false });
});

test('adding the same text again updates that line instead of adding a blank row', async () => {
  await renderScreen(<ShoppingListDetailScreen navigation={nav} route={route} />);
  await screen.findByText('1 flour');
  await addByTyping('flour');
  expect(await screen.findByText('2 flour')).toBeTruthy();
  expect(screen.queryByText('1 flour')).toBeNull();
  expect(screen.queryByText('Item')).toBeNull();
  expect(screen.getAllByText(/flour/)).toHaveLength(1);
});

test('checking an item off keeps its text and marks it done', async () => {
  await renderScreen(<ShoppingListDetailScreen navigation={nav} route={route} />);
  await fireEvent.press(await screen.findByText('1 flour'));
  await waitFor(() => expect(screen.getByText('✓')).toBeTruthy());
  expect(screen.getByText('1 flour')).toBeTruthy();
  expect(screen.queryByText('Item')).toBeNull();
  await fireEvent.press(screen.getByText('1 flour'));                          // and back
  await waitFor(() => expect(screen.queryByText('✓')).toBeNull());
  expect(screen.getByText('1 flour')).toBeTruthy();
});

test('an item the server sends with an empty display still shows its note', async () => {
  server.items.push({ id: 'odd', shoppingListId: 'l', note: 'batteries', display: '', quantity: 1, checked: false, position: 1, isFood: false });
  await renderScreen(<ShoppingListDetailScreen navigation={nav} route={route} />);
  expect(await screen.findByText('batteries')).toBeTruthy();
});

test('a failed check-off is shown to the user and the row stays as it was', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderScreen(<ShoppingListDetailScreen navigation={nav} route={route} />);
  await screen.findByText('1 flour');
  const real = (global as any).fetch;
  (global as any).fetch = jest.fn(async (url: string, init: any = {}) =>
    (init.method === 'PUT' ? { ok: false, status: 500, statusText: 'x', json: async () => ({}), text: async () => 'server exploded' } : real(url, init)));
  await fireEvent.press(screen.getByText('1 flour'));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Error', '500: server exploded'));
  expect(screen.queryByText('✓')).toBeNull();
  expect(screen.getByText('1 flour')).toBeTruthy();
});
