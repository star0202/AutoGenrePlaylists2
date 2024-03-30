import type { Album } from './Album'
import type { PartialArtist } from './Artist'

export type SavedTrack = {
  track: {
    id: string
    artists: PartialArtist[]
  }
}

export type Track = {
  id: string
  name: string
  album: Album
  artists: PartialArtist[]
  uri: string
}
