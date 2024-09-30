// utils/fetchMovies.js
import axios from 'axios';

export const fetchMoviesForStaticGeneration = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/movies');
    return response.data; // return the movie data
  } catch (error) {
    console.error('Error fetching movies:', error);
    return [];
  }
};
