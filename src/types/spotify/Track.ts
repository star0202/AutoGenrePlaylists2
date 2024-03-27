import type { Album } from './Album'
import type { Artist } from './Artist'

export type SavedTracks = {
  next: string | null
  items: {
    track: {
      id: string
    }
  }[]
}

export type Track = {
  id: string
  name: string
  album: Album
  artists: Artist[]
}
