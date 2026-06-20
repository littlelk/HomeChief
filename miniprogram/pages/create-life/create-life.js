Page({
  data: {
    recipeId: '',
    body: '',
    photos: [],
    tags: ['生活', '饭菜'],
    uploadError: '',
  },

  onLoad(query) {
    this.setData({ recipeId: query.recipeId || '' })
  },

  onBodyInput(event) {
    this.setData({ body: event.detail.value })
  },

  choosePhotos() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      success: (res) => {
        const photos = res.tempFiles.map((file) => file.tempFilePath)
        this.setData({ photos: this.data.photos.concat(photos), uploadError: '' })
      },
      fail: () => this.setData({ uploadError: '图片上传失败，请重试。' }),
    })
  },

  publish() {
    if (!this.data.body.trim() && this.data.photos.length === 0) {
      wx.showToast({ title: '写点文字或传张照片', icon: 'none' })
      return
    }
    wx.showToast({ title: '已发布', icon: 'success' })
    setTimeout(() => wx.switchTab({ url: '/pages/feed/feed' }), 500)
  },
})
