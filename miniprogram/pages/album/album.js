const { albumGroups, getAlbumPhotoCount } = require('../../data/homechief')

function filterGroups(filter) {
  if (filter === '全部') return albumGroups
  return albumGroups
    .map((group) => {
      const items = (group.items || []).filter((item) => item.tags.includes(filter))
      return Object.assign({}, group, {
        items,
        photos: items.map((item) => item.src),
        count: items.length,
      })
    })
    .filter((group) => group.photos.length)
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
