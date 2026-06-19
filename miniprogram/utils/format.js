function joinTags(tags) {
  return Array.isArray(tags) ? tags.join(' · ') : ''
}

function pluralizeCount(count, unit) {
  return `${count}${unit}`
}

function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text || ''
  return `${text.slice(0, maxLength)}...`
}

module.exports = {
  joinTags,
  pluralizeCount,
  truncate,
}
