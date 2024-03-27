import SpotifyAuth from './structures/spotify/Auth'
import SpotifyClient from './structures/spotify/Client'
import { config } from 'dotenv'
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

  const auth = new SpotifyAuth(logger, {
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

  const client = new SpotifyClient(logger, res.access_token)

  const tracks = await client.getLibraryTracks()

  logger.info(tracks)
}

main()

process
  .on('unhandledRejection', (err) => logger.error(err))
  .on('uncaughtException', (err) => logger.error(err.stack))
  .on('warning', (err) => logger.warn(err))
