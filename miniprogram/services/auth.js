const SESSION_KEY = 'homechief:session'
const { loginWithCode } = require('./backend')

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

function loginWithWechatProfile(profile = {}) {
  return new Promise((resolve, reject) => {
    if (typeof wx === 'undefined' || !wx.login) {
      reject(new Error('wx_login_unavailable'))
      return
    }
    wx.login({
      success(res) {
        if (!res.code) {
          reject(new Error('missing_wechat_code'))
          return
        }
        loginWithCode({
          code: res.code,
          nickname: profile.nickname,
          avatar_url: profile.avatar_url,
        })
          .then((session) => {
            setSession(session)
            resolve(session)
          })
          .catch(reject)
      },
      fail(error) {
        reject(error)
      },
    })
  })
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
  loginWithWechatProfile,
  requireLogin,
}
