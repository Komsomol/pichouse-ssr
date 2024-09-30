<template>
  <div class="container">
    <!-- Pagination Controls at the top -->
    <div v-if="paginatedMovies.length" class="pagination">
      <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">Previous</button>
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">Next</button>
    </div>

    <!-- Loading state -->
    <div v-if="loading">
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
            <p><strong>Overview:</strong> {{ movie.overview }}</p>
            <p><strong>Picturehouse Title:</strong> {{ movie.Title }}</p>
            <p><strong>Runtime:</strong> {{ movie.omdbData?.Runtime || movie.RunTime }} minutes</p>
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
import { ref, computed, onMounted } from 'vue';
import VideoModal from '~/components/movies/VideoModal.vue'; // Import the modal component

// Define reactive state
const movies = ref([]);
const paginatedMovies = ref([]);
const loading = ref(true);
const error = ref(null);
const currentPage = ref(1);
const moviesPerPage = 10;
const totalPages = ref(1);

// Modal state
const isModalOpen = ref(false);
const selectedVideoKey = ref(null);

// Function to open modal and set video key
const openModal = (videoKey) => {
  selectedVideoKey.value = videoKey;
  isModalOpen.value = true;
};

// Function to format the release date
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

// Fetch the movies from the static file when the component is mounted
onMounted(async () => {
  try {
    const response = await fetch('/data/movies.json'); // Load movies.json from the public/data directory
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    movies.value = data;

    totalPages.value = Math.ceil(movies.value.length / moviesPerPage);
    paginateMovies();
    loading.value = false;
  } catch (err) {
    error.value = err;
    loading.value = false;
  }
});

// Function to paginate the movies
const paginateMovies = () => {
  const start = (currentPage.value - 1) * moviesPerPage;
  const end = start + moviesPerPage;
  paginatedMovies.value = movies.value.slice(start, end);
};

// Function to change the page
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    paginateMovies();
  }
};
</script>

<style scoped src="~/components/movies/MovieListStyles.css"></style>
