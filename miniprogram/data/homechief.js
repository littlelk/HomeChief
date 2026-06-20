const STORAGE_KEY = 'homechief:localState'

const family = {
  id: 'family-lin',
  name: '林家的厨房',
  today: '6月20日 周六',
  members: [
    { id: 'm1', name: '妈妈', avatar: '妈', role: '主厨' },
    { id: 'm2', name: '爸爸', avatar: '爸', role: '记录员' },
    { id: 'm3', name: '小米', avatar: '米', role: '试吃员' },
  ],
}

const photos = {
  tomatoEgg: '/images/mock/tomato-egg.jpg',
  braisedPork: '/images/mock/braised-pork.jpg',
  soup: '/images/mock/soup.jpg',
  weekend: '/images/mock/weekend-table.jpg',
  dumplings: '/images/mock/dumplings.jpg',
  greens: '/images/mock/greens.jpg',
}

const defaultRecipes = [
  {
    id: 'recipe-tomato-egg',
    name: '番茄炒蛋',
    cover: photos.tomatoEgg,
    tags: ['快手菜', '孩子爱吃'],
    flavor: '酸甜',
    difficulty: '10 分钟',
    lastCookedAt: '昨天',
    cookCount: 18,
    author: '妈妈',
    note: '鸡蛋先炒得嫩一点，最后再回锅。',
    ingredients: ['番茄 2 个', '鸡蛋 3 个', '葱花 少许', '盐 适量'],
    steps: [
      { title: '处理食材', body: '番茄切块，鸡蛋加一点盐打散。', image: photos.tomatoEgg },
      { title: '先炒鸡蛋', body: '热锅下油，蛋液凝固后盛出。', image: '' },
      { title: '番茄出汁', body: '番茄炒软后加少量水和盐。', image: '' },
      { title: '回锅收汁', body: '倒回鸡蛋，翻匀后撒葱花。', image: '' },
    ],
  },
  {
    id: 'recipe-braised-pork',
    name: '红烧肉',
    cover: photos.braisedPork,
    tags: ['周末菜', '下饭'],
    flavor: '咸甜',
    difficulty: '60 分钟',
    lastCookedAt: '上周日',
    cookCount: 7,
    author: '爸爸',
    note: '冰糖不要太多，收汁时多看火。',
    ingredients: ['五花肉 500g', '冰糖 8 粒', '生抽 2 勺', '老抽 1 勺', '姜片 4 片'],
    steps: [
      { title: '焯水', body: '五花肉切块，冷水下锅焯出浮沫。', image: photos.braisedPork },
      { title: '炒糖色', body: '小火融化冰糖，肉块下锅上色。', image: '' },
      { title: '炖煮', body: '加调料和热水，小火炖 45 分钟。', image: '' },
      { title: '收汁', body: '开盖转中火，汤汁浓稠后出锅。', image: '' },
    ],
  },
  {
    id: 'recipe-corn-soup',
    name: '玉米排骨汤',
    cover: photos.soup,
    tags: ['汤', '清淡'],
    flavor: '鲜甜',
    difficulty: '90 分钟',
    lastCookedAt: '本周二',
    cookCount: 5,
    author: '妈妈',
    note: '出锅前再放盐，汤更清甜。',
    ingredients: ['排骨 400g', '玉米 1 根', '胡萝卜 1 根', '姜片 3 片'],
    steps: [
      { title: '焯排骨', body: '排骨冷水下锅，焯水洗净。', image: photos.soup },
      { title: '慢炖', body: '加入玉米、胡萝卜和姜片，小火炖煮。', image: '' },
      { title: '调味', body: '出锅前加盐，撒葱花。', image: '' },
    ],
  },
]

const defaultPosts = [
  {
    id: 'post-001',
    type: 'recipe',
    author: family.members[0],
    time: '今天 18:42',
    title: '今晚又做了番茄炒蛋',
    body: '小米说今天的蛋特别嫩，已经加入常做清单。',
    recipeId: 'recipe-tomato-egg',
    photos: [photos.tomatoEgg],
    tags: ['晚餐', '快手菜'],
    reactions: 5,
    comments: [{ author: '爸爸', body: '明天我来洗碗。' }],
  },
  {
    id: 'post-002',
    type: 'life',
    author: family.members[1],
    time: '昨天 20:10',
    title: '周五的小饭桌',
    body: '饭后一起整理了这周的照片。',
    recipeId: '',
    photos: [photos.weekend, photos.greens],
    tags: ['生活', '周末'],
    reactions: 3,
    comments: [],
  },
  {
    id: 'post-003',
    type: 'recipe',
    author: family.members[1],
    time: '上周日 12:30',
    title: '红烧肉终于收汁成功',
    body: '这次糖色刚刚好，步骤已经补全。',
    recipeId: 'recipe-braised-pork',
    photos: [photos.braisedPork, photos.dumplings],
    tags: ['周末菜'],
    reactions: 6,
    comments: [{ author: '妈妈', body: '下次少放一点老抽。' }],
  },
]

const defaultAlbumGroups = [
  { id: 'album-june', title: '六月饭桌', count: 4, photos: [photos.tomatoEgg, photos.weekend, photos.greens, photos.dumplings] },
  { id: 'album-may', title: '五月家常菜', count: 3, photos: [photos.braisedPork, photos.soup, photos.tomatoEgg] },
]

const defaultDrafts = [
  { id: 'draft-001', type: 'recipe', title: '蒜蓉空心菜', updatedAt: '10 分钟前' },
]

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

const recipes = clone(defaultRecipes)
const posts = clone(defaultPosts)
const albumGroups = clone(defaultAlbumGroups)
const drafts = clone(defaultDrafts)

