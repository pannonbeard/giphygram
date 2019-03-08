// sw Version
const version = 1.0

// Static Cache -app shell
const appAssets = [
  'index.html',
  'main.js',
  'images/flame.png',
  'images/logo.png',
  'images/sync.png',
  'vendor/bootstrap.min.css',
  'vendor/jquery.min.js'
]

// SW install
self.addEventListener('install', e => {

  e.waitUntil(
    caches.open(`static-${version}`)
      .then( cache => cache.addAll(appAssets))
  )
})

self.addEventListener('activate', e => {
  // Clean static cache

  let cleaned = caches.keys().then( keys => {
    keys.forEach( key => {
      if (key !== `static-${version}` && key.match('static-')){
        return caches.delete(key)
      }
    })
  })

  e.waitUntil(cleaned)
})

// static cache strategy - cache with network fallback
const staticCache = (req, cacheName = `static-${version}`) => {
  return caches.match(req)
    .then( cachedRes => {
      if(cachedRes) return cachedRes
      // fall back to network
      return fetch(req).then( networkRes => {
        //update cache
        caches.open(cacheName)
          .then( cache => cache.put(req, networkRes))
        // return clone
        return networkRes.clone()
      })
    })
}

// Network with cache fallback
const fallbackCache = (req) => {
  return fetch(req)
    .then( networkRes => {
      // check res is ok, else go to cache
      if(!networkRes.ok ) throw 'Fetch Error'
      caches.open(`static-${version}`)
        .then( cache => cache.put(req, networkRes) )
        return networkRes.clone()
    })
    .catch( err => caches.match(req) )
}

// clean old pgiphyes form giphy cache
const cleanGifphyCache = (giphys) => {
  caches.open('giphy')
    .then( cache => {
      cache.keys().then( keys => {
        keys.forEach( key => {
          // if Entry is not part of current giphys
          if(!giphys.includes(key.url)) cache.delete(key)
        })
      })
    })
}

// Cache Fetch requests in multiple ways
self.addEventListener('fetch', e => {
  //app shell
  if(e.request.url.match(location.origin)){
    e.respondWith( staticCache(e.request) )
  } else if (e.request.url.match('api.giphy.com/v1/gifs/trending')){
    e.respondWith( fallbackCache(e.request) )
  } else if (e.request.url.match('giphy.com/media')){
    e.respondWith( staticCache(e.request, 'giphy') )
  }
})

// listen for message from client

self.addEventListener('message', e => {
  // identify the message
  if( e.data.action === 'cleanGiphyCache' ) cleanGifphyCache(e.data.giphys)
})