import { ref, computed, watch } from 'vue';
import { useFetch } from '#app';

const TRAILERS_PER_PAGE = 20;
const ALL_STUDIOS = 'all';

/**
 * Studio trailers list: fetching, studio filtering and pagination.
 * Mirrors the shape of useMovieList so both pages read the same way.
 */
export default function useTrailerList() {
	const { data: trailers, pending, error } = useFetch('/api/trailers');

	const selectedStudio = ref(ALL_STUDIOS);
	const currentPage = ref(1);

	// A trailer belongs to its own channel plus any studio that co-released it,
	// so a co-released film shows up under either studio's filter.
	const studiosFor = trailer => [trailer.channel, ...(trailer.alsoFrom || [])];

	// Studios present in the feed, with counts, alphabetically ordered
	const studioCounts = computed(() => {
		if (!trailers.value) return [];

		const counts = new Map();
		trailers.value.forEach((trailer) => {
			studiosFor(trailer).forEach((studio) => {
				counts.set(studio, (counts.get(studio) || 0) + 1);
			});
		});

		return [...counts.entries()]
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => a.name.localeCompare(b.name));
	});

	const filteredTrailers = computed(() => {
		if (!trailers.value) return [];
		if (selectedStudio.value === ALL_STUDIOS) return trailers.value;

		return trailers.value.filter(trailer =>
			studiosFor(trailer).includes(selectedStudio.value),
		);
	});

	const totalPages = computed(() =>
		Math.ceil(filteredTrailers.value.length / TRAILERS_PER_PAGE),
	);

	const paginatedTrailers = computed(() => {
		const start = (currentPage.value - 1) * TRAILERS_PER_PAGE;
		return filteredTrailers.value.slice(start, start + TRAILERS_PER_PAGE);
	});

	// Changing the filter can leave us past the end of the shorter result set
	watch(selectedStudio, () => {
		currentPage.value = 1;
	});

	const goToPage = (pageNumber) => {
		if (pageNumber > 0 && pageNumber <= totalPages.value) {
			currentPage.value = pageNumber;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	};

	const setSelectedStudio = (studio) => {
		selectedStudio.value = studio;
	};

	return {
		trailers,
		pending,
		error,
		selectedStudio,
		setSelectedStudio,
		studioCounts,
		filteredTrailers,
		paginatedTrailers,
		currentPage,
		totalPages,
		goToPage,
		ALL_STUDIOS,
	};
}
