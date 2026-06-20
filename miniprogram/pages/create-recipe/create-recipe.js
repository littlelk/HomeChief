const { findRecipeById, upsertRecipeFromForm, saveDraft } = require('../../data/homechief')

function cloneSteps(steps) {
  return steps.map((step) => Object.assign({}, step))
}

function saveChosenFile(tempFilePath, done) {
  if (!wx.saveFile) {
    done(tempFilePath)
    return
  }
  wx.saveFile({
    tempFilePath,
    success: (res) => done(res.savedFilePath || tempFilePath),
    fail: () => done(tempFilePath),
  })
}

Page({
  data: {
    id: '',
    name: '',
    note: '',
    tags: ['晚餐', '快手菜'],
    cover: '',
    ingredientsText: '',
    steps: [{ title: '', body: '', image: '' }],
    uploadError: '',
  },

  onLoad(query) {
    if (!query.id) return
    const recipe = findRecipeById(query.id)
    if (!recipe) return
    this.setData({
      id: recipe.id,
      name: recipe.name,
      note: recipe.note,
      tags: recipe.tags.slice(),
      cover: recipe.cover,
      ingredientsText: recipe.ingredients.join('\n'),
      steps: cloneSteps(recipe.steps),
    })
  },

  onNameInput(event) {
    this.setData({ name: event.detail.value })
  },

  onNoteInput(event) {
    this.setData({ note: event.detail.value })
  },

  onIngredientsInput(event) {
    this.setData({ ingredientsText: event.detail.value })
  },

  onStepTitleInput(event) {
    const index = event.currentTarget.dataset.index
    const steps = cloneSteps(this.data.steps)
    steps[index].title = event.detail.value
    this.setData({ steps })
  },

  onStepBodyInput(event) {
    const index = event.currentTarget.dataset.index
    const steps = cloneSteps(this.data.steps)
    steps[index].body = event.detail.value
    this.setData({ steps })
  },

  addStep() {
    this.setData({ steps: this.data.steps.concat([{ title: '', body: '', image: '' }]) })
  },

  chooseCover() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        saveChosenFile(res.tempFiles[0].tempFilePath, (cover) => {
          this.setData({ cover, uploadError: '' })
        })
      },
      fail: () => this.setData({ uploadError: '图片上传失败，请重试。' }),
    })
  },

  chooseStepImage(event) {
    const index = event.currentTarget.dataset.index
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        saveChosenFile(res.tempFiles[0].tempFilePath, (image) => {
          const steps = cloneSteps(this.data.steps)
          steps[index].image = image
          this.setData({ steps, uploadError: '' })
        })
      },
      fail: () => this.setData({ uploadError: '图片上传失败，请重试。' }),
    })
  },

  saveDraft() {
    saveDraft('recipe', this.data.name || '未命名菜谱')
    wx.showToast({ title: '已保存草稿', icon: 'success' })
  },

  publish() {
    if (!this.data.name.trim()) {
      wx.showToast({ title: '先写菜名', icon: 'none' })
      return
    }
    upsertRecipeFromForm(this.data)
    wx.showToast({ title: '已发布到动态', icon: 'success' })
    setTimeout(() => wx.switchTab({ url: '/pages/feed/feed' }), 500)
  },
})
