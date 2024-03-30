import { createHash } from 'crypto'

export const hash = (data: unknown) =>
  data
    ? createHash('shake256', { outputLength: 8 })
        .update(JSON.stringify(data ?? ''))
        .digest('hex')
    : ''
