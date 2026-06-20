Component({
  properties: {
    mark: { type: String, value: '＋' },
    title: { type: String, value: '' },
    body: { type: String, value: '' },
    actionText: { type: String, value: '' },
  },
  methods: {
    onAction() {
      this.triggerEvent('action')
    },
  },
})
