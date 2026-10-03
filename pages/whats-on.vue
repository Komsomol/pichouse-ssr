<template>
	<div class="container">
		<!-- The tab names the page; the heading stays for screen readers only -->
		<h1 class="visually-hidden">
			What's on
		</h1>

		<p class="whatson-note">
			Every film at Screen 1 and BFI IMAX, once each, with what it is about
			and where to book it.
		</p>

		<div
			v-if="pending"
			class="loading-container"
		>
			<div class="loading-spinner" />
			<p class="loading-message">
				Gathering what's on...
			</p>
		</div>

		<div
			v-else-if="error"
			class="error-container"
		>
			<p>Failed to load what's on: {{ error.message }}</p>
		</div>

		<template v-else-if="sections.length">
			<section
				v-for="section in sections"
				:key="section.id"
				class="whatson-section"
			>
				<h2 class="whatson-section-label">
					{{ section.label }}
				</h2>

				<article
					v-for="(film, index) in section.films"
					:key="film.id"
					class="movie-block whatson-film"
				>
					<div class="movie-left">
						<div class="movie-poster">
							<img
								v-if="film.poster"
								:src="film.poster"
								:alt="`${film.title} poster`"
								:loading="section.id === 'now' && index < 2 ? 'eager' : 'lazy'"
								decoding="async"
							>
						</div>
					</div>

					<div class="movie-info">
						<h3 class="marquee movie-title whatson-title">
							{{ film.title }}
						</h3>

						<ul class="movie-facts">
							<li
								v-if="film.certificate"
								class="movie-cert"
								:aria-label="`Certificate ${film.certificate}`"
							>
								{{ film.certificate }}
							</li>
							<li v-if="film.runtime">
								{{ film.runtime }} min
							</li>
							<li
								v-for="video in film.videos"
								:key="video.key || video.searchUrl"
								class="whatson-trailer"
							>
								<!-- Real href so middle/Cmd/Ctrl-click opens YouTube in a new tab;
								a plain left click is intercepted for the modal -->
								<a
									v-if="video.key && !video.isSearch"
									:href="`https://www.youtube.com/watch?v=${video.key}`"
									target="_blank"
									rel="noopener noreferrer"
									@click.exact.prevent="openModal(video.key)"
								>▶ Watch trailer</a>
								<a
									v-else-if="video.searchUrl"
									:href="video.searchUrl"
									target="_blank"
									rel="noopener noreferrer"
								>Search for a trailer</a>
							</li>
						</ul>

						<p
							v-if="film.overview"
							class="movie-overview"
						>
							{{ film.overview }}
						</p>

						<!-- One line per venue: where, the next screening to book, and
						the venue's tab for every other time -->
						<ul class="whatson-venues">
							<li
								v-for="venue in film.venues"
								:key="`${venue.venue}-${venue.listingTitle}`"
								class="whatson-venue"
							>
								<span class="whatson-where">
									<strong>{{ venue.venue }}</strong>
									<span v-if="venue.places.length">{{ venue.places.join(', ') }}</span>
									<span
										v-if="venue.listingTitle"
										class="whatson-listing"
									>as “{{ venue.listingTitle }}”</span>
								</span>
								<span class="whatson-actions">
									<a
										:href="venue.next.url"
										target="_blank"
										rel="noopener noreferrer"
										class="whatson-book"
										:aria-label="`Book ${film.title} at ${venue.venue}, ${venue.next.label}`"
									>Book {{ venue.next.label }}</a>
									<NuxtLink
										v-if="venue.count > 1"
										:to="venue.tab"
										class="whatson-all"
									>All {{ venue.count }} times</NuxtLink>
								</span>
							</li>
						</ul>
					</div>
				</article>
			</section>
		</template>

		<div
			v-else
			class="error-container"
		>
			<p>Nothing listed at Screen 1 or BFI IMAX right now.</p>
		</div>

		<VideoModal
			v-if="isModalOpen"
			:show="isModalOpen"
			:video-key="selectedVideoKey"
			@close="isModalOpen = false"
		/>
	</div>
</template>

<script setup>
import { ref, computed } from 'vue';
import VideoModal from '~/components/movies/VideoModal.vue';

useHead({
	title: 'What\'s on - PicHouse',
	meta: [
		{
			name: 'description',
			content:
				'Every film at Screen 1 and BFI IMAX, with trailers, summaries and booking links.',
		},
	],
});

const { data, pending, error } = useFetch('/api/whatson');

const sections = computed(() =>
	[
		{ id: 'now', label: 'Playing this week', films: data.value?.now || [] },
		{ id: 'soon', label: 'Coming soon', films: data.value?.soon || [] },
	].filter(section => section.films.length > 0),
);

const isModalOpen = ref(false);
const selectedVideoKey = ref(null);

const openModal = (videoKey) => {
	selectedVideoKey.value = videoKey;
	isModalOpen.value = true;
};
</script>

<!-- Shares the Movies tab's design system and film layout -->
<style src="~/components/movies/MovieListStyles.css"></style>

<style scoped>
.whatson-note {
  margin: 0 0 var(--space-xl);
  max-width: 65ch;
  font-size: var(--font-sm);
  color: var(--letter-soft);
}

.whatson-section {
  margin-bottom: var(--space-2xl);
}

.whatson-section-label {
  margin: 0 0 var(--space-lg);
  padding-top: var(--space-xs);
  border-top: 4px solid var(--letter);
  font-family: var(--font-display);
  font-size: var(--font-xl);
  font-weight: 800;
}

/* Films within a section are divided by a light rule: the section label
   carries the heavy one */
.whatson-film {
  border-top: 1px solid var(--rail);
  padding: var(--space-lg) 0;
}

.whatson-section-label + .whatson-film {
  border-top: none;
  padding-top: 0;
}

/* Smaller than the Movies tab: this page is for scanning many films */
.whatson-title {
  font-size: var(--font-2xl);
}

.whatson-trailer a {
  font-weight: 600;
  text-decoration: none;
}

.whatson-trailer a:hover {
  color: var(--exit-hover);
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* On phones .movie-info is display:contents (see MovieListStyles), so the
   venue lines must claim the full-width row the Movies tab uses for times */
.whatson-venues {
  grid-area: times;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.whatson-venue {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-xs) var(--space-md);
  padding: var(--space-sm) 0;
  border-top: var(--rail-weight) solid var(--rail);
}

.whatson-where {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--space-sm);
  font-size: var(--font-sm);
  color: var(--letter-soft);
}

.whatson-where strong {
  color: var(--letter);
  font-weight: 600;
}

.whatson-listing {
  font-style: italic;
}

.whatson-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs) var(--space-md);
}

.whatson-book {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 var(--space-md);
  background: var(--exit);
  color: var(--on-exit);
  font-size: var(--font-sm);
  font-weight: 600;
  text-decoration: none;
}

.whatson-book:hover {
  background: var(--exit-hover);
}

.whatson-all {
  font-size: var(--font-sm);
  font-weight: 600;
  text-underline-offset: 3px;
}

@media (min-width: 768px) {
  .movie-left {
    width: 140px;
  }
}

@media (min-width: 900px) {
  .movie-left {
    width: 150px;
  }
}
</style>
