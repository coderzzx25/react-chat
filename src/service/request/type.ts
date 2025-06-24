import type { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// 针对AxiosRequestConfig配置进行扩展
export interface Interceptors<T = AxiosResponse> {
  requestSuccessFn?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
  requestFailureFn?: (err: AxiosError) => Promise<AxiosError>;
  responseSuccessFn?: (res: T) => T;
  responseFailureFn?: (err: AxiosError) => Promise<AxiosError>;
}

export interface RequestConfig<T = AxiosResponse> extends AxiosRequestConfig {
  interceptors?: Interceptors<T>;
}
