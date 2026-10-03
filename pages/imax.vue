<template>
	<div class="container">
		<!-- The tab names the page; the heading stays for screen readers only -->
		<h1 class="visually-hidden">
			BFI IMAX
		</h1>

		<p class="imax-note">
			Every bookable screening at BFI IMAX, Waterloo. Sold-out screenings are
			left out. Listings via
			<a
				:href="data?.creditUrl || 'https://clusterflick.com'"
				target="_blank"
				rel="noopener noreferrer"
			>Clusterflick</a>
			(CC BY 4.0), refreshed daily.
		</p>

		<!-- Loading state -->
		<div
			v-if="pending"
			class="loading-container"
		>
			<div class="loading-spinner" />
			<p class="loading-message">
				Checking the big screen...
			</p>
		</div>

		<!-- Error state -->
		<div
			v-else-if="error"
			class="error-container"
		>
			<p>Failed to load BFI IMAX listings: {{ error.message }}</p>
		</div>

		<!-- Films -->
		<div v-else-if="films.length">
			<div
				v-for="(film, index) in films"
				:key="film.id"
				class="movie-block"
			>
				<div class="movie-left">
					<div class="movie-poster">
						<img
							v-if="film.poster"
							:src="film.poster"
							:alt="`${film.title} poster`"
							:loading="index === 0 ? 'eager' : 'lazy'"
							decoding="async"
						>
					</div>

					<div
						v-if="film.videos.length"
						class="movie-videos"
					>
						<h4>Trailers</h4>
						<ul>
							<li
								v-for="video in film.videos"
								:key="video.key || video.searchUrl"
							>
								<!-- Real href so middle/Cmd/Ctrl-click opens YouTube in a new tab;
								a plain left click is intercepted for the modal -->
								<a
									v-if="video.key && !video.isSearch"
									:href="`https://www.youtube.com/watch?v=${video.key}`"
									target="_blank"
									rel="noopener noreferrer"
									@click.exact.prevent="openModal(video.key)"
								>{{ video.name }}</a>
								<a
									v-else-if="video.searchUrl"
									:href="video.searchUrl"
									target="_blank"
									rel="noopener noreferrer"
								>{{ video.name }}</a>
							</li>
						</ul>
					</div>
				</div>

				<div class="movie-info">
					<h3 class="marquee movie-title">
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
						<li v-if="film.releaseDate">
							Released {{ formatDate(film.releaseDate) }}
						</li>
					</ul>

					<p
						v-if="film.overview"
						class="movie-overview"
					>
						{{ film.overview }}
					</p>

					<div class="movie-showtimes">
						<div class="showtimes-grid">
							<!-- BFI links each film rather than each screening, so the
							time opens the film's page there to pick this showing -->
							<a
								v-for="screening in film.screenings"
								:key="screening.id"
								:href="screening.bookingUrl"
								target="_blank"
								rel="noopener noreferrer"
								class="showtime-card"
								:aria-label="`Book ${film.title} at BFI IMAX, ${screening.date}, ${screening.timeFormat}`"
							>
								<!-- One venue, so the line only appears to name a 70mm print -->
								<div
									v-if="screening.format"
									class="showtime-cinema"
								>
									{{ screening.format }}
								</div>
								<div class="showtime-date">
									{{ screening.date }}
								</div>
								<div class="showtime-time">
									{{ screening.timeFormat }}
								</div>
							</a>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Nothing bookable -->
		<div
			v-else
			class="error-container"
		>
			<p>No bookable BFI IMAX screenings right now.</p>
			<p class="loading-subtitle">
				Listings refresh daily, and sold-out screenings are left out.
			</p>
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
	title: 'BFI IMAX - PicHouse',
	meta: [
		{
			name: 'description',
			content:
				'Bookable screenings at BFI IMAX, Waterloo, with trailers. Sold-out screenings left out.',
		},
	],
});

const { data, pending, error } = useFetch('/api/imax');

const films = computed(() => data.value?.films || []);

// Same long form as the Movies tab's release dates
const formatDate = dateString =>
	new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	}).format(new Date(dateString));

const isModalOpen = ref(false);
const selectedVideoKey = ref(null);

const openModal = (videoKey) => {
	selectedVideoKey.value = videoKey;
	isModalOpen.value = true;
};
</script>

<!-- Shares the Movies tab's design system and layout -->
<style src="~/components/movies/MovieListStyles.css"></style>

<style scoped>
.imax-note {
  margin: 0 0 var(--space-xl);
  max-width: 65ch;
  font-size: var(--font-sm);
  color: var(--letter-soft);
}

.imax-note a {
  font-weight: 600;
  text-underline-offset: 3px;
}
</style>
