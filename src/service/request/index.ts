import axios from 'axios';
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { Interceptors, RequestConfig } from './type';

class Request {
  private instance: AxiosInstance;
  private interceptors?: Interceptors;

  constructor(config: RequestConfig) {
    this.instance = axios.create(config);
    this.interceptors = config.interceptors;

    // 用户自定义拦截器
    if (this.interceptors) {
      const { requestFailureFn, requestSuccessFn, responseFailureFn, responseSuccessFn } = this.interceptors;

      requestFailureFn && this.instance.interceptors.request.use(requestSuccessFn, requestFailureFn);
      responseFailureFn && this.instance.interceptors.response.use(responseSuccessFn, responseFailureFn);
    }

    // 默认拦截器：loading
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.instance.interceptors.response.use(
      (res: AxiosResponse) => {
        return res;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  request<T = unknown>(config: RequestConfig<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.instance
        .request<unknown, T>(config)
        .then((res) => resolve(res))
        .catch((err) => reject(err));
    });
  }

  get<T>(config: RequestConfig<T>): Promise<T> {
    return this.request({ ...config, method: 'GET' });
  }

  post<T>(config: RequestConfig<T>): Promise<T> {
    return this.request({ ...config, method: 'POST' });
  }

  delete<T>(config: RequestConfig<T>): Promise<T> {
    return this.request({ ...config, method: 'DELETE' });
  }

  patch<T>(config: RequestConfig<T>): Promise<T> {
    return this.request({ ...config, method: 'PATCH' });
  }
}

export default Request;
