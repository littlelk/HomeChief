const SESSION_KEY = 'homechief:session'

function getSession() {
  if (typeof wx === 'undefined' || !wx.getStorageSync) return null
  return wx.getStorageSync(SESSION_KEY) || null
}

function setSession(session) {
  if (typeof wx === 'undefined' || !wx.setStorageSync) return
  wx.setStorageSync(SESSION_KEY, session)
}

function clearSession() {
  if (typeof wx === 'undefined' || !wx.removeStorageSync) return
  wx.removeStorageSync(SESSION_KEY)
}

function isLoggedIn() {
  const session = getSession()
  return !!(session && session.token && session.user)
}

function getDemoSession() {
  return {
    token: 'demo-review-token',
    user: {
      id: 'demo-user',
      nickname: '体验用户',
      avatar: '家',
    },
    family: {
      id: 'demo-family',
      name: '林家的厨房',
      role: 'owner',
    },
  }
}

function requireLogin(reason) {
  if (isLoggedIn()) return true
  if (typeof wx !== 'undefined' && wx.showModal) {
    wx.showModal({
      title: '需要登录',
      content: reason || '登录后可以继续使用家庭记录功能。',
      confirmText: '去登录',
      cancelText: '先看看',
      success(res) {
        if (res.confirm && wx.switchTab) wx.switchTab({ url: '/pages/me/me' })
      },
    })
  }
  return false
}

module.exports = {
  SESSION_KEY,
  getSession,
  setSession,
  clearSession,
  isLoggedIn,
  getDemoSession,
  requireLogin,
}