function canUseStorage() {
  return typeof wx !== 'undefined' && wx && typeof wx.getStorageSync === 'function' && typeof wx.setStorageSync === 'function'
}

function replaceArray(target, next) {
  target.splice(0, target.length, ...clone(next || []))
}

function snapshotState() {
  return {
    recipes: clone(recipes),
    posts: clone(posts),
    albumGroups: clone(albumGroups),
    drafts: clone(drafts),
  }
}

function persistState() {
  if (!canUseStorage()) return
  wx.setStorageSync(STORAGE_KEY, snapshotState())
}

function initHomeChiefStorage() {
  if (!canUseStorage()) return false
  const state = wx.getStorageSync(STORAGE_KEY)
  if (!state) {
    persistState()
    return false
  }
  replaceArray(recipes, state.recipes)
  replaceArray(posts, state.posts)
  replaceArray(albumGroups, state.albumGroups)
  replaceArray(drafts, state.drafts)
  return true
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

function currentTimeLabel() {
  return '刚刚'
}

function firstFamilyMember() {
  return family.members[0]
}

function normalizeTags(tags, fallback) {
  return Array.isArray(tags) && tags.length ? tags.slice() : fallback.slice()
}

function splitLines(text) {
  return String(text || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeSteps(steps) {
  const normalized = (steps || [])
    .map((step, index) => ({
      title: step.title && step.title.trim() ? step.title.trim() : `步骤 ${index + 1}`,
      body: step.body && step.body.trim() ? step.body.trim() : '还没有填写具体做法。',
      image: step.image || '',
    }))
    .filter((step) => step.title || step.body || step.image)
  return normalized.length ? normalized : [{ title: '步骤 1', body: '还没有填写具体做法。', image: '' }]
}

function findRecipeById(id) {
  return recipes.find((recipe) => recipe.id === id) || null
}

function getPostsByRecipeId(recipeId) {
  return posts.filter((post) => post.recipeId === recipeId)
}

function getRecentRecipes(limit) {
  return recipes.slice(0, limit)
}

function getAlbumPhotoCount() {
  return albumGroups.reduce((total, group) => total + group.photos.length, 0)
}

function addPhotosToAlbum(newPhotos) {
  if (!newPhotos.length) return
  const group = albumGroups[0]
  group.photos = newPhotos.concat(group.photos)
  group.count = group.photos.length
}

function upsertRecipeFromForm(form) {
  const name = form.name.trim()
  const existing = form.id ? findRecipeById(form.id) : null
  const cover = form.cover || (existing && existing.cover) || photos.tomatoEgg
  const steps = normalizeSteps(form.steps)
  const recipe = existing || {
    id: makeId('recipe'),
    cookCount: 0,
    author: firstFamilyMember().name,
    flavor: '家常',
    difficulty: '待完善',
  }

  recipe.name = name
  recipe.cover = cover
  recipe.tags = normalizeTags(form.tags, ['家常菜'])
  recipe.lastCookedAt = currentTimeLabel()
  recipe.cookCount = (recipe.cookCount || 0) + 1
  recipe.note = form.note && form.note.trim() ? form.note.trim() : '这份菜谱还可以继续补充家人备注。'
  recipe.ingredients = splitLines(form.ingredientsText)
  if (!recipe.ingredients.length) recipe.ingredients = ['食材待补充']
  recipe.steps = steps

  if (!existing) recipes.unshift(recipe)

  const post = {
    id: makeId('post'),
    type: 'recipe',
    author: firstFamilyMember(),
    time: currentTimeLabel(),
    title: existing ? `更新了${recipe.name}` : `新菜谱：${recipe.name}`,
    body: recipe.note,
    recipeId: recipe.id,
    photos: [cover],
    tags: recipe.tags.slice(0, 2),
    reactions: 0,
    comments: [],
  }
  posts.unshift(post)
  addPhotosToAlbum(post.photos)
  persistState()
  return { recipe, post }
}

function addLifePost(form) {
  const linkedRecipe = form.recipeId ? findRecipeById(form.recipeId) : null
  if (linkedRecipe) {
    linkedRecipe.lastCookedAt = currentTimeLabel()
    linkedRecipe.cookCount = (linkedRecipe.cookCount || 0) + 1
  }
  const body = form.body && form.body.trim()
    ? form.body.trim()
    : linkedRecipe
      ? `今天又做了${linkedRecipe.name}。`
      : '分享了一组家庭照片。'
  const post = {
    id: makeId('post'),
    type: linkedRecipe ? 'recipe' : 'life',
    author: firstFamilyMember(),
    time: currentTimeLabel(),
    title: linkedRecipe ? `今天又做了${linkedRecipe.name}` : '新的家庭记录',
    body,
    recipeId: linkedRecipe ? linkedRecipe.id : '',
    photos: form.photos && form.photos.length ? form.photos.slice() : [],
    tags: normalizeTags(form.tags, linkedRecipe ? ['饭菜'] : ['生活']),
    reactions: 0,
    comments: [],
  }
  posts.unshift(post)
  addPhotosToAlbum(post.photos)
  persistState()
  return post
}

function saveDraft(type, title) {
  const draft = { id: makeId('draft'), type, title: title || '未命名草稿', updatedAt: currentTimeLabel() }
  drafts.unshift(draft)
  persistState()
  return draft
}

function resetHomeChiefDataForTests() {
  replaceArray(recipes, defaultRecipes)
  replaceArray(posts, defaultPosts)
  replaceArray(albumGroups, defaultAlbumGroups)
  replaceArray(drafts, defaultDrafts)
  if (typeof wx !== 'undefined' && wx && typeof wx.removeStorageSync === 'function') {
    wx.removeStorageSync(STORAGE_KEY)
  }
}

module.exports = {
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
}
