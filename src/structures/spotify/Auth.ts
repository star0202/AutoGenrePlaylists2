import { TokenResponse } from '../../types/spotify/Auth'
import CachedRequest from '../Cache'
import express from 'express'
import open from 'open'
import type { Logger } from 'tslog'

export default class SpotifyAuth extends CachedRequest {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly redirectUri: string
  private readonly scopes: string[]

  private code: string | null = null

  constructor(
    logger: Logger<unknown>,
    cachePath: string,
    config: {
      clientId: string
      clientSecret: string
      scopes: string[]
    },
  ) {
    super(logger, cachePath, {
      baseURL: 'https://accounts.spotify.com/api',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    this.clientId = config.clientId
    this.clientSecret = config.clientSecret
    this.scopes = config.scopes

    this.redirectUri = 'http://localhost:8888/callback'
  }

  private async authorize() {
    const app = express()
    const logger = this.logger.getSubLogger({ name: 'Server' })

    app.get('/callback', (req, res) => {
      this.code = req.query.code as string

      res.send('You can now close this tab')

      logger.debug('Received code:', this.code)

      server.close()
    })

    const server = app.listen(8888, () =>
      logger.debug('Server listening on http://localhost:8888'),
    )

    await open(this.authorizeUrl)

    return new Promise<void>((resolve) => server.on('close', resolve))
  }

  get authorizeUrl() {
    return `https://accounts.spotify.com/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${this.redirectUri}&scope=${this.scopes.join(
      '%20',
    )}`
  }

  async getTokenResponse() {
    if (!this.code) await this.authorize()

    return this.post<TokenResponse>('/token', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code: this.code!,
      grant_type: 'authorization_code',
    })
  }
}
