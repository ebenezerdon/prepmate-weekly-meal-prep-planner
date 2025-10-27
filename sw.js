const CACHE_NAME = "prepmate-v1"
const PRECACHE = [
	"/",
	"/index.html",
	"/app.html",
	"/styles/main.css",
	"/scripts/helpers.js",
	"/scripts/ui.js",
	"/scripts/main.js",
	"/manifest.json",
	"/icons/icon-192.svg",
	"/icons/icon-512.svg",
]

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
	)
	self.skipWaiting()
})

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k)))
				)
			)
	)
	self.clients.claim()
})

self.addEventListener("fetch", (event) => {
	const req = event.request
	if (req.method !== "GET") return
	event.respondWith(
		caches.match(req).then((cached) => {
			if (cached) {
				// update cache in background
				event.waitUntil(
					fetch(req)
						.then((res) =>
							caches
								.open(CACHE_NAME)
								.then((cache) => cache.put(req, res.clone()))
						)
						.catch(() => {})
				)
				return cached
			}
			return fetch(req)
				.then((res) => {
					// cache responses for future
					const copy = res.clone()
					caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
					return res
				})
				.catch(() => caches.match("/app.html"))
		})
	)
})
