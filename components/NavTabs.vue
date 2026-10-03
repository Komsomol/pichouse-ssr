<template>
	<nav class="nav-tabs">
		<NuxtLink
			to="/"
			class="nav-tab"
		>
			Movies
		</NuxtLink>
		<NuxtLink
			to="/trailers"
			class="nav-tab"
		>
			Trailers
		</NuxtLink>
		<NuxtLink
			to="/boxoffice"
			class="nav-tab"
		>
			Box Office
		</NuxtLink>
		<NuxtLink
			to="/about"
			class="nav-tab"
		>
			About
		</NuxtLink>
	</nav>
</template>

<style scoped>
/* Left-aligned to the same edge as the content. The active tab sits on a black
   rail; the others on the shared grey one under the whole bar. */
.nav-tabs {
  display: flex;
  gap: var(--space-lg, 1.5rem);
  max-width: 1120px;
  margin: 0 auto;
  padding: var(--space-sm, 0.5rem) var(--space-md, 1rem) 0;
  overflow-x: auto;
  scrollbar-width: none;
  background: var(--lightbox, #eef0ea);
  box-shadow: inset 0 calc(-1 * var(--rail-weight, 2px)) 0 var(--rail, #8a8d86);
}

.nav-tab {
  display: flex;
  align-items: center;
  min-height: 48px;
  flex-shrink: 0;
  font-family: var(--font-body, system-ui, sans-serif);
  font-size: var(--font-sm, 0.875rem);
  font-weight: 600;
  color: var(--letter-soft, #4a4d47);
  text-decoration: none;
  border-bottom: 4px solid transparent;
  transition: color var(--transition-fast, 120ms ease), border-color var(--transition-fast, 120ms ease);
}

.nav-tab:hover {
  color: var(--letter, #000);
}

.nav-tab:focus-visible {
  outline: 2px solid var(--exit, #087040);
  outline-offset: 2px;
}

/* Nuxt sets this class on the link matching the current route */
.nav-tab.router-link-exact-active {
  color: var(--letter, #000);
  border-bottom-color: var(--letter, #000);
}

@media (min-width: 600px) {
  .nav-tabs {
    gap: var(--space-xl, 2rem);
    padding: var(--space-md, 1rem) var(--space-lg, 1.5rem) 0;
  }
}
</style>
