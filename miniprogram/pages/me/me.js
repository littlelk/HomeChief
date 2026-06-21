const { family, drafts } = require('../../data/homechief')
const { clearSession, createFamilyForCurrentUser, getSession, isLoggedIn, loginWithDemoSession, loginWithWechatProfile } = require('../../services/auth')

Page({
  data: {
    family,
    drafts,
    isGuest: true,
    isCreatingFamily: false,
    isLoggingIn: false,
    familyName: '',
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
    return loginWithDemoSession()
      .then(() => {
        this.onShow()
        wx.showToast({ title: '已进入体验', icon: 'success' })
      })
      .catch(() => {
        wx.showToast({ title: '登录失败，请重试', icon: 'none' })
      })
      .finally(() => {
        this.setData({ isLoggingIn: false })
      })
  },

  loginWechat() {
    if (this.data.isLoggingIn) return
    this.setData({ isLoggingIn: true })
    return loginWithWechatProfile({ nickname: '微信用户' })
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

  onFamilyNameInput(event) {
    this.setData({ familyName: event.detail.value })
  },

  createFamily() {
    if (this.data.isCreatingFamily) return
    const familyName = this.data.familyName.trim()
    if (!familyName) {
      wx.showToast({ title: '请先填写家庭名', icon: 'none' })
      return
    }
    this.setData({ isCreatingFamily: true })
    return createFamilyForCurrentUser(familyName)
      .then(() => {
        this.onShow()
        wx.showToast({ title: '家庭已创建', icon: 'success' })
      })
      .catch(() => {
        wx.showToast({ title: '创建失败，请重试', icon: 'none' })
      })
      .finally(() => {
        this.setData({ isCreatingFamily: false })
      })
  },

  logout() {
    clearSession()
    this.onShow()
    wx.showToast({ title: '已退出登录', icon: 'none' })
  },
})
