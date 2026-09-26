function countLabel(n, one, many) {
  var v = Number(n) || 0
  return new Intl.NumberFormat('en-US').format(v) + ' ' + (v === 1 ? one : many)
}

function applyCounts(counts) {
  if (!counts) return
  var listed = {}
  Object.keys(counts).forEach(function (id) {
    var stats = counts[id] || { loves: 0, downloads: 0 }
    var downloads = Number(stats.downloads) || 0
    var downloadNodes = document.querySelectorAll('[data-downloads-for="' + id + '"]')
    document.querySelectorAll('[data-loves-for="' + id + '"]').forEach(function (el) {
      el.textContent = countLabel(stats.loves, 'love', 'loves')
    })
    downloadNodes.forEach(function (el) {
      el.textContent = countLabel(downloads, 'download', 'downloads')
    })
    document.querySelectorAll('[data-wallpaper-id="' + id + '"]').forEach(function (el) {
      el.setAttribute('data-downloads', String(downloads))
    })
    if (downloadNodes.length) listed[id] = downloads
  })
  sortShelves(currentSort())
  var total = 0
  Object.keys(listed).forEach(function (id) { total += listed[id] })
  document.querySelectorAll('[data-total-downloads]').forEach(function (el) {
    el.textContent = countLabel(total, 'download', 'downloads')
  })
}

function refreshBoard() {
  ;[1200, 4000, 10000].forEach(function (delay) {
    window.setTimeout(function () {
      fetch('/api/board', { cache: 'no-store', credentials: 'same-origin' })
        .then(function (res) { return res.ok ? res.json() : null })
        .then(function (data) { if (data && data.counts) applyCounts(data.counts) })
        .catch(function () {})
    }, delay)
  })
}

function copyText(value) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(value)
  }
  return new Promise(function (resolve, reject) {
    var input = document.createElement('textarea')
    input.value = value
    input.setAttribute('readonly', '')
    input.style.position = 'fixed'
    input.style.left = '-9999px'
    document.body.appendChild(input)
    input.select()
    try {
      if (!document.execCommand('copy')) throw new Error('copy failed')
      resolve()
    } catch (err) {
      reject(err)
    } finally {
      input.remove()
    }
  })
}

document.querySelectorAll('[data-share-url]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var url = btn.getAttribute('data-share-url')
    if (!url) return
    copyText(url).then(function () {
      var previous = btn.textContent
      btn.textContent = 'Copied'
      window.setTimeout(function () { btn.textContent = previous }, 1600)
    }).catch(function () {
      btn.textContent = 'Copy failed'
      window.setTimeout(function () { btn.textContent = 'Share' }, 1600)
    })
  })
})

document.querySelectorAll('[data-download-all]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var packs = []
    try { packs = JSON.parse(btn.getAttribute('data-packs') || '[]') } catch (err) { return }
    if (!Array.isArray(packs)) return
    var nonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 12)
    fetch('/api/saved', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nonce: nonce }),
    }).then(function (res) { return res.ok ? res.json() : null })
      .then(function (data) { if (data && data.counts) applyCounts(data.counts) })
      .catch(function () {})
    packs.forEach(function (pack) {
      if (!pack || typeof pack.href !== 'string' || typeof pack.filename !== 'string') return
      if (!/^\/packs\/wallpapers-\d{2}\.zip$/.test(pack.href)) return
      if (!/^wallpapers-\d{2}\.zip$/.test(pack.filename)) return
      var link = document.createElement('a')
      link.href = pack.href
      link.download = pack.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
    })
    refreshBoard()
  })
})

document.querySelectorAll('a[data-download]').forEach(function (link) {
  link.addEventListener('click', refreshBoard)
})

var heroRail = document.querySelector('[data-hero-rail]')
if (heroRail) {
  var heroSlides = Array.prototype.slice.call(heroRail.querySelectorAll('[data-wallpaper-id]'))
  var heroCount = document.querySelector('[data-hero-count]')

  function heroIndex() {
    var width = heroRail.clientWidth || 1
    var index = Math.round(heroRail.scrollLeft / width)
    if (index < 0) return 0
    if (index > heroSlides.length - 1) return heroSlides.length - 1
    return index
  }

  function heroUpdate() {
    if (!heroCount || !heroSlides.length) return
    heroCount.textContent = (heroIndex() + 1) + ' / ' + heroSlides.length
  }

  function heroGo(index, behavior) {
    if (!heroSlides.length) return
    var next = (index + heroSlides.length) % heroSlides.length
    var slide = heroSlides[next]
    heroRail.scrollTo({ left: slide.offsetLeft, behavior: behavior || 'smooth' })
  }

  function heroShowHash(behavior) {
    var id = decodeURIComponent((location.hash || '').replace(/^#/, ''))
    if (!id) return
    for (var i = 0; i < heroSlides.length; i += 1) {
      if (heroSlides[i].getAttribute('data-wallpaper-id') === id) {
        heroGo(i, behavior || 'auto')
        return
      }
    }
  }

  document.querySelectorAll('[data-hero]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dir = btn.getAttribute('data-hero') === 'next' ? 1 : -1
      heroGo(heroIndex() + dir, 'smooth')
    })
  })

  heroRail.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      heroGo(heroIndex() + 1, 'smooth')
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      heroGo(heroIndex() - 1, 'smooth')
    }
  })

  heroRail.addEventListener('scroll', function () {
    window.requestAnimationFrame(heroUpdate)
  })

  window.addEventListener('hashchange', function () { heroShowHash('smooth') })
  heroShowHash('auto')
  heroUpdate()
}

function currentSort() {
  try {
    return sessionStorage.getItem('wallpapers-sort') === 'popular' ? 'popular' : 'recent'
  } catch (err) {
    return 'recent'
  }
}

function sortShelves(mode) {
  var popular = mode === 'popular'
  document.querySelectorAll('.shelf-grid').forEach(function (grid) {
    var cards = Array.prototype.slice.call(grid.children)
    cards.sort(function (a, b) {
      if (popular) {
        var da = Number(a.getAttribute('data-downloads')) || 0
        var db = Number(b.getAttribute('data-downloads')) || 0
        if (da !== db) return db - da
      }
      var aa = a.getAttribute('data-added') || ''
      var ba = b.getAttribute('data-added') || ''
      if (aa !== ba) return aa < ba ? 1 : -1
      var ia = a.getAttribute('data-wallpaper-id') || ''
      var ib = b.getAttribute('data-wallpaper-id') || ''
      if (ia !== ib) return ia < ib ? -1 : 1
      return 0
    })
    cards.forEach(function (card) { grid.appendChild(card) })
  })
}

function setSort(mode, persist) {
  var next = mode === 'popular' ? 'popular' : 'recent'
  document.querySelectorAll('[data-sort]').forEach(function (btn) {
    btn.setAttribute('aria-pressed', btn.getAttribute('data-sort') === next ? 'true' : 'false')
  })
  if (persist) {
    try { sessionStorage.setItem('wallpapers-sort', next) } catch (err) {}
  }
  sortShelves(next)
}

document.querySelectorAll('[data-sort]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    setSort(btn.getAttribute('data-sort'), true)
  })
})
setSort(currentSort(), false)
