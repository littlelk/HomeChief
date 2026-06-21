const { requireLogin } = require('../../services/auth')

Page({
  onShow() {
    if (!requireLogin('登录后可以发布家庭动态、上传照片和记录菜谱。')) {
      wx.switchTab({ url: '/pages/index/index' })
      return
    }
    wx.setStorageSync('homechief:openPublishSheet', true)
    wx.switchTab({ url: '/pages/index/index' })
  },
})
