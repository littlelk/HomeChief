const { findRecipeById, getPostsByRecipeId } = require('../../data/homechief')

Page({
  data: {
    recipeId: '',
    recipe: null,
    relatedPosts: [],
  },

  onLoad(query) {
    this.setData({ recipeId: query.id || '' })
    this.loadRecipe(query.id)
  },

  onShow() {
    if (this.data.recipeId) this.loadRecipe(this.data.recipeId)
  },

  loadRecipe(id) {
    const recipe = findRecipeById(id)
    if (!recipe) {
      wx.showToast({ title: '菜谱不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 600)
      return
    }
    this.setData({
      recipe,
      relatedPosts: getPostsByRecipeId(recipe.id),
    })
  },

  cookAgain() {
    wx.navigateTo({ url: `/pages/create-life/create-life?recipeId=${this.data.recipe.id}` })
  },

  editRecipe() {
    wx.navigateTo({ url: `/pages/create-recipe/create-recipe?id=${this.data.recipe.id}` })
  },
})
