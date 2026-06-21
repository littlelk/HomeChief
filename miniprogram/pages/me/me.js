const { family, drafts } = require('../../data/homechief')
const {
  clearSession,
  createFamilyForCurrentUser,
  getSession,
  isLoggedIn,
  joinFamilyForCurrentUser,
  loginWithDemoSession,
  loginWithWechatProfile,
  updateFamilyNameForCurrentUser,
  updateProfileForCurrentUser,
} = require('../../services/auth')

function loginErrorTitle(error) {
  const data = error && error.data ? error.data : {}
  if (data.error === 'wechat_exchange_failed') {
    return data.wechat_error_code ? `微信登录失败：${data.wechat_error_code}` : '微信登录失败'
  }
  if (data.error === 'database_error') {
    return data.db_error_code ? `数据库错误：${data.db_error_code}` : '数据库错误'
  }
  if (error && error.errMsg) return '网络请求失败'
  return '登录失败，请重试'
}

function showLoginError(error) {
  if (typeof console !== 'undefined' && console.error) {
    console.error('HomeChief login failed', error)
  }
  wx.showToast({ title: loginErrorTitle(error), icon: 'none' })
}

Page({
  data: {
    family,
    drafts,
    isGuest: true,
    isCreatingFamily: false,
    isJoiningFamily: false,
    isLoggingIn: false,
    isUpdatingAvatar: false,
    isUpdatingFamily: false,
    familyName: '',
    familyCode: '',
    familyRenameName: '',
    nickname: '微信用户',
    avatarUrl: '',
    session: null,
    settings: ['家庭成员', '草稿箱', '通知设置', '数据导出', '隐私设置'],
  },

  onShow() {
    const session = getSession()
    this.setData({
      drafts,
      isGuest: !isLoggedIn(),
      session,
      familyRenameName: session && session.family ? session.family.name : this.data.familyRenameName,
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
      .catch((error) => {
        showLoginError(error)
      })
      .finally(() => {
        this.setData({ isLoggingIn: false })
      })
  },

  loginWechat() {
    if (this.data.isLoggingIn) return
    this.setData({ isLoggingIn: true })
    return loginWithWechatProfile({
      nickname: this.data.nickname.trim() || '微信用户',
      avatar_url: this.data.avatarUrl,
    })
      .then(() => {
        this.onShow()
        wx.showToast({ title: '已登录', icon: 'success' })
      })
      .catch((error) => {
        showLoginError(error)
      })
      .finally(() => {
        this.setData({ isLoggingIn: false })
      })
  },

  onNicknameInput(event) {
    this.setData({ nickname: event.detail.value })
  },

  chooseRegisterAvatar() {
    if (typeof wx === 'undefined' || !wx.chooseMedia) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (file && file.tempFilePath) this.setData({ avatarUrl: file.tempFilePath })
      },
    })
  },

  onFamilyNameInput(event) {
    this.setData({ familyName: event.detail.value })
  },

  onFamilyCodeInput(event) {
    this.setData({ familyCode: event.detail.value })
  },

  onFamilyRenameInput(event) {
    this.setData({ familyRenameName: event.detail.value })
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

  joinFamily() {
    if (this.data.isJoiningFamily) return
    const familyCode = this.data.familyCode.trim()
    if (!familyCode) {
      wx.showToast({ title: '请填写家庭 ID', icon: 'none' })
      return
    }
    this.setData({ isJoiningFamily: true })
    return joinFamilyForCurrentUser(familyCode)
      .then(() => {
        this.onShow()
        wx.showToast({ title: '已加入家庭', icon: 'success' })
      })
      .catch(() => {
        wx.showToast({ title: '加入失败，请检查家庭 ID', icon: 'none' })
      })
      .finally(() => {
        this.setData({ isJoiningFamily: false })
      })
  },

  updateFamilyName() {
    if (this.data.isUpdatingFamily) return
    const familyName = this.data.familyRenameName.trim()
    if (!familyName) {
      wx.showToast({ title: '请填写家庭名', icon: 'none' })
      return
    }
    this.setData({ isUpdatingFamily: true })
    return updateFamilyNameForCurrentUser(familyName)
      .then(() => {
        this.onShow()
        wx.showToast({ title: '家庭名已更新', icon: 'success' })
      })
      .catch(() => {
        wx.showToast({ title: '更新失败，请重试', icon: 'none' })
      })
      .finally(() => {
        this.setData({ isUpdatingFamily: false })
      })
  },

  updateAvatar() {
    if (this.data.isUpdatingAvatar) return
    if (!this.data.avatarUrl) {
      wx.showToast({ title: '请先选择头像', icon: 'none' })
      return
    }
    this.setData({ isUpdatingAvatar: true })
    return updateProfileForCurrentUser({ avatar_url: this.data.avatarUrl })
      .then(() => {
        this.onShow()
        wx.showToast({ title: '头像已更新', icon: 'success' })
      })
      .catch(() => {
        wx.showToast({ title: '头像更新失败', icon: 'none' })
      })
      .finally(() => {
        this.setData({ isUpdatingAvatar: false })
      })
  },

  logout() {
    clearSession()
    this.onShow()
    wx.showToast({ title: '已退出登录', icon: 'none' })
  },
})
