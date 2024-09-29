import { ref, computed } from 'vue';
import { useFetch } from '#app'; // Nuxt 3 native fetch utility

export default function useMovieList() {
  // Fetch movie data from the API
  const { data: movies, pending, error } = useFetch('/api/movies');

  // Pagination state
  const currentPage = ref(1);
  const moviesPerPage = 10;

  // Computed property to paginate movies
  const paginatedMovies = computed(() => {
    if (!movies.value) return [];
    const start = (currentPage.value - 1) * moviesPerPage;
    const end = start + moviesPerPage;
    return movies.value.slice(start, end);
  });

  // Total pages
  const totalPages = computed(() => {
    if (!movies.value) return 1;
    return Math.ceil(movies.value.length / moviesPerPage);
  });

  // Navigate to a specific page
  const goToPage = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages.value) {
      currentPage.value = pageNumber;
    }
  };

  // Function to generate video URL
  const getVideoUrl = (video) => {
    if (video.site === 'YouTube') {
      return `https://www.youtube.com/watch?v=${video.key}`;
    }
    return '#'; // Fallback if not YouTube
  };

  // Function to format the release date into a more readable format
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return {
    movies,
    paginatedMovies,
    pending,
    error,
    getVideoUrl,
    formatDate,
    currentPage,
    totalPages,
    goToPage,
  };
}
