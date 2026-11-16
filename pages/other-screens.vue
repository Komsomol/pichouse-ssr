<template>
	<div class="container">
		<!-- The tab names the page; the heading stays for screen readers only -->
		<h1 class="visually-hidden">
			Other screens at Finsbury Park
		</h1>

		<p class="other-note">
			Films at Finsbury Park outside Screen 1: weekday evenings from 6pm and
			any time at weekends. Live opera, ballet and theatre broadcasts are left out.
		</p>

		<div
			v-if="pending"
			class="loading-container"
		>
			<div class="loading-spinner" />
			<p class="loading-message">
				Gathering the other screens...
			</p>
		</div>

		<div
			v-else-if="error"
			class="error-container"
		>
			<p>Failed to load other screens: {{ error.message }}</p>
		</div>

		<template v-else-if="films.length">
			<article
				v-for="(film, index) in films"
				:key="film.title"
				class="movie-block other-film"
			>
				<div class="movie-left">
					<div class="movie-poster">
						<img
							v-if="film.poster"
							:src="film.poster"
							:alt="`${film.title} poster`"
							:loading="index < 2 ? 'eager' : 'lazy'"
							decoding="async"
						>
					</div>
				</div>

				<div class="movie-info">
					<h2 class="marquee movie-title other-title">
						{{ film.title }}
					</h2>

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
						<li v-if="film.metascore">
							<a
								class="movie-metascore"
								:href="film.metascore.url"
								target="_blank"
								rel="noopener"
							>Metacritic reviews</a>
						</li>
						<li
							v-for="video in film.videos"
							:key="video.key"
							class="other-trailer"
						>
							<!-- Real href so middle/Cmd/Ctrl-click opens YouTube in a new tab;
							a plain left click is intercepted for the modal -->
							<a
								:href="`https://www.youtube.com/watch?v=${video.key}`"
								target="_blank"
								rel="noopener noreferrer"
								@click.exact.prevent="openModal(video.key)"
							>▶ Watch trailer</a>
						</li>
					</ul>

					<p
						v-if="film.overview"
						class="movie-overview"
					>
						{{ film.overview }}
					</p>

					<!-- One line per day; each time is the booking link -->
					<ul class="other-days">
						<li
							v-for="day in film.days"
							:key="day.day"
							class="other-day"
						>
							<span class="other-day-label">{{ day.label }}</span>
							<a
								v-for="time in day.times"
								:key="time.url"
								:href="time.url"
								target="_blank"
								rel="noopener noreferrer"
								class="other-time"
								:aria-label="`Book ${film.title}, ${day.label} at ${time.time}, ${time.screen}`"
							>{{ time.time }} <span>{{ time.screen }}</span></a>
						</li>
					</ul>
				</div>
			</article>
		</template>

		<div
			v-else
			class="error-container"
		>
			<p>Nothing on the other screens at Finsbury Park right now.</p>
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
	title: 'Other screens - PicHouse',
	meta: [
		{
			name: 'description',
			content:
				'Films on the other screens at Picturehouse Finsbury Park, with trailers and booking links.',
		},
	],
});

const { data, pending, error } = useFetch('/api/other-screens');

const films = computed(() => data.value || []);

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
.other-note {
  margin: 0 0 var(--space-xl);
  max-width: 65ch;
  font-size: var(--font-sm);
  color: var(--letter-soft);
}

.other-film {
  border-top: 1px solid var(--rail);
  padding: var(--space-lg) 0;
}

.other-film:first-of-type {
  border-top: none;
  padding-top: 0;
}

/* Smaller than the Movies tab: this page is for scanning many films */
.other-title {
  font-size: var(--font-2xl);
}

.other-trailer a {
  font-weight: 600;
  text-decoration: none;
}

.other-trailer a:hover {
  color: var(--exit-hover);
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* On phones .movie-info is display:contents (see MovieListStyles), so the
   day lines must claim the full-width row the Movies tab uses for times */
.other-days {
  grid-area: times;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.other-day {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-xs) var(--space-md);
  padding: var(--space-sm) 0;
  border-top: var(--rail-weight) solid var(--rail);
}

.other-day-label {
  min-width: 6.5em;
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--letter);
}

.other-time {
  font-family: var(--font-display);
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--exit);
  text-decoration: none;
}

.other-time span {
  font-family: var(--font-body, inherit);
  font-size: var(--font-xs);
  font-weight: 400;
  color: var(--letter-soft);
}

.other-time:hover {
  color: var(--exit-hover);
  text-decoration: underline;
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
