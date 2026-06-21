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
  drafts,
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
assert.strictEqual(family.members.length, 0)
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
assert.strictEqual(posts[0].author.name, '我')
assert.strictEqual(getAlbumPhotoCount(), albumCount + 1)
assert.ok(storage[STORAGE_KEY].recipes.some((recipe) => recipe.id === created.recipe.id))
assert.strictEqual(storage[STORAGE_KEY].posts[0].recipeId, created.recipe.id)

const persistedState = storage[STORAGE_KEY]
resetHomeChiefDataForTests()
assert.strictEqual(storage[STORAGE_KEY], undefined)
storage[STORAGE_KEY] = persistedState
assert.strictEqual(initHomeChiefStorage(), true)
assert.strictEqual(findRecipeById(created.recipe.id).name, '清炒西兰花')

resetHomeChiefDataForTests()
storage[STORAGE_KEY] = {
  recipes: [{
    id: 'legacy-recipe',
    name: '旧缓存菜谱',
    cover: '/images/mock/tomato-egg.jpg',
    tags: ['快手菜'],
    steps: [{ title: '旧步骤', body: '旧图片路径。', image: '/images/mock/braised-pork.jpg' }],
  }],
  posts: [{
    id: 'legacy-post',
    photos: ['/images/mock/weekend-table.jpg', '/tmp/family.jpg'],
  }],
  albumGroups: [{
    id: 'legacy-album',
    title: '旧相册',
    photos: ['/images/mock/greens.jpg'],
    items: [{ src: '/images/mock/dumplings.jpg', tags: ['饭菜'] }],
  }],
  drafts: [],
}
assert.strictEqual(initHomeChiefStorage(), true)
assert.strictEqual(recipes[0].cover, '/images/mock/tomato-egg.png')
assert.strictEqual(recipes[0].steps[0].image, '/images/mock/braised-pork.png')
assert.strictEqual(posts[0].photos[0], '/images/mock/weekend-table.png')
assert.strictEqual(posts[0].photos[1], '/tmp/family.jpg')
assert.strictEqual(albumGroups[0].photos[0], '/images/mock/dumplings.png')
assert.strictEqual(storage[STORAGE_KEY].recipes[0].cover, '/images/mock/tomato-egg.png')

resetHomeChiefDataForTests()
storage[STORAGE_KEY] = { recipes: [] }
assert.strictEqual(initHomeChiefStorage(), false)
assert.strictEqual(recipes.length, 3)
assert.strictEqual(posts.length, 3)
assert.strictEqual(albumGroups.length, 2)
assert.strictEqual(drafts.length, 1)
assert.strictEqual(storage[STORAGE_KEY].recipes.length, 3)

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
