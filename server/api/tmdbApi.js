import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const TMDB_TOKEN = process.env.TMDB_TOKEN; // Ensure this token is correct and exists

// Define specific movie cases where we know exactly which TMDb movie we want
const specificMovieMatches = {
  'Black Dog': { title: 'Black Dog', release_date: '2024-06-14' },
  // Add more specific title mappings if needed
};

// Fetch movie from TMDb by title, with an option to specify if we are looking for the latest released movie
export const fetchMovieFromTMDb = async (title, findLatest = false) => {
  const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}`;
  const headers = {
    Authorization: `Bearer ${TMDB_TOKEN}`, // Use Bearer token for authorization
  };

  try {
    const response = await axios.get(searchUrl, { headers });
    const movies = response.data.results; // Get all movie results

    if (movies && movies.length > 0) {
      // Check if there is a specific movie match override
      const specificMatch = specificMovieMatches[title];
      if (specificMatch) {
        // Find and return the specific movie by its release date
        const matchedMovie = movies.find(movie => movie.release_date === specificMatch.release_date);
        if (matchedMovie) {
          return {
            id: matchedMovie.id,
            original_title: matchedMovie.original_title,
            release_date: matchedMovie.release_date,
          };
        }
      }

      // If we are looking for the latest release
      if (findLatest) {
        // Sort movies by release date and return the latest one
        const latestMovie = movies.reduce((latest, movie) => {
          const movieReleaseDate = new Date(movie.release_date);
          const latestReleaseDate = new Date(latest.release_date);
          return movieReleaseDate > latestReleaseDate ? movie : latest;
        });

        return {
          id: latestMovie.id,
          original_title: latestMovie.original_title,
          release_date: latestMovie.release_date,
        };
      } else {
        // Otherwise, return the first movie match
        const movie = movies[0];
        return {
          id: movie.id,
          original_title: movie.original_title,
          release_date: movie.release_date,
        };
      }
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error fetching TMDb data for ${title}:`, error.message);
    console.error('Error response data:', error.response?.data); // Log the detailed response data if available
    throw new Error(`TMDb request failed with status: ${error.response?.status || 'unknown'}`);
  }
};

// Fetch videos and poster from TMDb using movie ID
export const fetchVideosAndPosterFromTMDb = async (movieId) => {
  const headers = {
    Authorization: `Bearer ${TMDB_TOKEN}`, // Same here
  };

  try {
    const videoUrl = `https://api.themoviedb.org/3/movie/${movieId}/videos?language=en-US`;
    const videoResponse = await axios.get(videoUrl, { headers });
    const videos = videoResponse.data.results;

    // Filter videos to only include those with "Trailer" in the name
    const trailerVideos = videos.filter(video => /trailer/i.test(video.name));

    const posterUrl = `https://api.themoviedb.org/3/movie/${movieId}?language=en-US`;
    const movieDetails = await axios.get(posterUrl, { headers });
    const posterPath = movieDetails.data.poster_path
      ? `https://image.tmdb.org/t/p/w780${movieDetails.data.poster_path}`
      : null;

    return { videos: trailerVideos, poster: posterPath };
  } catch (error) {
    console.error(`Error fetching videos and poster for movie ID ${movieId}:`, error);
    return { videos: [], poster: null };
  }
};

