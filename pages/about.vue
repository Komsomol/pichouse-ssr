<template>
	<div class="container">
		<!-- The tab names the page; the heading stays for screen readers only -->
		<h1 class="visually-hidden">
			About
		</h1>

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
			<h2>The IMAX tab</h2>
			<p>
				Every bookable screening at <strong>BFI IMAX</strong>, Waterloo - the
				UK's biggest screen. Sold-out and past screenings are left out, and a
				screening's time links to the film's page on BFI to book it.
			</p>
			<p>
				BFI's booking site blocks automated requests, so these listings come
				from Clusterflick, which gathers London cinema listings daily and
				publishes them openly. Posters and trailers come from TMDb.
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
			<h2>The Box Office tab</h2>
			<p>
				The ten highest grossing films at the UK box office over the most
				recently published weekend, with each film's takings for that weekend
				and its running total.
			</p>
			<p>
				Figures come from Box Office Mojo, which reports British grosses in US
				dollars. Everything else - the poster, synopsis, runtime, rating and
				the trailer - comes from TMDb.
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
				<dt>
					<a
						href="https://www.picturehouses.com"
						target="_blank"
						rel="noopener noreferrer"
					>Picturehouse</a>
				</dt>
				<dd>Showtimes, ratings, runtimes and booking links.</dd>

				<dt>
					<a
						href="https://clusterflick.com"
						target="_blank"
						rel="noopener noreferrer"
					>Clusterflick</a>
				</dt>
				<dd>
					BFI IMAX listings, used under
					<a
						href="https://creativecommons.org/licenses/by/4.0/"
						target="_blank"
						rel="noopener noreferrer"
					>CC BY 4.0</a>.
				</dd>

				<dt>
					<a
						href="https://www.themoviedb.org"
						target="_blank"
						rel="noopener noreferrer"
					>TMDb</a>
				</dt>
				<dd>Film posters, synopses, runtimes, ratings and trailers.</dd>

				<dt>
					<a
						href="https://www.omdbapi.com"
						target="_blank"
						rel="noopener noreferrer"
					>OMDb</a>
				</dt>
				<dd>Fallback trailer lookup when TMDb has none.</dd>

				<dt>
					<a
						href="https://www.boxofficemojo.com"
						target="_blank"
						rel="noopener noreferrer"
					>Box Office Mojo</a>
				</dt>
				<dd>The UK weekend top 10 and its gross figures.</dd>

				<dt>
					<a
						href="https://www.youtube.com"
						target="_blank"
						rel="noopener noreferrer"
					>YouTube</a>
				</dt>
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
				'Screen 1 showtimes for Picturehouse Finsbury Park and Central, bookable BFI IMAX screenings, the UK box office top 10, plus official studio trailers from the last 30 days.',
		},
	],
});
</script>

<!-- MovieListStyles carries the shared design system (tokens, container,
     headings) that the about styles build on. -->
<style src="~/components/movies/MovieListStyles.css"></style>

<style scoped>
.about-section {
  max-width: 65ch;
  margin-bottom: var(--space-2xl);
}

.about-section h2 {
  margin: 0 0 var(--space-md);
  padding-top: var(--space-sm);
  border-top: 4px solid var(--letter);
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--letter);
}

.about-section p {
  margin: 0 0 var(--space-md);
  line-height: 1.65;
}

.about-section p:last-child {
  margin-bottom: 0;
}

.about-section strong {
  font-weight: 600;
}

.about-section a {
  font-weight: 600;
  text-underline-offset: 3px;
}

.about-section a:hover {
  color: var(--exit-hover);
}

/* Data sources: name on the left, what it supplies on the right */
.about-sources {
  display: grid;
  grid-template-columns: 1fr;
  margin: 0 0 var(--space-lg);
}

.about-sources dt {
  padding-top: var(--space-sm);
  border-top: var(--rail-weight) solid var(--rail);
  font-size: var(--font-base);
}

.about-sources dd {
  margin: 0 0 var(--space-sm);
  color: var(--letter-soft);
}

.about-note {
  font-size: var(--font-sm);
  color: var(--letter-soft);
}

@media (min-width: 600px) {
  .about-sources {
    grid-template-columns: 11rem 1fr;
  }

  .about-sources dd {
    margin: 0;
    padding: var(--space-sm) 0;
    border-top: var(--rail-weight) solid var(--rail);
  }

  .about-sources dt {
    padding-bottom: var(--space-sm);
  }
}
</style>
