import { BASE_URL, TIME_OUT } from './config';
import Request from './request';

// 后端返回的错误对象
interface IResponseError {
  statusCode: string;
  message: string;
}

// 统一的请求对象
const request = new Request({
  baseURL: BASE_URL,
  timeout: TIME_OUT,
  interceptors: {
    requestSuccessFn: (config) => {
      return config;
    },
    requestFailureFn: (error) => {
      return Promise.reject(error);
    },
    responseSuccessFn: (response) => {
      return response.data;
    },
    responseFailureFn: (error) => {
      if (error.code === 'NETWORK_ERROR') {
        return Promise.reject(new Error('服务器错误'));
      }

      if (error.response) {
        const responseError = error.response.data as IResponseError;

        return Promise.reject(responseError.message);
      }

      return Promise.reject(new Error('未知错误'));
    }
  }
});

export default request;
