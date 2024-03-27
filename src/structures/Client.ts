import type { SavedTracks, Track } from '../types/spotify/Track'
import Request from './Request'
import type { Logger } from 'tslog'

export default class Client extends Request {
  constructor(logger: Logger<unknown>, token: string) {
    super(logger, {
      baseURL: 'https://api.spotify.com/v1',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  protected async getTracks(ids: string[]) {
    return this.get<{ tracks: Track[] }>(`/tracks`, { ids: ids.join(',') })
  }

  async getLibraryTracks() {
    // request /me/tracks until res.next is null
    const ids: string[] = []

    let res: SavedTracks = {
      next: 'https://api.spotify.com/v1/me/tracks?limit=50',
      items: [],
    }

    while (res.next) {
      res = await this.get<SavedTracks>(res.next)

      ids.push(...res.items.map((item) => item.track.id))
    }

    const chunks = []
    for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50))

    const tracks = await Promise.all(
      chunks.map((chunk) => this.getTracks(chunk)),
    )

    return tracks.map((track) => track.tracks).flat()
  }
}
