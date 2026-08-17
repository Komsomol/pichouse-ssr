<template>
	<div class="container">
		<h1>Studio Trailers</h1>

		<!-- Loading state -->
		<div
			v-if="pending"
			class="loading-container"
		>
			<div class="loading-spinner" />
			<p class="loading-message">
				🎞️ Rounding up the latest trailers...
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
			<p>Failed to load trailers: {{ error.message }}</p>
		</div>

		<!-- Trailer grid -->
		<div v-else-if="trailers && trailers.length">
			<!-- Studio filter -->
			<div class="trailer-filter">
				<label for="studio-select">Studio</label>
				<select
					id="studio-select"
					:value="selectedStudio"
					@change="setSelectedStudio($event.target.value)"
				>
					<option :value="ALL_STUDIOS">
						All studios ({{ trailers.length }})
					</option>
					<option
						v-for="studio in studioCounts"
						:key="studio.name"
						:value="studio.name"
					>
						{{ studio.name }} ({{ studio.count }})
					</option>
				</select>
			</div>

			<div class="trailer-grid">
				<article
					v-for="(trailer, index) in paginatedTrailers"
					:key="trailer.link"
					class="trailer-card"
				>
					<button
						class="trailer-thumb"
						:aria-label="`Play ${trailer.name}`"
						@click="openModal(trailer.link)"
					>
						<img
							v-if="trailer.thumbnail"
							:src="trailer.thumbnail"
							:alt="`${trailer.name} thumbnail`"
							:loading="index < 2 ? 'eager' : 'lazy'"
							:fetchpriority="index < 2 ? 'high' : 'low'"
							decoding="async"
						>
						<span class="trailer-play">▶</span>
					</button>

					<div class="trailer-body">
						<h3 class="trailer-title">
							{{ trailer.name }}
						</h3>
						<p class="trailer-studio">
							{{ trailer.channel }}
							<span
								v-if="trailer.alsoFrom && trailer.alsoFrom.length"
								class="trailer-also"
							>
								· also from {{ trailer.alsoFrom.join(', ') }}
							</span>
						</p>
						<p class="trailer-date">
							{{ trailer.date }}
						</p>
					</div>
				</article>
			</div>

			<!-- No results for the current filter -->
			<p
				v-if="!paginatedTrailers.length"
				class="trailer-empty"
			>
				No trailers from this studio in the last 30 days.
			</p>

			<!-- Pagination -->
			<div
				v-if="totalPages > 1"
				class="pagination"
			>
				<button
					:disabled="currentPage === 1"
					@click="goToPage(currentPage - 1)"
				>
					Previous
				</button>
				<span>Page {{ currentPage }} of {{ totalPages }}</span>
				<button
					:disabled="currentPage === totalPages"
					@click="goToPage(currentPage + 1)"
				>
					Next
				</button>
			</div>
		</div>

		<!-- Empty feed -->
		<div
			v-else
			class="trailer-empty"
		>
			<p>No trailers available right now.</p>
			<p class="loading-subtitle">
				Studio trailers from the last 30 days appear here after each build.
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
import useTrailerList from '~/components/trailers/TrailerListScript.js';
import VideoModal from '~/components/movies/VideoModal.vue';

const {
	trailers,
	pending,
	error,
	selectedStudio,
	setSelectedStudio,
	studioCounts,
	paginatedTrailers,
	currentPage,
	totalPages,
	goToPage,
	ALL_STUDIOS,
} = useTrailerList();

// Modal state
const isModalOpen = ref(false);
const selectedVideoKey = ref(null);

const openModal = (videoKey) => {
	selectedVideoKey.value = videoKey;
	isModalOpen.value = true;
};
</script>

<!-- MovieListStyles carries the shared design system (tokens, container,
     pagination, loading) that the trailer styles build on. -->
<style src="~/components/movies/MovieListStyles.css"></style>

<style src="~/components/trailers/TrailerListStyles.css"></style>
