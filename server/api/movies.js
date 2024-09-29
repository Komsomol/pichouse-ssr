import { fetchMoviesFromPicturehouse } from './picturehouseApi';
import { fetchMovieFromTMDb, fetchVideosAndPosterFromTMDb } from './tmdbApi';
import { filterMoviesByCinemaAndRemoveDuplicates } from './filterMovies';

export default defineEventHandler(async (event) => {
  try {
    // Fetch movies from Picturehouse API
    const rawMovies = await fetchMoviesFromPicturehouse();

    // Filter movies by cinema and remove duplicates
    const filteredMovies = filterMoviesByCinemaAndRemoveDuplicates(rawMovies, '031');

    // Create a Map to track unique sanitized titles
    const uniqueMovies = new Map();

    // Fetch TMDb details for each movie and combine data
    for (const movie of filteredMovies) {
      let findLatest = false;

      // Check if the movie has the "discover picturehouse_presents" filter class
      if (movie.filter_class_names && movie.filter_class_names.includes('discover picturehouse_presents')) {
        findLatest = true; // Flag to find the latest release in TMDb
      }

      const tmdbMovieData = await fetchMovieFromTMDb(movie.Title, findLatest);

      if (tmdbMovieData) {
        const { id: tmdbMovieId, original_title, release_date, overview } = tmdbMovieData; // Added overview
        const { videos, poster } = await fetchVideosAndPosterFromTMDb(tmdbMovieId);

        // Combine data from Picturehouse and TMDb
        uniqueMovies.set(movie.Title, {
          ...movie,
          original_title,    // Add original title from TMDb
          release_date,      // Add release date from TMDb
          overview,          // Add overview from TMDb
          videos,            // Add videos from TMDb
          poster,            // Add poster from TMDb
        });
      } else {
        uniqueMovies.set(movie.Title, {
          ...movie,
          videos: movie.TrailerUrl ? [{ key: movie.TrailerUrl.split('v=')[1], name: 'Official Trailer', site: 'YouTube' }] : [],
          poster: null,
        });
      }
    }

    // Return the enriched movies with unique titles
    return Array.from(uniqueMovies.values());
  } catch (error) {
    console.error('Error fetching movies:', error.message);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch movies: ' + error.message,
    });
  }
});
