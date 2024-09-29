<template>
  <div class="container">
    <h1>Movies</h1>

    <!-- Pagination Controls at the top -->
    <div v-if="paginatedMovies.length" class="pagination">
      <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">Previous</button>
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">Next</button>
    </div>

    <!-- Loading state -->
    <div v-if="pending">
      <p>Loading movies...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error">
      <p>Failed to load movies: {{ error.message }}</p>
    </div>

    <!-- Movies list with pagination -->
    <div v-else-if="paginatedMovies.length">
      <div v-for="movie in paginatedMovies" :key="movie.ID" class="movie-block">
        <div class="movie-poster">
          <img v-if="movie.poster" :src="movie.poster" alt="Movie poster" />
        </div>

        <div class="movie-info">
          <h3 class="movie-title">{{ movie.original_title }}</h3>

          <div class="movie-details">
            <p><strong>Picturehouse Title:</strong> {{ movie.Title }}</p>
            <p><strong>Runtime:</strong> {{ movie.omdbData?.Runtime || movie.RunTime }} minutes</p>
            <p><strong>MovieDB Rating:</strong> {{ movie.omdbData?.vote_average }}</p>
            <p><strong>Released:</strong> {{ formatDate(movie.release_date) }}</p>
          </div>

          <!-- Video Links -->
          <div v-if="movie.videos.length" class="movie-videos">
            <h4>Videos:</h4>
            <ul>
              <li v-for="video in movie.videos" :key="video.key">
                <a href="javascript:void(0)" @click="openModal(video.key)">{{ video.name }}</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Pagination Controls at the bottom (optional) -->
      <div class="pagination">
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">Previous</button>
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
        <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">Next</button>
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
      :videoKey="selectedVideoKey"
      @close="isModalOpen = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import useMovieList from '~/components/movies/MovieListScript.js';  // Adjust the import path accordingly
import VideoModal from '~/components/movies/VideoModal.vue';  // Import the modal component

// Destructure values returned by useMovieList
const { paginatedMovies, pending, error, getVideoUrl, formatDate, currentPage, totalPages, goToPage } = useMovieList();

// Modal state
const isModalOpen = ref(false);
const selectedVideoKey = ref(null);

// Function to open modal and set video key
const openModal = (videoKey) => {
  selectedVideoKey.value = videoKey;
  isModalOpen.value = true;
};
</script>

<style scoped src="~/components/movies/MovieListStyles.css"></style>
