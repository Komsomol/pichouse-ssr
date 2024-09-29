// server/api/picturehouseApi.js
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const COOKIE = process.env.COOKIE;

export const fetchMoviesFromPicturehouse = async () => {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Accept': '*/*',
    'Referer': 'https://www.picturehouses.com/cinema/finsbury-park',
    'Origin': 'https://www.picturehouses.com',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Gpc': '1',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'Cookie': COOKIE,
  };

  const urlencoded = new URLSearchParams();
  urlencoded.append('', '');

  try {
    const response = await axios.post(
      'https://www.picturehouses.com/api/get-movies-ajax?start_date=show_all_dates&cinema_id=031',
      urlencoded,
      { headers }
    );
    if (!response.data || !response.data.movies) {
      throw new Error('Invalid response from Picturehouse API');
    }
    return response.data.movies;
  } catch (error) {
    console.error('Error fetching from Picturehouse API:', error);
    throw new Error('Error fetching movies from Picturehouse API');
  }
};
