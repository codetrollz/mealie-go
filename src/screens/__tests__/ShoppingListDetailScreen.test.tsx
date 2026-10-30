import React from 'react';
import { screen } from '@testing-library/react-native';
import ShoppingListDetailScreen from '../ShoppingListDetailScreen';
import { renderScreen } from '../../testing/render';
import { api } from '../../lib/mealieApi';

jest.mock('../../lib/mealieApi', () => ({
  api: { getShoppingList: jest.fn(), getShoppingLabels: jest.fn(), getMealPlans: jest.fn(), getRecipes: jest.fn() },
}));

const row = (id: string, display: string, labelId?: string, checked = false) => ({
  id, shoppingListId: 'l', checked, position: 0, isFood: true, display, labelId,
});
const nav: any = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn(), addListener: () => () => {} };
const route: any = { key: 'r', name: 'ShoppingListDetail', params: { listId: 'l', listName: 'Weekly' } };

beforeEach(() => {
  (api.getShoppingList as jest.Mock).mockResolvedValue({
    id: 'l', name: 'Weekly', groupId: 'g', householdId: 'h',
    listItems: [
      row('1', '2 onions', 'produce'), row('2', '1 lb stew beef', 'meat'),
      row('3', '1 cup sour cream', 'dairy'), row('4', 'Flour'), row('5', 'paper towels', 'gone'),
    ],
  });
});

test('items are grouped under their label, in label order, with unlabelled ones last', async () => {
  (api.getShoppingLabels as jest.Mock).mockResolvedValue({
    items: [
      { id: 'meat', name: 'Meat', groupId: 'g', householdId: 'h' },
      { id: 'produce', name: 'Produce', groupId: 'g', householdId: 'h' },
      { id: 'dairy', name: 'Dairy', groupId: 'g', householdId: 'h' },
    ],
  });
  await renderScreen(<ShoppingListDetailScreen navigation={nav} route={route} />);
  const headers = await screen.findAllByText(/^(Meat|Produce|Dairy)$/i);
  expect(headers.map(h => String(h.props.children).toLowerCase())).toEqual(['meat', 'produce', 'dairy']);
  expect(screen.getByText('2 onions')).toBeTruthy();
  // an item whose label was deleted is still on the list
  expect(screen.getByText('paper towels')).toBeTruthy();
  expect(screen.getByText('Flour')).toBeTruthy();
});

test('when labels cannot be loaded the list still shows every item, ungrouped', async () => {
  (api.getShoppingLabels as jest.Mock).mockRejectedValue(new Error('not found'));
  await renderScreen(<ShoppingListDetailScreen navigation={nav} route={route} />);
  expect(await screen.findByText('2 onions')).toBeTruthy();
  expect(screen.queryByText(/^Produce$/i)).toBeNull();
  expect(screen.getByText('paper towels')).toBeTruthy();
});
