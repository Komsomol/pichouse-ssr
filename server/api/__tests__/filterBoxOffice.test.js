import { describe, it, expect } from 'vitest';
import { chooseWeekendChart, parseLatestWeekend, parseWeekends, parseWeekendChart } from '../filterBoxOffice.js';

// Box Office Mojo year index: weekends newest first, each linking to its chart
const yearIndexHtml = `
<table>
	<tr><th>Dates</th><th>Top 10 Gross</th><th>#1 Release</th></tr>
	<tr>
		<td><a href="/weekend/2026W33/?area=GB&amp;ref_=bo_wey_table_1">Aug 14-16</a></td>
		<td>$21,728,564</td>
		<td><a href="/release/rl541425921/?ref_=bo_wey_table_1">Spider-Man: Brand New Day</a></td>
	</tr>
	<tr>
		<td><a href="/weekend/2026W32/?area=GB&amp;ref_=bo_wey_table_2">Aug 7-9</a></td>
		<td>$29,459,798</td>
		<td><a href="/release/rl541425921/?ref_=bo_wey_table_2">Spider-Man: Brand New Day</a></td>
	</tr>
</table>`;

// Builds a chart page with the real column order
const makeChartHtml = rows => `
<table>
	<tr>
		<th>Rank</th><th>LW</th><th>Release</th><th>Gross</th><th>%± LW</th>
		<th>Theaters</th><th>Change</th><th>Average</th><th>Total Gross</th>
		<th>Weeks</th><th>Distributor</th>
	</tr>
	${rows
		.map(
			({ rank, title, gross = '$1,000', total = '$2,000', weeks = '1', distributor = 'Studio' }) => `
	<tr>
		<td>${rank}</td><td>-</td>
		<td><a href="/release/rl1/">${title}</a></td>
		<td>${gross}</td><td>-31.1%</td><td>713</td><td>-</td><td>$15,746</td>
		<td>${total}</td><td>${weeks}</td>
		<td><a href="https://pro.imdb.com/company/co1/">${distributor}</a></td>
	</tr>`,
		)
		.join('')}
</table>`;

describe('parseLatestWeekend', () => {
	it('returns the first weekend link and its date range', () => {
		expect(parseLatestWeekend(yearIndexHtml)).toEqual({
			path: '/weekend/2026W33/?area=GB&ref_=bo_wey_table_1',
			label: 'Aug 14-16',
		});
	});

	it('returns null when the page has no weekend links', () => {
		expect(parseLatestWeekend('<table><tr><td>No data</td></tr></table>')).toBeNull();
		expect(parseLatestWeekend('')).toBeNull();
	});
});

describe('parseWeekends', () => {
	it('lists every weekend newest first', () => {
		expect(parseWeekends(yearIndexHtml).map(weekend => weekend.label)).toEqual(['Aug 14-16', 'Aug 7-9']);
	});

	it('keeps each weekend once, labelled by its date range', () => {
		// Mojo links each row's weekend from the dates and again from the week number
		const html = `
<table>
	<tr>
		<td><a href="/weekend/2026W40/?area=GB&amp;ref_=bo_wey_table_1">Oct 2-4</a></td>
		<td><a href="/weekend/2026W40/?area=GB&amp;ref_=bo_wey_table_1">40</a></td>
	</tr>
	<tr>
		<td><a href="/weekend/2026W39/?area=GB&amp;ref_=bo_wey_table_2">Sep 25-27</a></td>
		<td><a href="/weekend/2026W39/?area=GB&amp;ref_=bo_wey_table_2">39</a></td>
	</tr>
</table>`;
		expect(parseWeekends(html).map(weekend => weekend.label)).toEqual(['Oct 2-4', 'Sep 25-27']);
	});

	it('returns an empty list for unusable input', () => {
		expect(parseWeekends('')).toEqual([]);
		expect(parseWeekends('<p>Down for maintenance</p>')).toEqual([]);
	});
});

