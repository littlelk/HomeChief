const { family, drafts } = require('../../data/homechief')
const { clearSession, getSession, isLoggedIn, loginWithWechatProfile } = require('../../services/auth')

Page({
  data: {
    family,
    drafts,
    isGuest: true,
    isLoggingIn: false,
    session: null,
    settings: ['家庭成员', '草稿箱', '通知设置', '数据导出', '隐私设置'],
  },

  onShow() {
    this.setData({
      drafts,
      isGuest: !isLoggedIn(),
      session: getSession(),
    })
  },

  loginDemo() {
    if (this.data.isLoggingIn) return
    this.setData({ isLoggingIn: true })
    return loginWithWechatProfile({ nickname: '体验用户' })
      .then(() => {
        this.onShow()
        wx.showToast({ title: '已登录', icon: 'success' })
      })
      .catch(() => {
        wx.showToast({ title: '登录失败，请重试', icon: 'none' })
      })
      .finally(() => {
        this.setData({ isLoggingIn: false })
      })
  },

  logout() {
    clearSession()
    this.onShow()
    wx.showToast({ title: '已退出登录', icon: 'none' })
  },
})
