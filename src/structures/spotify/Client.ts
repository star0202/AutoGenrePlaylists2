import type { Artist } from '../../types/spotify/Artist'
import type { SavedTrack, Track } from '../../types/spotify/Track'
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

  private async getTracks(ids: string[]) {
    return this.get<{ tracks: Track[] }>(`/tracks`, { ids: ids.join(',') })
  }

  private async getArtists(ids: string[]) {
    return this.get<{ artists: Artist[] }>(`/artists`, { ids: ids.join(',') })
  }

  private async iterate<T>(url: string, params?: Record<string, unknown>) {
    const items: T[] = []

    let res: { next: string | null; items: T[] } = {
      next: url,
      items: [],
    }

    while (res.next) {
      res = await this.get<{ next: string | null; items: T[] }>(
        res.next.replace('https://api.spotify.com/v1', ''),
        params,
      )

      items.push(...res.items)
    }

    return items
  }

  async getLibraryTracks() {
    const ids = await this.iterate<SavedTrack>('/me/tracks?limit=50').then(
      (tracks) => tracks.map((track) => track.track.id),
    )

    const chunks = []
    for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50))

    const tracks = await Promise.all(
      chunks.map((chunk) => this.getTracks(chunk)),
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
      artistChunks.map((chunk) => this.getArtists(chunk)),
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
}
