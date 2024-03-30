import type {
  Artist,
  IterableResponse,
  Playlist,
  Track,
  User,
} from '../../types/spotify'
import CachedRequest from '../Cache'
import type { Logger } from 'tslog'

export default class SpotifyClient extends CachedRequest {
  constructor(logger: Logger<unknown>, cachePath: string, token: string) {
    super(logger, cachePath, {
      baseURL: 'https://api.spotify.com/v1',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  async me() {
    return this.get<User>('/me')
  }

  async getTracks(ids: string[]) {
    return this.get<{ tracks: Track[] }>(`/tracks`, { ids: ids.join(',') })
  }

  async getArtists(ids: string[]) {
    return this.get<{ artists: Artist[] }>(`/artists`, { ids: ids.join(',') })
  }

  async createPlaylist(userId: string, name: string, _public = false) {
    return this.post<Playlist>(`/users/${userId}/playlists`, {
      name,
      public: _public,
    })
  }

  async addTracksToPlaylist(id: string, uris: string[]) {
    return this.post(`/playlists/${id}/tracks`, { uris })
  }

  async unfollowPlaylist(id: string) {
    return this.delete(`/playlists/${id}/followers`)
  }

  async iterate<T>(config: { url: string; override?: boolean }) {
    const items: T[] = []

    let res: IterableResponse<T> = {
      next: config.url,
      items: [],
    }

    while (res.next) {
      res = await this.get<IterableResponse<T>>(
        res.next.replace('https://api.spotify.com/v1', ''),
        undefined,
        config.override,
      )

      items.push(...res.items)
    }

    return items
  }
}
