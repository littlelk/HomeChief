const { albumGroups, getAlbumPhotoCount } = require('../../data/homechief')

Page({
  data: {
    filters: ['全部', '饭菜', '生活', '人物', '节日'],
    activeFilter: '全部',
    albumGroups,
    photoCount: getAlbumPhotoCount(),
  },

  setFilter(event) {
    this.setData({ activeFilter: event.currentTarget.dataset.filter })
  },
})
