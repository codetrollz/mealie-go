import React from 'react';
import MealPlanScreen from '../../screens/MealPlanScreen';
import RecipesScreen from '../../screens/RecipesScreen';
import RecipeDetailScreen from '../../screens/RecipeDetailScreen';
import RecipeEditScreen from '../../screens/RecipeEditScreen';
import ShoppingListsScreen from '../../screens/ShoppingListsScreen';
import ShoppingListDetailScreen from '../../screens/ShoppingListDetailScreen';
import CookbooksScreen from '../../screens/CookbooksScreen';
import SettingsScreen from '../../screens/SettingsScreen';
import WelcomeScreen from '../../screens/WelcomeScreen';
import RecipeSuggestionsScreen from '../../screens/RecipeSuggestionsScreen';
import { shoot, clickText } from './shoot';
import * as f from './fixtures';
import { api } from '../../lib/mealieApi';

// One screenshot per screen. Names get a "-dark" suffix for now; the theme work
// adds the light variant of each.
const nav: any = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, replace: jest.fn(), popTo: jest.fn(), getParent: () => undefined };
const route = (params: object, name = 'Screen'): any => ({ key: name, name, params });
const SCHEME = process.env.SHOT_SCHEME ?? 'dark';
const ACCENT = process.env.SHOT_ACCENT;
const shot = (name: string, ui: React.ReactElement, interact?: (host: HTMLElement) => void | Promise<void>) =>
  shoot(`${name}-${SCHEME}${ACCENT ? `-${ACCENT}` : ''}`, ui, interact);

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-10-29T16:00:00Z'), doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask'] });
  (api.getMealPlans as jest.Mock).mockResolvedValue(f.paged(f.mealPlan({ mon: '2026-10-27', tue: '2026-10-28', wed: '2026-10-29' })));
});

test('meal plan', () => shot('meal-plan', <MealPlanScreen />, host => clickText(host, 'Thu')));
test('recipes', () => shot('recipes', <RecipesScreen navigation={nav} />));
test('recipe detail', () => shot('recipe-detail', <RecipeDetailScreen navigation={nav} route={route({ slug: 'salisbury-steak-with-mushroom-gravy', name: 'Salisbury Steak with Mushroom Gravy' })} />));
test('recipe edit', () => shot('recipe-edit', <RecipeEditScreen navigation={nav} route={route({ slug: 'salisbury-steak-with-mushroom-gravy' })} />));
test('shopping lists', () => shot('shopping-lists', <ShoppingListsScreen navigation={nav} />));
test('shopping list detail', () => shot('shopping-list-detail', <ShoppingListDetailScreen navigation={nav} route={route({ listId: 'l1', listName: 'Weekly Groceries' })} />));
test('cookbooks', () => shot('cookbooks', <CookbooksScreen navigation={nav} />));
test('settings', () => shot('settings', <SettingsScreen />));
test('welcome', () => shot('welcome', <WelcomeScreen navigation={nav} />));
test('suggestions', () => shot('suggestions', <RecipeSuggestionsScreen navigation={nav} />));
