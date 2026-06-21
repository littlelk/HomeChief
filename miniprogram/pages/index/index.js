const { family, posts, recipes, drafts, getRecentRecipes } = require('../../data/homechief')
const { isLoggedIn, requireLogin } = require('../../services/auth')

Page({
  data: {
    family,
    activeMode: 'feed',
    posts,
    recipes,
    quickRecipes: getRecentRecipes(2),
    drafts,
    isGuest: true,
    showPublishSheet: false,
  },

  onShow() {
    this.refreshData()
    this.setData({ isGuest: !isLoggedIn() })
    const shouldOpenPublishSheet = wx.getStorageSync('homechief:openPublishSheet')
    if (shouldOpenPublishSheet) {
      wx.removeStorageSync('homechief:openPublishSheet')
      this.openPublishSheet()
    }
  },

  refreshData() {
    this.setData({
      posts,
      recipes,
      quickRecipes: getRecentRecipes(2),
      drafts,
    })
  },

  setMode(event) {
    this.setData({ activeMode: event.currentTarget.dataset.mode })
  },

  openPublishSheet() {
    if (!requireLogin('登录后可以把这顿饭记录到家里。')) return
    this.setData({ showPublishSheet: true })
  },

  closePublishSheet() {
    this.setData({ showPublishSheet: false })
  },

  noop() {},

  goCreateRecipe() {
    this.closePublishSheet()
    wx.navigateTo({ url: '/pages/create-recipe/create-recipe' })
  },

  goCreateLife() {
    this.closePublishSheet()
    wx.navigateTo({ url: '/pages/create-life/create-life' })
  },

  goRecipe(event) {
    const id = event.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/recipe-detail/recipe-detail?id=${id}` })
  },

  goRecipes() {
    wx.switchTab({ url: '/pages/recipes/recipes' })
  },
})
