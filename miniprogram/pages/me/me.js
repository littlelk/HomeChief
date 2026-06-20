const { family, drafts } = require('../../data/homechief')

Page({
  data: {
    family,
    drafts,
    settings: ['家庭成员', '草稿箱', '通知设置', '数据导出', '隐私设置'],
  },

  onShow() {
    this.setData({ drafts })
  },
})
