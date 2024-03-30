import axios from 'axios'
import type { AxiosInstance, CreateAxiosDefaults } from 'axios'
import type { Logger } from 'tslog'

export default class Request {
  protected readonly rest: AxiosInstance
  protected readonly logger: Logger<unknown>

  constructor(logger: Logger<unknown>, defaults: CreateAxiosDefaults) {
    this.logger = logger.getSubLogger({ name: this.constructor.name })
    this.rest = axios.create(defaults)

    this.rest.interceptors.request.use((config) => {
      const headers = { ...config.headers }

      this.logger.debug(
        `${config.method?.toUpperCase()} ${config.url}` +
          (config.params ? `?${new URLSearchParams(config.params)}` : ''),
        headers,
      )

      return config
    })

    this.rest.interceptors.response.use(
      (response) => {
        this.logger.debug(`${response.status} ${response.statusText}`)

        return response
      },
      (error) => {
        if (axios.isAxiosError(error))
          this.logger.error(error.code, {
            message: error.message,
            response: error.response?.data,
          })
        else this.logger.error(error.stack)
      },
    )
  }

  protected async get<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
  ) {
    const res = await this.rest.get<T>(url, { params })

    return res.data
  }

  protected async post<T = unknown>(
    url: string,
    data?: Record<string, unknown>,
  ) {
    const res = await this.rest.post<T>(url, data)

    return res.data
  }
}
