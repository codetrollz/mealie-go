import * as f from './fixtures';

// Replaces src/lib/mealieApi in screenshot runs. Anything not listed resolves
// to undefined; named exports not listed become jest.fn().
const resolved = (v: unknown) => jest.fn().mockResolvedValue(v);
const api: Record<string, unknown> = {
  getRecipes: resolved(f.paged(f.recipes)),
  getRecipe: resolved(f.recipeDetail),
  getRandomRecipe: resolved(f.recipes[1]),
  getComments: resolved(f.comments),
  getShareTokens: resolved([]),
  getShoppingLists: resolved(f.paged(f.shoppingLists)),
  getShoppingList: resolved(f.shoppingListDetail),
  getShoppingLabels: resolved(f.shoppingLabels),
  getCookbooks: resolved(f.paged(f.cookbooks)),
  getTags: resolved(f.tags),
  getCategories: resolved(f.categories),
  getTools: resolved(f.tools),
  getFoods: resolved(f.foods),
  getRecipeSuggestions: resolved([{ recipe: f.recipes[2], missingFoods: [{ name: 'artichokes' }], missingTools: [] }, { recipe: f.recipes[3], missingFoods: [], missingTools: [] }]),
  getFavoriteRecipeIds: resolved(new Set(['r1'])),
  getMealPlans: resolved(f.paged([])),
};
const mod: Record<string, unknown> = {
  __esModule: true,
  api: new Proxy(api, { get: (t, k: string) => (k in t ? t[k] : jest.fn().mockResolvedValue(undefined)) }),
  recipeImageSource: () => undefined,
  recipeAssetUrl: () => '',
  isImageFileName: () => false,
};
module.exports = new Proxy(mod, { get: (t, k: string) => (k in t ? t[k] : jest.fn()) });
