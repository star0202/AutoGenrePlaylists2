import SpotifyAuth from './structures/spotify/Auth'
import SpotifyClient from './structures/spotify/Client'
import type { Track } from './types/spotify/Track'
import { config } from 'dotenv'
import { writeFile } from 'fs/promises'
import { Logger } from 'tslog'

config()

const logger = new Logger({
  name: 'Main',
  prettyLogTemplate:
    '{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{name}}]\t',
  prettyLogTimeZone: 'local',
  minLevel: process.env.NODE_ENV === 'development' ? 2 : 3,
})

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
      'playlist-modify-private',
    ],
  })

  const res = await auth.getTokenResponse()

  const client = new SpotifyClient(logger, 'caches', res.access_token)

  const tracks = await client.getLibraryTracks()

  const tracksByGenre = tracks.reduce(
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
    .filter((genre) => genre.tracks.length >= 100)

  await writeFile('data.json', JSON.stringify(data, null, 2))

  logger.info(data.length)
}

main()

process
  .on('unhandledRejection', (err) => logger.error(err))
  .on('uncaughtException', (err) => logger.error(err.stack))
  .on('warning', (err) => logger.warn(err))
