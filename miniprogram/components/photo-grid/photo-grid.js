Component({
  properties: {
    photos: { type: Array, value: [] },
  },
  data: {
    layout: 'single',
  },
  observers: {
    photos(photos) {
      const count = Array.isArray(photos) ? photos.length : 0
      this.setData({ layout: count <= 1 ? 'single' : 'grid' })
    },
  },
  methods: {
    onPreview(event) {
      const current = event.currentTarget.dataset.src
      wx.previewImage({
        current,
        urls: this.properties.photos,
      })
    },
  },
})
