const { family, posts, recipes, drafts, getRecentRecipes } = require('../../data/homechief')

Page({
  data: {
    family,
    activeMode: 'feed',
    posts,
    recipes,
    quickRecipes: getRecentRecipes(2),
    drafts,
    showPublishSheet: false,
  },

  setMode(event) {
    this.setData({ activeMode: event.currentTarget.dataset.mode })
  },

  openPublishSheet() {
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
