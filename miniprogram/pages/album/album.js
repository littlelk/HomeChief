const { albumGroups, getAlbumPhotoCount } = require('../../data/homechief')

function filterGroups(filter) {
  if (filter === '全部') return albumGroups
  if (filter === '饭菜') {
    return albumGroups.map((group) => Object.assign({}, group, {
      photos: group.photos.slice(0, Math.max(1, Math.ceil(group.photos.length / 2))),
    }))
  }
  return []
}

Page({
  data: {
    filters: ['全部', '饭菜', '生活', '人物', '节日'],
    activeFilter: '全部',
    albumGroups,
    visibleAlbumGroups: albumGroups,
    photoCount: getAlbumPhotoCount(),
  },

  onShow() {
    this.refreshData()
  },

  refreshData() {
    this.setData({
      albumGroups,
      photoCount: getAlbumPhotoCount(),
      visibleAlbumGroups: filterGroups(this.data.activeFilter),
    })
  },

  setFilter(event) {
    const activeFilter = event.currentTarget.dataset.filter
    this.setData({
      activeFilter,
      visibleAlbumGroups: filterGroups(activeFilter),
    })
  },
})
