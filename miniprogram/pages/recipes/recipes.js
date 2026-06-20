const { recipes } = require('../../data/homechief')

Page({
  data: {
    query: '',
    activeFilter: '全部',
    filters: ['全部', '最近做过', '家常菜', '快手菜', '孩子爱吃', '待完善'],
    recipes,
    visibleRecipes: recipes,
  },

  onSearch(event) {
    this.setData({ query: event.detail.value }, this.applyFilters)
  },

  setFilter(event) {
    this.setData({ activeFilter: event.currentTarget.dataset.filter }, this.applyFilters)
  },

  applyFilters() {
    const query = this.data.query.trim()
    const filter = this.data.activeFilter
    const visibleRecipes = recipes.filter((recipe) => {
      const matchesQuery = !query || recipe.name.includes(query) || recipe.ingredients.join('').includes(query) || recipe.note.includes(query)
      const matchesFilter = filter === '全部' || filter === '最近做过' || recipe.tags.includes(filter)
      return matchesQuery && matchesFilter
    })
    this.setData({ visibleRecipes })
  },

  goDetail(event) {
    wx.navigateTo({ url: `/pages/recipe-detail/recipe-detail?id=${event.currentTarget.dataset.id}` })
  },

  goCreateRecipe() {
    wx.navigateTo({ url: '/pages/create-recipe/create-recipe' })
  },
})
