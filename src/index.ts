import SpotifyAuth from './structures/spotify/Auth'
import SpotifyClient from './structures/spotify/Client'
import type {
  Album,
  Artist,
  SavedTrack,
  SimplifiedPlaylist,
  Track,
} from './types/spotify'
import { delay } from './utils/promise'
import { config } from 'dotenv'
import { Logger } from 'tslog'

config()

const THRESHOLD = 25
const DELAY = 10

const logger = new Logger({
  name: 'Main',
  prettyLogTemplate:
    '{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{name}}]\t',
  prettyLogTimeZone: 'local',
  minLevel: process.env.NODE_ENV === 'development' ? 2 : 3,
})

const getLibrary = async (client: SpotifyClient) => {
  const ids = await client
    .iterate<SavedTrack>({
      url: '/me/tracks?limit=50',
    })
    .then((tracks) => tracks.map((track) => track.track.id))

  const chunks = []
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50))

  const tracks = await Promise.all(
    chunks.map((chunk) => client.getTracks(chunk)),
  )

  const artists = new Set(
    tracks
      .map((track) =>
        track.tracks.map((t) => t.artists.map((a) => a.id)).flat(),
      )
      .flat(),
  )

  const artistChunks = []
  for (let i = 0; i < artists.size; i += 50)
    artistChunks.push(Array.from(artists).slice(i, i + 50))

  const artistData = await Promise.all(
    artistChunks.map((chunk) => client.getArtists(chunk)),
  )

  const artistMap = artistData.reduce(
    (acc, cur) => {
      for (const artist of cur.artists) acc[artist.id] = artist

      return acc
    },
    {} as Record<string, Artist>,
  )

  return tracks
    .map((track) =>
      track.tracks.map((t) => ({
        ...t,
        artists: t.artists.map((a) => artistMap[a.id]),
      })),
    )
    .flat()
}

const filterTracksByGenre = (
  library: {
    artists: Artist[]
    id: string
    name: string
    album: Album
    uri: string
  }[],
) => {
  const tracksByGenre = library.reduce(
    (acc, track) => {
      track.artists.forEach((artist) => {
        if (!artist.genres) return acc['Unknown'].push(track)

        artist.genres.forEach((genre) => {
          if (!acc[genre]) acc[genre] = []

          acc[genre].push(track)
        })
      })

      return acc
    },
    { Unknown: [] } as Record<string, Track[]>,
  )

  const data = Object.entries(tracksByGenre)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([genre, tracks]) => ({
      genre,
      tracks,
    }))

  data.forEach((d) => {
    const idSet = new Set<string>()

    d.tracks = d.tracks.filter((t) => {
      if (idSet.has(t.id)) return false

      idSet.add(t.id)

      return true
    })
  })

  return data.filter((genre) => genre.tracks.length >= THRESHOLD)
}

const unfollowGenrePlaylists = async (client: SpotifyClient) => {
  const playlists = await client.iterate<SimplifiedPlaylist>({
    url: '/me/playlists',
    override: true,
  })

  for (const id of playlists
    .filter((p) => p.name.startsWith('Genre: '))
    .map((p) => p.id)) {
    await client.unfollowPlaylist(id)

    await delay(DELAY)
  }
}

const createGenrePlaylists = async (
  client: SpotifyClient,
  data: {
    genre: string
    tracks: Track[]
  }[],
) => {
  const me = await client.me()

  for (const d of data) {
    const playlist = await client.createPlaylist(
      me.id,
      `Genre: ${d.genre} (Automated)`,
    )

    const uris = d.tracks.map((t) => t.uri)

    const chunks = []
    for (let i = 0; i < uris.length; i += 100)
      chunks.push(uris.slice(i, i + 100))

    for (const chunk of chunks) {
      await client.addTracksToPlaylist(playlist.id, chunk)

      await delay(DELAY)
    }

    logger.info(`Created playlist for ${d.genre}`)

    await delay(DELAY)
  }
}

const main = async () => {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    logger.error('Missing Spotify client ID or client secret')
    process.exit(1)
  }

  const auth = new SpotifyAuth(logger, 'caches', {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    scopes: [
      'user-read-private',
      'user-read-email',
      'user-library-read',
      'playlist-read-private',
      'playlist-modify-public',
      'playlist-modify-private',
    ],
  })

  const res = await auth.getTokenResponse()

  const client = new SpotifyClient(logger, 'caches', res.access_token)

  const library = await getLibrary(client)

  const data = filterTracksByGenre(library)

  logger.info(data.map((d) => d.genre).join(', '))

  await unfollowGenrePlaylists(client)

  await createGenrePlaylists(client, data)
}

main()

process
  .on('unhandledRejection', (err) => logger.error(err))
  .on('uncaughtException', (err) => logger.error(err.stack))
  .on('warning', (err) => logger.warn(err))