describe('chooseWeekendChart', () => {
	const films = count => Array.from({ length: count }, (_, index) => ({ rank: index + 1 }));

	it('skips a newest weekend Mojo has only partly published', () => {
		const chosen = chooseWeekendChart([
			{ weekend: 'Oct 2-4', films: films(2) },
			{ weekend: 'Sep 25-27', films: films(10) },
		]);
		expect(chosen.weekend).toBe('Sep 25-27');
	});

	it('keeps the newest weekend once it is complete', () => {
		const chosen = chooseWeekendChart([
			{ weekend: 'Oct 2-4', films: films(10) },
			{ weekend: 'Sep 25-27', films: films(10) },
		]);
		expect(chosen.weekend).toBe('Oct 2-4');
	});

	it('falls back to the most complete chart when none is full, newer on a tie', () => {
		expect(chooseWeekendChart([
			{ weekend: 'Oct 2-4', films: films(2) },
			{ weekend: 'Sep 25-27', films: films(7) },
			{ weekend: 'Sep 18-20', films: films(5) },
		]).weekend).toBe('Sep 25-27');
		expect(chooseWeekendChart([
			{ weekend: 'Oct 2-4', films: films(4) },
			{ weekend: 'Sep 25-27', films: films(4) },
		]).weekend).toBe('Oct 2-4');
	});

	it('returns null when every scrape came back empty', () => {
		expect(chooseWeekendChart([{ weekend: 'Oct 2-4', films: [] }])).toBeNull();
		expect(chooseWeekendChart([])).toBeNull();
	});
});

describe('parseWeekendChart', () => {
	it('reads rank, title, grosses, weeks and distributor', () => {
		const html = makeChartHtml([
			{
				rank: 1,
				title: 'Spider-Man: Brand New Day',
				gross: '$11,227,500',
				total: '$99,287,459',
				weeks: '3',
				distributor: 'Sony Pictures Releasing',
			},
		]);

		expect(parseWeekendChart(html)).toEqual([
			{
				rank: 1,
				title: 'Spider-Man: Brand New Day',
				label: '',
				weekendGross: '$11,227,500',
				totalGross: '$99,287,459',
				weeks: '3',
				distributor: 'Sony Pictures Releasing',
			},
		]);
	});

	it('separates a re-release label from the film\'s name', () => {
		// Real Mojo markup: the label sits in a span right after the link, with
		// no whitespace between them
		const html = makeChartHtml([
			{
				rank: 1,
				title: 'Avengers: Endgame</a><div class="a-section a-spacing-none"><span class="a-size-small a-color-secondary">2026 Re-release</span></div><a>',
			},
		]);

		const [film] = parseWeekendChart(html);
		expect(film.title).toBe('Avengers: Endgame');
		expect(film.label).toBe('2026 Re-release');
	});

	it('caps the chart at the top 10 and orders by rank', () => {
		const rows = [12, 3, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11].map(rank => ({
			rank,
			title: `Film ${rank}`,
		}));
		const result = parseWeekendChart(makeChartHtml(rows));

		expect(result).toHaveLength(10);
		expect(result.map(film => film.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
	});

	it('honours an explicit limit', () => {
		const rows = [1, 2, 3].map(rank => ({ rank, title: `Film ${rank}` }));
		expect(parseWeekendChart(makeChartHtml(rows), 2)).toHaveLength(2);
	});

	it('skips rows without a numeric rank', () => {
		const html = makeChartHtml([{ rank: 1, title: 'Weapons' }]).replace(
			'<td>1</td>',
			'<td>-</td>',
		);
		expect(parseWeekendChart(html)).toEqual([]);
	});

	it('locates columns by header, not position', () => {
		// Distributor moved ahead of Weeks
		const html = `
			<table>
				<tr><th>Rank</th><th>Release</th><th>Gross</th><th>Distributor</th><th>Weeks</th></tr>
				<tr><td>1</td><td>Weapons</td><td>$838,351</td><td>Warner Bros.</td><td>4</td></tr>
			</table>`;
		const [film] = parseWeekendChart(html);

		expect(film.distributor).toBe('Warner Bros.');
		expect(film.weeks).toBe('4');
		expect(film.totalGross).toBe('');
	});

	it('returns an empty array for unusable input', () => {
		expect(parseWeekendChart('')).toEqual([]);
		expect(parseWeekendChart('<p>Down for maintenance</p>')).toEqual([]);
		expect(parseWeekendChart('<table><tr><th>Nope</th></tr></table>')).toEqual([]);
	});
});
