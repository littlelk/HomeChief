const { family } = require('./data/homechief')

App({
  onLaunch() {
    console.log('HomeChief Launch')
  },

  globalData: {
    family,
    draftRecipe: null,
    draftLifePost: null,
  },
})
