// /test/generateMoviesJson.js
import { writeFileSync } from 'fs';
import { fetchMoviesForStaticGeneration } from '../utils/fetchMovies.js';  // Adjusted import path

async function generateMoviesJson() {
  try {
    // Fetch movies
    const movies = await fetchMoviesForStaticGeneration();

    // Write movies to movies.json file in the static directory
    writeFileSync('./public/data/movies.json', JSON.stringify(movies, null, 2));

    console.log('movies.json file has been generated and saved successfully!');
  } catch (error) {
    console.error('Error generating movies.json:', error);
  }
}

// Call the function
generateMoviesJson();
