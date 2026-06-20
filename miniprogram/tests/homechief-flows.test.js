const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const store = require('../data/homechief')

function checkAppStructure() {
  const app = require('../app.json')
  assert.strictEqual(app.pages.length, 8)
  assert.strictEqual(app.tabBar.list.length, 5)
  assert.strictEqual(app.lazyCodeLoading, 'requiredComponents')
  assert.strictEqual(app.pages[0], 'pages/index/index')
  assert.ok(!app.pages.includes('pages/feed/feed'))
  assert.strictEqual(app.tabBar.list[0].pagePath, 'pages/index/index')
  for (const item of app.tabBar.list) {
    assert.ok(item.iconPath, `missing tab iconPath for ${item.pagePath}`)
    assert.ok(item.selectedIconPath, `missing tab selectedIconPath for ${item.pagePath}`)
    assert.ok(fs.existsSync(`${__dirname}/../${item.iconPath}`), `missing tab icon ${item.iconPath}`)
    assert.ok(fs.existsSync(`${__dirname}/../${item.selectedIconPath}`), `missing selected tab icon ${item.selectedIconPath}`)
  }
  for (const page of app.pages) {
    for (const ext of ['js', 'json', 'wxml', 'wxss']) {
      assert.ok(fs.existsSync(`${__dirname}/../${page}.${ext}`), `missing ${page}.${ext}`)
    }
  }
}

function walkFiles(root) {
  if (!fs.existsSync(root)) return []
  const files = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name)
    if (entry.isDirectory()) files.push(...walkFiles(file))
    else files.push(file)
  }
  return files
}

function checkPackOptions() {
  const projectConfig = require('../../project.config.json')
  const ignored = new Set((projectConfig.packOptions && projectConfig.packOptions.ignore || []).map((item) => item.value))
  const expectedIgnored = [
    'cloudfunctions/',
    'miniprogram/node_modules/',
    'miniprogram/miniprogram_npm/',
    'miniprogram/packageAPI/',
    'miniprogram/packageCloud/',
    'miniprogram/packageComponent/',
    'miniprogram/packageExtend/',
    'miniprogram/page/',
    'miniprogram/workers/',
  ]
  for (const value of expectedIgnored) {
    assert.ok(ignored.has(value), `project config should ignore ${value}`)
  }
  const scaffoldPaths = [
    '../../cloudfunctions',
    '../app-darkmode.json',
    '../common',
    '../config.js',
    '../demo.theme.json',
    '../image',
    '../node_modules',
    '../miniprogram_npm',
    '../package-lock.json',
    '../package.json',
    '../packageAPI',
    '../packageCloud',
    '../packageComponent',
    '../packageExtend',
    '../page',
    '../util',
    '../workers',
  ]
  for (const value of scaffoldPaths) {
    assert.ok(!fs.existsSync(path.resolve(__dirname, value)), `unused scaffold path should be removed: ${value}`)
  }
}

function checkAssetBudget() {
  const mediaExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.bmpr', '.mp3', '.mp4', '.wav'])
  const mediaFiles = walkFiles(path.resolve(__dirname, '..'))
    .filter((file) => mediaExtensions.has(path.extname(file).toLowerCase()))
  const mediaBytes = mediaFiles.reduce((total, file) => total + fs.statSync(file).size, 0)
  assert.ok(mediaBytes <= 200 * 1024, `image and audio resources should be <= 200 KB, got ${mediaBytes}`)
}

function checkSyntax() {
  const files = [
    'app.js',
    'data/homechief.js',
    'utils/format.js',
    'components/empty-state/empty-state.js',
    'components/photo-grid/photo-grid.js',
    'pages/index/index.js',
    'pages/publish/publish.js',
    'pages/recipes/recipes.js',
    'pages/recipe-detail/recipe-detail.js',
    'pages/create-recipe/create-recipe.js',
    'pages/create-life/create-life.js',
    'pages/album/album.js',
    'pages/me/me.js',
  ]
  for (const file of files) {
    execFileSync(process.execPath, ['--check', `${__dirname}/../${file}`])
  }
}

