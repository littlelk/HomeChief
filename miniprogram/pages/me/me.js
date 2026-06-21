const { family, drafts } = require('../../data/homechief')
const { clearSession, getDemoSession, getSession, isLoggedIn, setSession } = require('../../services/auth')

Page({
  data: {
    family,
    drafts,
    isGuest: true,
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
    setSession(getDemoSession())
    this.onShow()
    wx.showToast({ title: '已进入体验家庭', icon: 'success' })
  },

  logout() {
    clearSession()
    this.onShow()
    wx.showToast({ title: '已退出登录', icon: 'none' })
  },
})
