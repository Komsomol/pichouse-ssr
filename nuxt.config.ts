export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  ssr: false,
  devtools: { enabled: true },
  // Remove @nuxtjs/axios module
  modules: [],
  server: {
    // Set the host and port manually
    host: '0.0.0.0',  // default: localhost
    port: 4000,       // default: 3000

    // Add this to increase the server startup timeout
    timing: {
      total: true
    }
  }, 
  css: [
    'normalize.css' // If using normalize.css from npm
    // '@/assets/css/custom-reset.css' // Uncomment this if using your own reset file
  ],
})