function assertValidPng(file, label) {
  const header = fs.readFileSync(file).subarray(0, 24)
  const signature = header.subarray(0, 8).toString('hex')
  assert.strictEqual(signature, '89504e470d0a1a0a', `mock image should be PNG: ${label}`)
  const width = header.readUInt32BE(16)
  const height = header.readUInt32BE(20)
  assert.ok(width >= 320 && height >= 240, `mock image should be inspectable: ${label}`)
}

function checkMockImages() {
  const images = new Set()
  for (const recipe of store.recipes) {
    images.add(recipe.cover)
    for (const step of recipe.steps) if (step.image) images.add(step.image)
  }
  for (const post of store.posts) {
    for (const image of post.photos) images.add(image)
  }
  for (const group of store.albumGroups) {
    for (const image of group.photos) images.add(image)
  }
  for (const image of images) {
    const file = `${__dirname}/../${image.replace(/^\//, '')}`
    assert.ok(fs.existsSync(file), `missing mock image ${image}`)
    if (image.startsWith('/images/mock/')) assertValidPng(file, image)
  }
}

function loadPages() {
  const pageDefs = []
  const toasts = []
  let switched = ''
  const storage = {}

  global.App = function app(definition) {
    global.__homechiefApp = definition
  }
  global.Page = function page(definition) {
    pageDefs.push(definition)
  }
  global.Component = function component() {}
  global.wx = {
    setStorageSync(key, value) {
      storage[key] = value
    },
    getStorageSync(key) {
      return storage[key]
    },
    removeStorageSync(key) {
      delete storage[key]
    },
    switchTab(options) {
      switched = options.url
    },
    navigateTo(options) {
      global.__lastNavigateTo = options.url
    },
    navigateBack() {
      global.__navigatedBack = true
    },
    showToast(options) {
      toasts.push(options.title)
    },
    chooseMedia(options) {
      options.success({ tempFiles: [{ tempFilePath: '/tmp/homechief-test.jpg' }] })
    },
    saveFile(options) {
      const savedFilePath = `/saved/${path.basename(options.tempFilePath)}`
      if (options.success) options.success({ savedFilePath })
      if (options.complete) options.complete()
    },
    previewImage() {},
  }
  global.setTimeout = function immediate(fn) {
    fn()
  }

  require('../app.js')
  require('../components/empty-state/empty-state.js')
  require('../components/photo-grid/photo-grid.js')
  require('../pages/index/index.js')
  require('../pages/publish/publish.js')
  require('../pages/recipes/recipes.js')
  require('../pages/recipe-detail/recipe-detail.js')
  require('../pages/create-recipe/create-recipe.js')
  require('../pages/create-life/create-life.js')
  require('../pages/album/album.js')
  require('../pages/me/me.js')

  for (const page of pageDefs) {
    page.setData = function setData(next, callback) {
      this.data = Object.assign({}, this.data, next)
      if (callback) callback.call(this)
    }
  }

  return {
    pages: pageDefs,
    toasts,
    storage,
    get switched() {
      return switched
    },
    get storageFlag() {
      return storage['homechief:openPublishSheet']
    },
  }
}

