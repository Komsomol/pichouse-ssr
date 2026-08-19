import { computed } from 'vue';
import { useFetch } from '#app';

/**
 * UK box office top 10: fetching and display helpers.
 *
 * Mirrors the shape of useMovieList and useTrailerList so all three pages read
 * the same way. Ten films need no pagination or filtering.
 */
export default function useBoxOfficeList() {
	const { data, pending, error } = useFetch('/api/boxoffice');

	const films = computed(() => data.value?.films || []);
	const weekend = computed(() => data.value?.weekend || '');
	const currency = computed(() => data.value?.currency || '');

	// Mojo prints an em dash for a figure it does not hold
	const formatValue = value =>
		!value || value === '-' || value === 'N/A' ? '' : value;

	// One dot-separated line of whatever OMDB and the chart actually returned
	const metaLine = film =>
		[
			formatValue(film.year),
			formatValue(film.runtime),
			formatValue(film.rating) && `★ ${film.rating}`,
			formatValue(film.distributor),
			formatValue(film.weeks) && `week ${film.weeks}`,
		]
			.filter(Boolean)
			.join(' · ');

	return {
		films,
		weekend,
		currency,
		pending,
		error,
		formatValue,
		metaLine,
	};
}
