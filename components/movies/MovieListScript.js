import { ref, computed, onMounted } from 'vue';
import { useFetch } from '#app'; // Nuxt 3 native fetch utility

export default function useMovieList() {
	// Fetch movie data from the API
	const { data: movies, pending, error } = useFetch('/api/movies');

	// Loading progress messages
	const loadingMessage = ref('');
	const loadingMessages = [
		'🎬 Finding the best seats in Screen 1...',
		'🍿 Popping fresh popcorn...',
		'🎞️ Rewinding the film reels...',
		'🎭 Checking what\'s showing tonight...',
		'🎪 Setting up the projector...',
		'🎨 Adjusting the picture quality...',
		'🎵 Testing the surround sound...',
		'🌟 Gathering tonight\'s features...',
		'🎯 Filtering showtimes after 6 PM...',
		'🎫 Printing your tickets...',
		'🍫 Restocking the snack bar...',
		'🎬 Dimming the lights...',
	];

	// Pagination state
	const currentPage = ref(1);
	const moviesPerPage = 10;

	// Rotate loading messages
	let messageInterval;
	onMounted(() => {
		if (pending.value) {
			let messageIndex = 0;
			loadingMessage.value = loadingMessages[messageIndex];
			messageInterval = setInterval(() => {
				messageIndex = (messageIndex + 1) % loadingMessages.length;
				loadingMessage.value = loadingMessages[messageIndex];
			}, 2000); // Change message every 2 seconds
		}

		// Clear interval when loading is done
		const stopMessages = () => {
			if (messageInterval) {
				clearInterval(messageInterval);
			}
		};

		// Watch for pending to become false
		const watchEffect = () => {
			if (!pending.value) {
				stopMessages();
			}
		};
		watchEffect();
	});

	// Computed property to paginate movies
	const paginatedMovies = computed(() => {
		if (!movies.value) return [];
		const start = (currentPage.value - 1) * moviesPerPage;
		const end = start + moviesPerPage;
		return movies.value.slice(start, end);
	});

	// Total pages
	const totalPages = computed(() => {
		if (!movies.value) return 0;
		return Math.ceil(movies.value.length / moviesPerPage);
	});

	// Navigate to a specific page
	const goToPage = (pageNumber) => {
		if (pageNumber > 0 && pageNumber <= totalPages.value) {
			currentPage.value = pageNumber;
		}
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
		formatDate,
		currentPage,
		totalPages,
		goToPage,
		loadingMessage,
	};
}
