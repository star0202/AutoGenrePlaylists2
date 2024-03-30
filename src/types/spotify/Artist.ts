export type PartialArtist = {
  id: string
  name: string
}

export type Artist = PartialArtist & {
  genres: string[]
}
