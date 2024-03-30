import { hash } from '../utils/hash'
import Request from './Request'
import type { CreateAxiosDefaults } from 'axios'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { Logger } from 'tslog'

class CacheManager {
  private readonly logger: Logger<unknown>
  private readonly cachePath: string

  constructor(logger: Logger<unknown>, cachePath: string) {
    this.logger = logger.getSubLogger({ name: 'Cache' })
    this.cachePath = cachePath
  }

  async cachedCall<T>(name: string, func: () => Promise<T>, override = false) {
    const cache = await this.readCache<T>(name)

    if (cache && !override) {
      this.logger.debug(`Using cache for ${name}`)

      return cache
    }

    this.logger.debug(`Fetching data for ${name}`)

    const data = await func()

    await this.writeCache(name, data)

    return data
  }

  protected async readCache<T>(name: string) {
    const path = join(this.cachePath, `${name}.json`)

    return readFile(path, 'utf-8')
      .then((data) => JSON.parse(data) as T)
      .catch(() => null)
  }

  protected async writeCache(name: string, data: unknown) {
    const path = join(this.cachePath, `${name}.json`)

    return writeFile(path, JSON.stringify(data, null, 2))
  }
}

export default class CachedRequest extends Request {
  private readonly cache: CacheManager

  constructor(
    logger: Logger<unknown>,
    cachePath: string,
    defaults: CreateAxiosDefaults,
  ) {
    super(logger, defaults)

    this.cache = new CacheManager(logger, cachePath)
  }

  private async cachedRequest<T>(
    method: 'get',
    url: string,
    params?: Record<string, unknown>,
    override = false,
  ) {
    const _url = url.startsWith('/') ? url.slice(1) : url
    const _hash = hash(params)
    return this.cache.cachedCall(
      `${this.constructor.name}.${method}.${_url.replaceAll('/', '_')}${
        _hash ? `.${_hash}` : ''
      }`,
      () => super[method]<T>(url, params),
      override,
    )
  }

  protected async get<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    override = false,
  ) {
    return this.cachedRequest<T>('get', url, params, override)
  }
}
