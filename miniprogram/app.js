const { family, initHomeChiefStorage } = require('./data/homechief')

App({
  onLaunch() {
    initHomeChiefStorage()
    console.log('HomeChief Launch')
  },

  globalData: {
    family,
    draftRecipe: null,
    draftLifePost: null,
  },
})
