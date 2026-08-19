<template>
	<nav class="nav-tabs">
		<NuxtLink
			to="/"
			class="nav-tab"
		>
			Cinema
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
.nav-tabs {
  display: flex;
  justify-content: center;
  gap: var(--space-sm, 0.5rem);
  padding: var(--space-md, 1rem) var(--space-md, 1rem) 0;
  background: var(--bg-primary, #f8f6f3);
}

.nav-tab {
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: var(--font-sm, 0.95rem);
  font-weight: 700;
  color: var(--text-muted, #6b7280);
  text-decoration: none;
  padding: var(--space-sm, 0.5rem) var(--space-lg, 1.5rem);
  min-height: 44px;
  display: flex;
  align-items: center;
  border-bottom: 2px solid transparent;
  transition: color var(--transition-fast, 150ms ease), border-color var(--transition-fast, 150ms ease);
}

.nav-tab:hover {
  color: var(--accent, #d4885a);
}

.nav-tab:focus-visible {
  outline: 2px solid var(--accent, #d4885a);
  outline-offset: 2px;
}

/* Nuxt sets this class on the link matching the current route */
.nav-tab.router-link-exact-active {
  color: var(--accent, #d4885a);
  border-bottom-color: var(--accent, #d4885a);
}
</style>
