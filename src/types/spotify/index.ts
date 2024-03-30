export * from './Album'
export * from './Artist'
export * from './Auth'
export * from './Playlist'
export * from './Track'
export * from './User'

export type IterableResponse<T> = {
  next: string | null
  items: T[]
}
