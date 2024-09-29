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
          <!-- Movie Poster -->
          <img v-if="movie.poster" :src="movie.poster" alt="Movie poster" />
        </div>

        <div class="movie-info">
          <!-- Movie Title -->
          <h3 class="movie-title">{{ movie.original_title }}</h3>

          <!-- Movie Data -->
          <div class="movie-details">
            <p><strong>Picturehouse Title:</strong> {{ movie.Title }}</p>
            <p><strong>Runtime:</strong> {{ movie.omdbData?.Runtime || movie.RunTime }} minutes</p>
            <p><strong>MovieDB Rating:</strong> {{ movie.omdbData?.vote_average }}</p>
            <p><strong>Released:</strong> {{ formatDate(movie.release_date) }}</p>
          </div>

          <!-- Video Links -->
          <!-- Video Links -->
          <div v-if="movie.videos.length" class="movie-videos">
            <h4>Videos:</h4>
            <ul>
              <li v-for="video in movie.videos" :key="video.key">
                <a :href="getVideoUrl(video)" target="_blank">{{ video.name }}</a>
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
  </div>
</template>

<script setup>
// Fetch movie data from the API
const { data: movies, pending, error } = await useFetch('/api/movies')

// Function to generate video URL
const getVideoUrl = (video) => {
  if (video.site === 'YouTube') {
    return `https://www.youtube.com/watch?v=${video.key}`;
  }
  return '#'; // Fallback if not YouTube
}

// Function to format the release date into a more readable format
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

// Debugging the state of the fetch call
console.log('Movies:', movies.value)
console.log('Pending:', pending.value)
console.log('Error:', error.value)

if (error.value) {
  console.error('Failed to fetch movies:', error.value)
}
</script>

<style scoped>
/* Styling for the main movie container */
.movie-block {
  display: flex;
  flex-wrap: wrap;
  margin: 20px 0;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Movie Poster Styling */
.movie-poster img {
  max-width: 180px;
  height: auto;
  border-radius: 8px;
}

/* Movie Info Container */
.movie-info {
  display: flex;
  flex-direction: column;
  margin-left: 20px;
  flex: 1;
}

/* Movie Title */
.movie-title {
  font-size: 1.8rem;
  margin-top: 0px;
  margin-bottom: 10px;
}

/* Movie Details */
.movie-details p {
  margin: 5px 0;
  font-size: 1rem;
}

/* Movie Videos */
.movie-videos h4 {
  margin-top: 20px;
}

.movie-videos ul {
  list-style-type: none;
  padding-left: 0;
}

.movie-videos ul li {
  margin: 5px 0;
}

.movie-videos ul li a {
  text-decoration: none;
  color: #007bff;
}

.movie-videos ul li a:hover {
  text-decoration: none;
}

/* Media query for responsiveness */
@media (max-width: 768px) {
  .movie-block {
    flex-direction: column;
  }

  .movie-info {
    margin-left: 0;
    margin-top: 20px;
  }

  .movie-poster img {
    max-width: 100%;
  }
}
</style>
