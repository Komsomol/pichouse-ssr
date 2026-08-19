export default defineNuxtConfig({
	// Remove @nuxtjs/axios module
	modules: [],
	ssr: true,
	devtools: { enabled: true },
	css: [
		'normalize.css', // If using normalize.css from npm
		// '@/assets/css/custom-reset.css' // Uncomment this if using your own reset file
	],
	compatibilityDate: '2024-04-03',
	nitro: {
		prerender: {
			// Declared upfront rather than left to link crawling. Crawling only
			// finds these once "/" has rendered, and "/" waits on a Picturehouse
			// request that routinely takes 10s+, so the other tabs' API work sat
			// idle behind it. Listed here they fetch during that wait.
			routes: ['/', '/about', '/boxoffice', '/trailers'],
		},
	},
	server: {
		// Set the host and port manually
		host: '0.0.0.0', // default: localhost
		port: 4000, // default: 3000

		// Add this to increase the server startup timeout
		timing: {
			total: true,
		},
	},
});
