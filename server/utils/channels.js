/**
 * Studio YouTube channels used by the trailers feed.
 *
 * Ported from the Movie-Trailers project (data/channels.js). The `channelURL`
 * handle it also carried is unused here - the uploads playlist is derived from
 * the channel ID instead, so only the ID and display name are needed.
 *
 * Netflix, HBO and Hulu were dropped from the source list: this site exists to
 * show what is on at the cinema, and those three release straight to streaming.
 * Apple TV and Amazon Studios are kept - both put films in UK cinemas.
 */

export const STUDIO_CHANNELS = [
	{ name: '20th Century Fox', channelID: 'UC2-BeLxzUBSs0uSrmzWhJuQ' },
	{ name: 'Annapurna Pictures', channelID: 'UCDRFfiYEWr_VSwGIrhY9k8g' },
	{ name: 'Focus Features', channelID: 'UCU4SM3j_9TNWaSu8KdGV50g' },
	{ name: 'IFC Films', channelID: 'UCOn923UnbV8H9zo_lO6ZCRw' },
	{ name: 'Legendary', channelID: 'UCAVadSTSh382kte-fQHqMNw' },
	{ name: 'Lionsgate Movies', channelID: 'UCJ6nMHaJPZvsJ-HmUmj1SeA' },
	{ name: 'Magnolia Pictures & Magnet Releasing', channelID: 'UCneoi6WTgRjMh4otvpwzv8w' },
	{ name: 'Marvel Entertainment', channelID: 'UCvC4D8onUfXzvjTOM-dBfEA' },
	{ name: 'MGM', channelID: 'UCf5CjDJvsFvtVIhkfmKAwAA' },
	{ name: 'Open Road Films', channelID: 'UClt5Bst8Ji05dZvTUdnO85g' },
	{ name: 'Paramount Pictures', channelID: 'UCF9imwPMSGz4Vq1NiTWCC7g' },
	{ name: 'Warner Bros. Pictures', channelID: 'UCjmJDM5pRKbUlVIzDYYWb6g' },
	{ name: 'Disney', channelID: 'UC_5niPa-d35gg88HaS7RrIw' },
	{ name: 'Universal Pictures', channelID: 'UCq0OueAsdxH6b8nyAspwViw' },
	{ name: 'Disney Pixar', channelID: 'UC_IRYSp4auq7hKLvziWVH6w' },
	{ name: 'Sony Pictures Entertainment', channelID: 'UCz97F7dMxBNOfGYu3rx8aCw' },
	{ name: 'STX Entertainment', channelID: 'UCtlp8d4cZg2eMrVbq7vxg9w' },
	{ name: 'Bleeker Street', channelID: 'UCafnP6JPjVq8AahYaThUelg' },
	{ name: 'Neon', channelID: 'UCpy5dRhZd-JbZP4NsrnLt1w' },
	{ name: 'A24', channelID: 'UCuPivVjnfNo4mb3Oog_frZg' },
	{ name: 'Dogwoof', channelID: 'UCNruPWfg4GUGw3RcwaKtsXQ' },
	{ name: 'Universal UK', channelID: 'UCQLBOKpgXrSj3nPU-YC3K9Q' },
	{ name: 'Amazon Studios', channelID: 'UCyouSlyNTfwX_pnGvlfIL3Q' },
	{ name: 'Momentum Pictures', channelID: 'UCElLRsuDWeYdOT3GgNZAUeQ' },
	{ name: 'Kinolorber', channelID: 'UCtlPYzQ188v4gHQ5VyikNiw' },
	{ name: 'Blumhouse', channelID: 'UCCEfOHkckMXnoZQAjUZsMig' },
	{ name: 'Star Wars', channelID: 'UCZGYJFUizSax-yElQaFDp5Q' },
	{ name: 'Gunpowder & Sky', channelID: 'UCB9U0iEZ7mg4ysOkhFqzbAw' },
	{ name: 'The Orchard Movies', channelID: 'UCkML5g9N_azgHB7KQJ5fWLw' },
	{ name: 'MarVista Entertainment', channelID: 'UC9p_Ow_Xnj7cR_xOwVU72-g' },
	{ name: 'RoadsideFlix', channelID: 'UCH45phx_o8pNt9PwbjxWhcA' },
	{ name: 'Regatta', channelID: 'UCkQCQhMF5hmR-X1Ij48u6BQ' },
	// 'Disney Movie Trailers' (UCuaFvcY4MhZY3U43mMt1dYQ) was dropped from the
	// source list - that channel no longer exists, so it only ever logged an
	// error and burned a request. Disney's other channels are still listed.
	{ name: 'Illumination', channelID: 'UCq7OHvWO6Z3u-LztFdrcU-g' },
	{ name: 'Apple TV', channelID: 'UC1Myj674wRVXB9I4c6Hm5zA' },
	{ name: 'Briarcliff Entertainment', channelID: 'UCfnXpb2MPBULONuZCyaKgmA' },
	{ name: 'Cranked Up Films', channelID: 'UCTdIZ-HAhxXqYTz7bQGftQA' },
	{ name: 'AXISPACIFIC FILMWORKS', channelID: 'UCTGQ6ucv6XMUSo98H6z2Zew' },
	{ name: 'RLJE Films', channelID: 'UC7QRIwDb8shSnZE8XB0lx4A' },
	{ name: 'Participant', channelID: 'UCaqPIODQHO1PsNLrfi-ejEA' },
	{ name: 'Film Movement', channelID: 'UCk7fo5zbnRRGUu-FfvLIyag' },
	{ name: 'Sony Pictures Classics', channelID: 'UCruD_lL-5fmllpKMSL-yCyQ' },
	{ name: 'Searchlight Pictures', channelID: 'UCor9rW6PgxSQ9vUPWQdnaYQ' },
	{ name: 'Miramax', channelID: 'UCaVwpbqM8dkhQvbL8XileAA' },
	{ name: 'DreamWorks Animation', channelID: 'UCML7eumxGQaiFur_mNAebag' },
	{ name: 'Studiocanal UK', channelID: 'UCFSILgKCKo35QYGz8Kob51g' },
	{ name: 'Shout! Studios', channelID: 'UCpHaAKu74UHvcYCi2g_PvBQ' },
	{ name: 'Vertical Entertainment', channelID: 'UC_kr2hND7WcVRBV2AaazGrQ' },
	{ name: 'Saban Films', channelID: 'UCkaUErzjD9UUM8D-loIm5vA' },
	{ name: 'Well Go USA Entertainment', channelID: 'UCvE8nyjdQG0_rgx9u3oqadw' },
	{ name: 'GKIDS Films', channelID: 'UCb9ME2w6Y_4jChUVlWdltVg' },
];