function runFlowAssertions() {
  checkAssetBudget()
  store.resetHomeChiefDataForTests()
  const harness = loadPages()
  if (global.__homechiefApp.onLaunch) global.__homechiefApp.onLaunch()
  const [feed, publish, recipesPage, detail, createRecipe, createLife, album, me] = harness.pages

  const feedWxml = fs.readFileSync(`${__dirname}/../pages/index/index.wxml`, 'utf8')
  assert.ok(feedWxml.includes("activeMode === 'feed'"), 'feed mode branch missing')
  assert.ok(feedWxml.includes('home-recipe-list'), 'recipe mode branch missing')

  publish.onShow()
  feed.onShow()
  assert.strictEqual(feed.data.showPublishSheet, true)
  assert.strictEqual(harness.storageFlag, undefined)

  feed.setMode({ currentTarget: { dataset: { mode: 'recipes' } } })
  assert.strictEqual(feed.data.activeMode, 'recipes')

  const initialRecipes = store.recipes.length
  const initialPosts = store.posts.length
  createRecipe.onNameInput({ detail: { value: '葱油拌面' } })
  createRecipe.onNoteInput({ detail: { value: '十分钟搞定。' } })
  createRecipe.onIngredientsInput({ detail: { value: '面条\n葱油' } })
  createRecipe.chooseCover()
  assert.strictEqual(createRecipe.data.cover, '/saved/homechief-test.jpg')
  assert.strictEqual(typeof createRecipe.chooseStepImage, 'function')
  createRecipe.chooseStepImage({ currentTarget: { dataset: { index: 0 } } })
  assert.strictEqual(createRecipe.data.steps[0].image, '/saved/homechief-test.jpg')
  createRecipe.onStepTitleInput({ currentTarget: { dataset: { index: 0 } }, detail: { value: '煮面' } })
  createRecipe.onStepBodyInput({ currentTarget: { dataset: { index: 0 } }, detail: { value: '面条煮熟后拌葱油。' } })
  createRecipe.publish()
  assert.strictEqual(store.recipes.length, initialRecipes + 1)
  assert.strictEqual(store.posts.length, initialPosts + 1)
  assert.strictEqual(store.recipes[0].name, '葱油拌面')
  assert.strictEqual(store.posts[0].recipeId, store.recipes[0].id)
  assert.strictEqual(store.posts[0].photos[0], '/saved/homechief-test.jpg')
  assert.strictEqual(store.recipes[0].steps[0].image, '/saved/homechief-test.jpg')
  assert.ok(harness.storage['homechief:localState'].recipes.some((recipe) => recipe.name === '葱油拌面'))

  feed.onShow()
  assert.ok(feed.data.posts[0].title.includes('葱油拌面'))
  recipesPage.onShow()
  recipesPage.onSearch({ detail: { value: '葱油' } })
  assert.strictEqual(recipesPage.data.visibleRecipes[0].name, '葱油拌面')
  detail.onLoad({ id: store.recipes[0].id })
  assert.strictEqual(detail.data.recipe.name, '葱油拌面')

  createRecipe.saveDraft()
  me.onShow()
  assert.ok(me.data.drafts.some((draft) => draft.title === '葱油拌面'))

  const porkBefore = store.findRecipeById('recipe-braised-pork').cookCount
  createLife.onLoad({ recipeId: 'recipe-braised-pork' })
  createLife.choosePhotos()
  assert.ok(createLife.data.photos.includes('/saved/homechief-test.jpg'))
  createLife.publish()
  assert.strictEqual(store.findRecipeById('recipe-braised-pork').cookCount, porkBefore + 1)
  assert.strictEqual(store.posts[0].recipeId, 'recipe-braised-pork')
  assert.ok(store.posts[0].photos.includes('/saved/homechief-test.jpg'))

  album.onShow()
  assert.ok(album.data.photoCount >= 9)
  const allCount = album.data.visibleAlbumGroups.reduce((total, group) => total + group.photos.length, 0)
  album.setFilter({ currentTarget: { dataset: { filter: '饭菜' } } })
  const foodCount = album.data.visibleAlbumGroups.reduce((total, group) => total + group.photos.length, 0)
  assert.ok(foodCount > 0 && foodCount < allCount)
  album.setFilter({ currentTarget: { dataset: { filter: '生活' } } })
  const lifeCount = album.data.visibleAlbumGroups.reduce((total, group) => total + group.photos.length, 0)
  assert.ok(lifeCount > 0 && lifeCount < allCount)
  assert.ok(album.data.visibleAlbumGroups.some((group) => group.photos.includes('/saved/homechief-test.jpg')))
  album.setFilter({ currentTarget: { dataset: { filter: '节日' } } })
  assert.strictEqual(album.data.visibleAlbumGroups.length, 0)

  createLife.setData({ body: '', photos: [] })
  createLife.publish()
  assert.ok(harness.toasts.includes('写点文字或传张照片'))

  const titleBefore = store.findRecipeById('recipe-tomato-egg').steps[0].title
  createRecipe.onLoad({ id: 'recipe-tomato-egg' })
  createRecipe.onStepTitleInput({ currentTarget: { dataset: { index: 0 } }, detail: { value: '不该污染原始数据' } })
  assert.strictEqual(store.findRecipeById('recipe-tomato-egg').steps[0].title, titleBefore)
}

checkAppStructure()
checkPackOptions()
checkSyntax()
checkMockImages()
runFlowAssertions()

console.log('homechief flow tests passed')
