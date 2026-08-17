<template>
	<div class="container">
		<h1>About</h1>

		<section class="about-section">
			<h2>What this is</h2>
			<p>
				A listings board for two London cinemas: Picturehouse Finsbury Park and
				Picturehouse Central. It shows what is playing in <strong>Screen 1</strong>
				at each, with a direct booking link for every screening.
			</p>
			<p>
				Screenings are filtered by time: on weekdays only those from
				<strong>6pm onwards</strong>, and at weekends all of them. The idea is a
				short page you can read in a few seconds, rather than a full programme.
			</p>
		</section>

		<section class="about-section">
			<h2>The Trailers tab</h2>
			<p>
				Official trailers posted by film studios to YouTube in the
				<strong>last 30 days</strong>, newest first, filterable by studio.
			</p>
			<p>
				It is deliberately narrow. Teasers, streaming-only series and studios
				re-posting trailers for decades-old films are all filtered out, so what
				remains is films heading for cinemas. When two studios post the same
				trailer for a co-release, the pair is merged into one entry credited to
				both.
			</p>
		</section>

		<section class="about-section">
			<h2>How it stays current</h2>
			<p>
				There is no server. Every listing and trailer on this site is fetched
				when the site is built and baked into static pages, which is why it
				loads as fast as it does.
			</p>
			<p>
				A scheduled job checks the Picturehouse listings each morning and
				rebuilds the site when they have changed. On a day when nothing has
				moved, the previous build stands.
			</p>
		</section>

		<section class="about-section">
			<h2>Where the data comes from</h2>
			<dl class="about-sources">
				<dt>Picturehouse</dt>
				<dd>Showtimes, ratings, runtimes and booking links.</dd>

				<dt>TMDb</dt>
				<dd>Film posters, synopses and trailers.</dd>

				<dt>OMDb</dt>
				<dd>Fallback trailer lookup when TMDb has none.</dd>

				<dt>YouTube</dt>
				<dd>Studio channel uploads behind the Trailers tab.</dd>
			</dl>
			<p class="about-note">
				This product uses the TMDb API but is not endorsed or certified by TMDb.
				Booking is handled entirely by Picturehouse - this site sells nothing and
				sets no cookies.
			</p>
		</section>

		<section class="about-section">
			<h2>Source</h2>
			<p>
				The code is on
				<a
					href="https://github.com/Komsomol/pichouse-ssr"
					target="_blank"
					rel="noopener noreferrer"
				>GitHub</a>.
				It is an unofficial personal project, not affiliated with Picturehouse
				Cinemas.
			</p>
		</section>
	</div>
</template>

<script setup>
useHead({
	title: 'About - PicHouse',
	meta: [
		{
			name: 'description',
			content:
				'Screen 1 showtimes for Picturehouse Finsbury Park and Central, plus official studio trailers from the last 30 days.',
		},
	],
});
</script>

<!-- MovieListStyles carries the shared design system (tokens, container,
     headings) that the about styles build on. -->
<style src="~/components/movies/MovieListStyles.css"></style>

<style scoped>
.about-section {
  margin-bottom: var(--space-xl);
}

.about-section h2 {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: var(--font-lg);
  font-weight: 400;
  color: var(--text-primary);
  margin: 0 0 var(--space-sm);
  padding-bottom: var(--space-xs);
  border-bottom: 1px solid var(--border-color);
}

.about-section p {
  margin: 0 0 var(--space-md);
  font-size: var(--font-base);
  line-height: 1.7;
  color: var(--text-secondary);
  max-width: 65ch;
}

.about-section p:last-child {
  margin-bottom: 0;
}

.about-section strong {
  color: var(--text-primary);
  font-weight: 500;
}

.about-section a {
  color: var(--accent);
  font-weight: 500;
}

.about-section a:hover {
  color: var(--accent-hover);
}

.about-section a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Data sources */
.about-sources {
  margin: 0 0 var(--space-md);
  padding: var(--space-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--accent);
}

.about-sources dt {
  font-family: 'DM Sans', system-ui, sans-serif;
  font-weight: 700;
  font-size: var(--font-sm);
  color: var(--text-primary);
}

.about-sources dd {
  margin: 0 0 var(--space-sm);
  font-size: var(--font-sm);
  line-height: 1.6;
  color: var(--text-secondary);
}

.about-sources dd:last-child {
  margin-bottom: 0;
}

.about-note {
  font-size: var(--font-xs) !important;
  color: var(--text-subtle) !important;
  line-height: 1.6 !important;
}

@media (min-width: 600px) {
  .about-sources {
    padding: var(--space-lg);
  }

  .about-sources dt {
    font-size: var(--font-base);
  }
}
</style>
