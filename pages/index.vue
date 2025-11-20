<template>
	<div class="container">
		<!-- Pagination Controls at the top (only show if more than 10 movies) -->
		<div
			v-if="paginatedMovies.length && movies && movies.length > 10"
			class="pagination"
		>
			<button
				:disabled="currentPage === 1"
				@click="goToPageAndScroll(currentPage - 1)"
			>
				Previous
			</button>
			<span>Page {{ currentPage }} of {{ totalPages }}</span>
			<button
				:disabled="currentPage === totalPages"
				@click="goToPageAndScroll(currentPage + 1)"
			>
				Next
			</button>
		</div>

		<!-- Loading state with fun messages -->
		<div
			v-if="pending"
			class="loading-container"
		>
			<div class="loading-spinner" />
			<p class="loading-message">
				{{ loadingMessage }}
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
			<p>Failed to load movies: {{ error.message }}</p>
		</div>

		<!-- Movies list with pagination -->
		<div v-else-if="paginatedMovies.length">
			<div
				v-for="movie in paginatedMovies"
				:key="movie.ID"
				class="movie-block"
			>
				<div class="movie-poster">
					<img
						v-if="movie.poster"
						:src="movie.poster"
						alt="Movie poster"
					>
				</div>

				<div class="movie-info">
					<h3 class="movie-title">
						{{ movie.original_title }}
					</h3>

					<div class="movie-details">
						<p><strong>Overview:</strong> {{ movie.overview }}</p>
						<p><strong>Runtime:</strong> {{ movie.omdbData?.Runtime || movie.RunTime }} minutes</p>
						<p><strong>Released:</strong> {{ formatDate(movie.release_date) }}</p>
						<p><strong>Rating:</strong> {{ movie.Rating }}</p>
					</div>

					<!-- Screen 1 Showtimes -->
					<div
						v-if="movie.screen1Showtimes && movie.screen1Showtimes.length"
						class="movie-showtimes"
					>
						<h4>🎬 Screen 1 Showtimes (After 6 PM):</h4>
						<div class="showtimes-grid">
							<div
								v-for="showtime in movie.screen1Showtimes"
								:key="showtime.SessionId"
								class="showtime-card"
							>
								<div class="showtime-cinema">
									{{ showtime.cinemaName }}
								</div>
								<div class="showtime-date">
									{{ showtime.date }}
								</div>
								<div class="showtime-time">
									{{ showtime.time_format }}
								</div>
								<a
									:href="showtime.bookingUrl"
									target="_blank"
									rel="noopener noreferrer"
									class="book-button"
								>
									Book Tickets
								</a>
							</div>
						</div>
					</div>

					<!-- Video Links -->
					<div
						v-if="movie.videos.length"
						class="movie-videos"
					>
						<h4>Trailers:</h4>
						<ul>
							<li
								v-for="video in movie.videos"
								:key="video.key"
							>
								<a
									href="javascript:void(0)"
									@click="openModal(video.key)"
								>{{ video.name }}</a>
							</li>
						</ul>
					</div>
				</div>
			</div>

			<!-- Pagination Controls at the bottom (only show if more than 10 movies) -->
			<div
				v-if="movies && movies.length > 10"
				class="pagination"
			>
				<button
					:disabled="currentPage === 1"
					@click="goToPageAndScroll(currentPage - 1)"
				>
					Previous
				</button>
				<span>Page {{ currentPage }} of {{ totalPages }}</span>
				<button
					:disabled="currentPage === totalPages"
					@click="goToPageAndScroll(currentPage + 1)"
				>
					Next
				</button>
			</div>
		</div>

		<!-- No movies available -->
		<div v-else>
			<p>No movies available.</p>
		</div>

		<!-- Modal Window for Video -->
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
import useMovieList from '~/components/movies/MovieListScript.js'; // Adjust the import path accordingly
import VideoModal from '~/components/movies/VideoModal.vue'; // Import the modal component

// Destructure values returned by useMovieList
const {
	movies,
	paginatedMovies,
	pending,
	error,
	formatDate,
	currentPage,
	totalPages,
	goToPage,
	loadingMessage,
} = useMovieList();

// Modal state
const isModalOpen = ref(false);
const selectedVideoKey = ref(null);

// Function to open modal and set video key
const openModal = (videoKey) => {
	selectedVideoKey.value = videoKey;
	isModalOpen.value = true;
};

// Updated goToPage function to scroll to the top of the page
const scrollToTop = () => {
	window.scrollTo({ top: 0, behavior: 'smooth' }); // Scrolls to the top smoothly
};

// Modify the goToPage function to scroll to top after page change
const goToPageAndScroll = (pageNumber) => {
	goToPage(pageNumber); // Change the page
	scrollToTop(); // Scroll to the top of the page
};
</script>

<style scoped src="~/components/movies/MovieListStyles.css"></style>
