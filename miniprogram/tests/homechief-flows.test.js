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
    'services/auth.js',
    'services/backend.js',
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
  let shownModal = null
  const requests = []
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
    showModal(options) {
      shownModal = options
      if (options.success) options.success({ confirm: false, cancel: true })
    },
    login(options) {
      if (options.success) options.success({ code: 'wx-test-code' })
    },
    request(options) {
      requests.push(options)
      if (options.url.includes('/functions/v1/family-onboarding') && options.success) {
        if (options.data.action === 'update_profile') {
          const current = storage['homechief:session'] || {}
          options.success({
            statusCode: 200,
            data: {
              user: Object.assign({}, current.user, {
                nickname: options.data.nickname || current.user.nickname,
                avatar_url: options.data.avatar_url || current.user.avatar_url,
              }),
              family: current.family || null,
              needs_onboarding: !current.family,
            },
          })
          if (options.complete) options.complete()
          return
        }
        if (options.data.action === 'update_family_name') {
          const current = storage['homechief:session'] || {}
          options.success({
            statusCode: 200,
            data: {
              user: current.user,
              family: Object.assign({}, current.family, { name: options.data.family_name }),
              needs_onboarding: false,
            },
          })
          if (options.complete) options.complete()
          return
        }
        if (options.data.action === 'join_family') {
          options.success({
            statusCode: 200,
            data: {
              user: { id: 'backend-user', nickname: '小刘', avatar_url: '/tmp/homechief-test.jpg', primary_family_id: 'family-join' },
              family: { id: 'family-join', name: '朋友家的厨房', role: 'member', invite_code: options.data.family_code },
              needs_onboarding: false,
            },
          })
          if (options.complete) options.complete()
          return
        }
        options.success({
          statusCode: 200,
          data: {
            user: { id: 'backend-user', nickname: '小刘', avatar_url: '/tmp/homechief-test.jpg', primary_family_id: 'family-backend' },
            family: { id: 'family-backend', name: options.data.family_name, role: 'owner', invite_code: 'HC88AA' },
            needs_onboarding: false,
          },
        })
      } else if (options.success) {
        options.success({
          statusCode: 200,
          data: {
            token: 'backend-token',
            user: { id: 'backend-user', nickname: options.data.nickname, avatar_url: options.data.avatar_url },
            family: null,
            needs_onboarding: true,
          },
        })
      }
      if (options.complete) options.complete()
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
    get shownModal() {
      return shownModal
    },
    requests,
  }
}

