const FUNCTION_BASE_URL = 'https://yuakqdpgpgscmlppjsjs.supabase.co/functions/v1'

function callFunction(name, data, options = {}) {
  return new Promise((resolve, reject) => {
    if (typeof wx === 'undefined' || !wx.request) {
      reject(new Error('wx_request_unavailable'))
      return
    }
    wx.request({
      url: `${FUNCTION_BASE_URL}/${name}`,
      method: options.method || 'POST',
      data,
      header: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }
        const error = new Error((res.data && res.data.error) || 'backend_error')
        error.statusCode = res.statusCode
        reject(error)
      },
      fail(error) {
        reject(error)
      },
    })
  })
}

function loginWithCode(payload) {
  return callFunction('wechat-login', payload)
}

function createFamily(payload, token) {
  return callFunction('family-onboarding', Object.assign({ action: 'create_family' }, payload), { token })
}

function joinFamily(payload, token) {
  return callFunction('family-onboarding', Object.assign({ action: 'join_family' }, payload), { token })
}

function updateFamilyName(payload, token) {
  return callFunction('family-onboarding', Object.assign({ action: 'update_family_name' }, payload), { token })
}

function updateProfile(payload, token) {
  return callFunction('family-onboarding', Object.assign({ action: 'update_profile' }, payload), { token })
}

module.exports = {
  FUNCTION_BASE_URL,
  callFunction,
  createFamily,
  joinFamily,
  loginWithCode,
  updateFamilyName,
  updateProfile,
}
