<template>
	<div class="container">
		<h1>UK Box Office Top 10</h1>

		<p
			v-if="weekend"
			class="boxoffice-note"
		>
			Weekend of {{ weekend }} · grosses in {{ currency }} via
			<a
				href="https://www.boxofficemojo.com/weekend/by-year/?area=GB"
				target="_blank"
				rel="noopener noreferrer"
			>Box Office Mojo</a>
		</p>

		<!-- Loading state -->
		<div
			v-if="pending"
			class="loading-container"
		>
			<div class="loading-spinner" />
			<p class="loading-message">
				💷 Counting the weekend takings...
			</p>
			<p class="loading-subtitle">
				This might take a moment...
			</p>
		</div>

		<!-- Error state -->
		<div
			v-else-if="error"
			class="error-container"
		>
			<p>Failed to load the box office chart: {{ error.message }}</p>
		</div>

		<!-- Chart -->
		<div
			v-else-if="films.length"
			class="boxoffice-list"
		>
			<article
				v-for="film in films"
				:key="film.rank"
				class="boxoffice-card"
			>
				<div class="boxoffice-rank">
					{{ film.rank }}
				</div>

				<div class="boxoffice-poster">
					<img
						v-if="film.poster"
						:src="film.poster"
						:alt="`${film.title} poster`"
						loading="lazy"
						decoding="async"
					>
				</div>

				<div class="boxoffice-body">
					<h2 class="boxoffice-title">
						{{ film.title }}
					</h2>

					<p class="boxoffice-meta">
						{{ metaLine(film) }}
					</p>

					<dl class="boxoffice-grosses">
						<div class="boxoffice-gross">
							<dt>Weekend</dt>
							<dd>{{ film.weekendGross }}</dd>
						</div>
						<div
							v-if="formatValue(film.totalGross)"
							class="boxoffice-gross"
						>
							<dt>Total</dt>
							<dd>{{ film.totalGross }}</dd>
						</div>
					</dl>

					<p
						v-if="formatValue(film.plot)"
						class="boxoffice-plot"
					>
						{{ film.plot }}
					</p>

					<!-- Studio trailer plays in the modal; otherwise a YouTube search -->
					<template
						v-for="video in film.videos"
						:key="video.key || video.searchUrl"
					>
						<button
							v-if="video.key && !video.isSearch"
							class="boxoffice-trailer"
							:aria-label="`Play the trailer for ${film.title}`"
							@click="openModal(video.key)"
						>
							▶ Watch trailer
						</button>
						<a
							v-else-if="video.searchUrl"
							class="boxoffice-trailer"
							:href="video.searchUrl"
							target="_blank"
							rel="noopener noreferrer"
						>🔍 Search for a trailer</a>
					</template>
				</div>
			</article>
		</div>

		<!-- Empty chart -->
		<div
			v-else
			class="boxoffice-empty"
		>
			<p>No box office chart available right now.</p>
			<p class="loading-subtitle">
				The UK top 10 is published weekly and refreshes here after each build.
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
import { ref } from 'vue';
import useBoxOfficeList from '~/components/boxoffice/BoxOfficeListScript.js';
import VideoModal from '~/components/movies/VideoModal.vue';

useHead({
	title: 'UK Box Office Top 10 - PicHouse',
	meta: [
		{
			name: 'description',
			content:
				'The ten highest grossing films at the UK box office this weekend, with figures, cast and trailers.',
		},
	],
});

const { films, weekend, currency, pending, error, formatValue, metaLine } = useBoxOfficeList();

// Modal state
const isModalOpen = ref(false);
const selectedVideoKey = ref(null);

const openModal = (videoKey) => {
	selectedVideoKey.value = videoKey;
	isModalOpen.value = true;
};
</script>

<!-- MovieListStyles carries the shared design system (tokens, container,
     loading) that the box office styles build on. -->
<style src="~/components/movies/MovieListStyles.css"></style>

<style src="~/components/boxoffice/BoxOfficeStyles.css"></style>
