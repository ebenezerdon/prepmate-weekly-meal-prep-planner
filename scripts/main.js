$(function () {
	try {
		const hasApp = !!window.App
		const hasInit = hasApp && typeof window.App.init === "function"
		const hasRender = hasApp && typeof window.App.render === "function"
		if (!hasApp || !hasInit || !hasRender) {
			const details = {
				hasApp,
				hasInit,
				hasRender,
				availableKeys: hasApp ? Object.keys(window.App || {}) : [],
				hint: "Define in scripts/ui.js: window.App = window.App || {}; App.init = function(){}; App.render = function(){};",
			}
			console.error("[Contract] Missing App.init/App.render", details)
			return
		}
		window.App.init()
		window.App.render()
		// Register a service worker to enable PWA installability
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker
				.register("../sw.js")
				.then(function (reg) {
					console.log("Service worker registered:", reg.scope)
				})
				.catch(function (err) {
					console.warn("Service worker registration failed:", err)
				})
		}
	} catch (e) {
		console.error("Initialization failed", e)
	}
})
