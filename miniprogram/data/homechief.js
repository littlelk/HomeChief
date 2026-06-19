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

const recipes = [
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

const posts = [
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

const albumGroups = [
  { id: 'album-june', title: '六月饭桌', count: 4, photos: [photos.tomatoEgg, photos.weekend, photos.greens, photos.dumplings] },
  { id: 'album-may', title: '五月家常菜', count: 3, photos: [photos.braisedPork, photos.soup, photos.tomatoEgg] },
]

const drafts = [
  { id: 'draft-001', type: 'recipe', title: '蒜蓉空心菜', updatedAt: '10 分钟前' },
]

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
}
