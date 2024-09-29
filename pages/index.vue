<template>
  <div>
    <h1>Movies</h1>

    <!-- Loading state -->
    <div v-if="pending">
      <p>Loading movies...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error">
      <p>Failed to load movies: {{ error.message }}</p>
    </div>

    <!-- Movies list -->
    <div v-else-if="movies && movies.length">
      <div v-for="movie in movies" :key="movie.ID" class="movie-block">
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
const { movies, pending, error, getVideoUrl, formatDate } = useMovieList();

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
