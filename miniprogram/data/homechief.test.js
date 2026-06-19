const assert = require('assert')
const {
  family,
  posts,
  recipes,
  albumGroups,
  findRecipeById,
  getPostsByRecipeId,
  getRecentRecipes,
  getAlbumPhotoCount,
} = require('./homechief')

assert.strictEqual(family.name, '林家的厨房')
assert.ok(posts.length >= 3)
assert.ok(recipes.length >= 3)
assert.ok(albumGroups.length >= 2)
assert.strictEqual(findRecipeById('recipe-braised-pork').name, '红烧肉')
assert.strictEqual(findRecipeById('missing-recipe'), null)
assert.ok(getPostsByRecipeId('recipe-braised-pork').length >= 1)
assert.deepStrictEqual(getRecentRecipes(2).map((recipe) => recipe.id), ['recipe-tomato-egg', 'recipe-braised-pork'])
assert.ok(getAlbumPhotoCount() >= 6)

console.log('homechief data tests passed')
