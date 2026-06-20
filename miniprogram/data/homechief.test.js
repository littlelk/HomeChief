const assert = require('assert')

const storage = {}
global.wx = {
  getStorageSync(key) {
    return storage[key]
  },
  setStorageSync(key, value) {
    storage[key] = value
  },
  removeStorageSync(key) {
    delete storage[key]
  },
}

const {
  family,
  posts,
  recipes,
  albumGroups,
  findRecipeById,
  getPostsByRecipeId,
  getRecentRecipes,
  getAlbumPhotoCount,
  upsertRecipeFromForm,
  addLifePost,
  saveDraft,
  resetHomeChiefDataForTests,
  initHomeChiefStorage,
  snapshotState,
  STORAGE_KEY,
} = require('./homechief')

resetHomeChiefDataForTests()

assert.strictEqual(family.name, '林家的厨房')
assert.ok(posts.length >= 3)
assert.ok(recipes.length >= 3)
assert.ok(albumGroups.length >= 2)
assert.strictEqual(findRecipeById('recipe-braised-pork').name, '红烧肉')
assert.strictEqual(findRecipeById('missing-recipe'), null)
assert.ok(getPostsByRecipeId('recipe-braised-pork').length >= 1)
assert.deepStrictEqual(getRecentRecipes(2).map((recipe) => recipe.id), ['recipe-tomato-egg', 'recipe-braised-pork'])
assert.ok(getAlbumPhotoCount() >= 6)
assert.strictEqual(typeof initHomeChiefStorage, 'function')
assert.strictEqual(typeof snapshotState, 'function')
assert.strictEqual(STORAGE_KEY, 'homechief:localState')

const recipeCount = recipes.length
const postCount = posts.length
const albumCount = getAlbumPhotoCount()
const created = upsertRecipeFromForm({
  id: '',
  name: '清炒西兰花',
  note: '蒜香一点更好吃。',
  tags: ['快手菜'],
  cover: '/tmp/broccoli.jpg',
  ingredientsText: '西兰花 1 颗\n蒜 2 瓣',
  steps: [{ title: '焯水', body: '西兰花焯水 30 秒。', image: '' }],
})

assert.strictEqual(recipes.length, recipeCount + 1)
assert.strictEqual(posts.length, postCount + 1)
assert.strictEqual(created.recipe.name, '清炒西兰花')
assert.strictEqual(posts[0].recipeId, created.recipe.id)
assert.strictEqual(getAlbumPhotoCount(), albumCount + 1)
assert.ok(storage[STORAGE_KEY].recipes.some((recipe) => recipe.id === created.recipe.id))
assert.strictEqual(storage[STORAGE_KEY].posts[0].recipeId, created.recipe.id)

const persistedState = storage[STORAGE_KEY]
resetHomeChiefDataForTests()
assert.strictEqual(storage[STORAGE_KEY], undefined)
storage[STORAGE_KEY] = persistedState
assert.strictEqual(initHomeChiefStorage(), true)
assert.strictEqual(findRecipeById(created.recipe.id).name, '清炒西兰花')

const beforeCookCount = findRecipeById('recipe-braised-pork').cookCount
const lifePost = addLifePost({
  recipeId: 'recipe-braised-pork',
  body: '',
  photos: ['/tmp/pork-again.jpg'],
  tags: ['饭菜'],
})
assert.strictEqual(lifePost.recipeId, 'recipe-braised-pork')
assert.strictEqual(findRecipeById('recipe-braised-pork').cookCount, beforeCookCount + 1)
assert.strictEqual(posts[0].id, lifePost.id)
assert.strictEqual(storage[STORAGE_KEY].posts[0].id, lifePost.id)

const draft = saveDraft('recipe', '测试草稿')
assert.strictEqual(draft.title, '测试草稿')
assert.strictEqual(storage[STORAGE_KEY].drafts[0].id, draft.id)

const snapshot = snapshotState()
snapshot.recipes[0].name = '不应影响运行态'
assert.notStrictEqual(recipes[0].name, '不应影响运行态')

resetHomeChiefDataForTests()
assert.strictEqual(recipes.length, 3)
assert.strictEqual(posts.length, 3)
assert.strictEqual(storage[STORAGE_KEY], undefined)

console.log('homechief data tests passed')
