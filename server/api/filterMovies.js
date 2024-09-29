// server/api/filterMovies.js

export const sanitizeMovieTitle = (title) => {
  const stringsToRemove = [
    ' - Original Cut',
    '\\+ Q&A',
    'Family Special:',
    '(Rerelease)',
    '(Paddington Day)',
    'FILM CLUB:',
    "Doc'n Roll Film Festival Presents:",
    'Atomic Origins:',
    '(4K Restoration)',
    '(40th Anniversary)',
    '(Anniversary)',
    'EXHIBITION ON SCREEN:',
    'NT Live:',
    '\\+ Live Intro and Q&A',  // Escaped the '+' character
    'Re-release',              // Remove "Re-release"
  ];

  // Regex patterns to match unwanted strings like movie ratings, parentheses, etc.
  const regexPatternsToRemove = [
    /\(\d+\)/g,          // Matches strings like (1984)
    /\(.*?\)/g,          // Matches any content inside parentheses like (PG) (U)
    /\s+[A-Z]{1,2}$/,    // Matches ratings at the end like (PG) (U)
  ];

  // Remove exact unwanted substrings
  let sanitizedTitle = title;
  stringsToRemove.forEach((str) => {
    sanitizedTitle = sanitizedTitle.replace(new RegExp(str, 'gi'), '').trim();
  });

  // Remove unwanted patterns (like parentheses and ratings)
  regexPatternsToRemove.forEach((regex) => {
    sanitizedTitle = sanitizedTitle.replace(regex, '').trim();
  });

  // Return null if the sanitized title is empty or invalid after removing unwanted content
  if (!sanitizedTitle || sanitizedTitle === '') {
    return null;
  }

  return sanitizedTitle;
};

// Filter movies by available cinemas, remove duplicates, and skip specific titles
export const filterMoviesByCinemaAndRemoveDuplicates = (movies, cinemaId) => {
  const uniqueTitles = new Set();
  return movies
    .filter(movie => {
      // Skip movies with "Dawn of Impressionism - Paris 1874" in the title
      if (movie.Title.includes('Dawn of Impressionism - Paris 1874')) {
        return false;
      }
      return movie.available_cinemas.includes(cinemaId); // Filter by cinema
    })
    .filter(movie => {
      const sanitizedTitle = sanitizeMovieTitle(movie.Title);
      // Filter out if the sanitized title is null or if it's already been processed
      if (!sanitizedTitle || uniqueTitles.has(sanitizedTitle)) {
        return false;
      }
      uniqueTitles.add(sanitizedTitle);
      movie.Title = sanitizedTitle; // Use the sanitized title
      return true;
    });
};
