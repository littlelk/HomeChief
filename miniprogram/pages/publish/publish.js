Page({
  onShow() {
    wx.setStorageSync('homechief:openPublishSheet', true)
    wx.switchTab({ url: '/pages/feed/feed' })
  },
})
