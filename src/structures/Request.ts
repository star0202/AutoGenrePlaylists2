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
      const data = config.params || config.data || null

      this.logger.debug(
        `${config.method?.toUpperCase()} ${config.url}` +
          (data ? `?${new URLSearchParams(data)}` : ''),
        headers,
      )

      return config
    })

    this.rest.interceptors.response.use(
      (response) => {
        this.logger.debug(
          `${response.request.method?.toUpperCase()} ${response.config.url}`,
          {
            status: response.status,
            statusText: response.statusText,
          },
        )

        return response
      },
      (error) => {
        if (axios.isAxiosError(error))
          this.logger.error(
            `${error.request.method?.toUpperCase()} ${error.config?.url}`,
            {
              code: error.code,
              message: error.message,
              response: error.response?.data,
            },
          )
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

  protected async delete<T = unknown>(url: string) {
    const res = await this.rest.delete<T>(url)

    return res.data
  }
}
