import { useFetch } from '#app'; // Nuxt 3 native fetch utility

export default function useMovieList() {
  // Fetch movie data from the API
  const { data: movies, pending, error } = useFetch('/api/movies');

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

  // Return values to be used in the component
  return {
    movies,
    pending,
    error,
    getVideoUrl,
    formatDate,
  };
}
