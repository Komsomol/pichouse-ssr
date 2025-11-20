export default defineNuxtConfig({
	// Remove @nuxtjs/axios module
	modules: [],
	ssr: false,
	devtools: { enabled: true },
	app: {
		baseURL: process.env.NODE_ENV === 'production' ? '/pichouse-ssr/' : '/',
	},
	css: [
		'normalize.css', // If using normalize.css from npm
		// '@/assets/css/custom-reset.css' // Uncomment this if using your own reset file
	],
	compatibilityDate: '2024-04-03',
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