async function runFlowAssertions() {
  checkAssetBudget()
  store.resetHomeChiefDataForTests()
  const harness = loadPages()
  if (global.__homechiefApp.onLaunch) global.__homechiefApp.onLaunch()
  const [feed, publish, recipesPage, detail, createRecipe, createLife, album, me] = harness.pages

  const feedWxml = fs.readFileSync(`${__dirname}/../pages/index/index.wxml`, 'utf8')
  assert.ok(feedWxml.includes("activeMode === 'feed'"), 'feed mode branch missing')
  assert.ok(feedWxml.includes('home-recipe-list'), 'recipe mode branch missing')
  assert.ok(!feedWxml.includes('floating-publish'), 'feed page should not render floating publish button')
  const meWxml = fs.readFileSync(`${__dirname}/../pages/me/me.wxml`, 'utf8')
  assert.ok(meWxml.includes('bindinput="onFamilyNameInput"'), 'family onboarding should allow custom family name')
  assert.ok(meWxml.includes('session.family.name'), 'profile should display the created family name from session')
  assert.ok(meWxml.includes('session.family.invite_code'), 'profile should display family id')
  assert.ok(meWxml.includes('bindtap="chooseRegisterAvatar"'), 'registration should support avatar selection')
  assert.ok(meWxml.includes('bindtap="joinFamily"'), 'onboarding should support joining by family id')
  assert.ok(meWxml.includes('bindtap="updateFamilyName"'), 'registered users should rename family')
  assert.ok(meWxml.includes('bindtap="updateAvatar"'), 'registered users should update avatar')

  publish.onShow()
  assert.strictEqual(harness.switched, '/pages/index/index')
  assert.ok(harness.shownModal, 'guest publish should show login modal')
  assert.ok(harness.shownModal.title.includes('登录'))
  feed.onShow()
  assert.strictEqual(feed.data.isGuest, true)
  assert.strictEqual(feed.data.showPublishSheet, false)
  me.onShow()
  assert.strictEqual(me.data.isGuest, true)
  await me.loginDemo()
  assert.strictEqual(me.data.isGuest, false)
  assert.strictEqual(harness.storage['homechief:session'].token, 'demo-review-token')
  assert.strictEqual(harness.storage['homechief:session'].family.id, 'demo-family')
  assert.strictEqual(harness.requests.length, 0, 'demo login should not call backend')
  me.logout()
  assert.strictEqual(me.data.isGuest, true)
  const defaultRequest = global.wx.request
  global.wx.request = function failedWechatLogin(options) {
    harness.requests.push(options)
    if (options.success) {
      options.success({
        statusCode: 502,
        data: { error: 'wechat_exchange_failed', wechat_error_code: 40029 },
      })
    }
    if (options.complete) options.complete()
  }
  const defaultConsoleError = console.error
  console.error = function quietExpectedLoginFailure() {}
  await me.loginWechat()
  console.error = defaultConsoleError
  assert.strictEqual(harness.toasts[harness.toasts.length - 1], '微信登录失败：40029')
  assert.strictEqual(harness.storage['homechief:session'], undefined)
  global.wx.request = defaultRequest
  harness.requests.length = 0
  me.onNicknameInput({ detail: { value: '小刘' } })
  me.chooseRegisterAvatar()
  await me.loginWechat()
  assert.strictEqual(me.data.isGuest, false)
  assert.strictEqual(harness.storage['homechief:session'].token, 'backend-token')
  assert.strictEqual(harness.storage['homechief:session'].user.nickname, '小刘')
  assert.strictEqual(harness.storage['homechief:session'].user.avatar_url, '/tmp/homechief-test.jpg')
  assert.strictEqual(harness.storage['homechief:session'].needs_onboarding, true)
  assert.strictEqual(harness.requests[0].data.code, 'wx-test-code')
  assert.strictEqual(harness.requests[0].data.nickname, '小刘')
  assert.strictEqual(harness.requests[0].data.avatar_url, '/tmp/homechief-test.jpg')
  assert.ok(harness.requests[0].url.includes('/functions/v1/wechat-login'))
  me.onFamilyNameInput({ detail: { value: '刘家小馆' } })
  await me.createFamily()
  assert.strictEqual(harness.storage['homechief:session'].family.id, 'family-backend')
  assert.strictEqual(harness.storage['homechief:session'].family.name, '刘家小馆')
  assert.strictEqual(harness.storage['homechief:session'].family.invite_code, 'HC88AA')
  assert.strictEqual(harness.storage['homechief:session'].needs_onboarding, false)
  assert.strictEqual(harness.requests[1].data.family_name, '刘家小馆')
  assert.strictEqual(harness.requests[1].header.Authorization, 'Bearer backend-token')
  assert.ok(harness.requests[1].url.includes('/functions/v1/family-onboarding'))
  me.onFamilyRenameInput({ detail: { value: '周末厨房' } })
  await me.updateFamilyName()
  assert.strictEqual(harness.requests[2].data.action, 'update_family_name')
  assert.strictEqual(harness.requests[2].data.family_name, '周末厨房')
  assert.strictEqual(harness.storage['homechief:session'].family.name, '周末厨房')
  me.chooseRegisterAvatar()
  await me.updateAvatar()
  assert.strictEqual(harness.requests[3].data.action, 'update_profile')
  assert.strictEqual(harness.requests[3].data.avatar_url, '/tmp/homechief-test.jpg')
  me.logout()
  assert.strictEqual(me.data.isGuest, true)
  assert.strictEqual(harness.storage['homechief:session'], undefined)
  me.onNicknameInput({ detail: { value: '加入者' } })
  await me.loginWechat()
  me.onFamilyCodeInput({ detail: { value: 'hc88aa' } })
  await me.joinFamily()
  assert.strictEqual(harness.requests[5].data.action, 'join_family')
  assert.strictEqual(harness.requests[5].data.family_code, 'hc88aa')
  assert.strictEqual(harness.storage['homechief:session'].family.id, 'family-join')
  assert.strictEqual(harness.storage['homechief:session'].family.role, 'member')
  me.logout()

  harness.storage['homechief:session'] = {
    token: 'test-token',
    user: { id: 'user-1', nickname: '测试用户' },
    family: { id: 'family-1', name: '林家的厨房' },
  }
  publish.onShow()
  feed.onShow()
  assert.strictEqual(feed.data.isGuest, false)
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

async function main() {
  checkAppStructure()
  checkPackOptions()
  checkSyntax()
  checkMockImages()
  await runFlowAssertions()
  console.log('homechief flow tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
