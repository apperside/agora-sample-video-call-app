import axios, { AxiosRequestConfig, AxiosResponse, CancelTokenSource } from "axios";
import urljoin from "url-join";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type ApiScope = "main" | "other-api"
export type RequestOptions<P = any> = {
  apiScope?: ApiScope;
  url: string;
  extraRoutePath?: string | string[],
  query?: { [key: string]: string };
  headers?: { [key: string]: string };
  payload?: P;
  method?: HttpMethod;
  isProtected?: boolean;
  basicAuth?: {
    username: string;
    password: string;
  }
}

export type CustomRequestHandler = (config: AxiosRequestConfig) => any | Promise<any>
export type CustomResponseHandler = (value: AxiosResponse) => any
export type CustomErrorHandler = (error: any, config: RequestOptions) => any

const axiosInstance = axios.create({
  // baseURL: BASE_SERVER_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" }
});

let apiConfig: NetworkingConfig

type NetworkingConfig = {
  requestHandlers?: CustomRequestHandler[];
  responseHandlers?: CustomResponseHandler[];
  errorHandlers?: CustomErrorHandler[];
  servers: {
    [key in ApiScope]: {
      protocol: string,
      port: number,
      serverAddress: string,
      baseUrl: string,
      headers?: { [key: string]: string }
    }
  },
  loggingEnabled?: boolean
}


export const initNetworking = (config: NetworkingConfig) => {
  apiConfig = config;
};


// simple request handler to log the requests with full config object
axiosInstance.interceptors.request.use(
  async config => {
    if (apiConfig.loggingEnabled) {
      console.log(`performing http ${config.method} to ${config.url} with options and token ${config.headers?.["Authorization"]} `, JSON.stringify(config.data), config);
    }
    return config;
  },
  error => {
    // Do something with request error
    return Promise.reject(error);
  }
);

async function axiosRequest({
  apiScope = "main",
  ...requestOptions
}: RequestOptions, cancelToken?: CancelTokenSource) {
  const { method, url: requestUrl, payload } = requestOptions;
  let { headers = {} } = requestOptions;
  headers = { ...headers, ...apiConfig.servers[apiScope].headers }

  // whenever the url we are passing is a full url so we can also call arbitrary enpoints if needed
  const isFullUrl = requestUrl.toLowerCase().startsWith("http") || requestUrl.toLowerCase().startsWith("https");

  const serverInfo = apiConfig.servers[apiScope];
  let finalUrl = requestUrl;
  if (!isFullUrl) {
    finalUrl = `${serverInfo.protocol}://${serverInfo.serverAddress}:${serverInfo.port}`;
    if (serverInfo.baseUrl) {
      finalUrl = urljoin(finalUrl, serverInfo.baseUrl);
    }
    finalUrl = urljoin(finalUrl, requestUrl);
    console.log("final url is", finalUrl);
  }

  try {
    const result = await axiosInstance.request({
      url: finalUrl,
      headers: headers,
      data: payload,
      method,
      cancelToken: cancelToken?.token,
      auth: requestOptions.basicAuth

    });
    if (apiConfig.loggingEnabled) {
      console.log(`request result for http ${method} to ${finalUrl}`, JSON.stringify(result.data));
    }
    apiConfig.responseHandlers?.forEach((fn) => {
      try {
        fn(result);
      } catch (err) {
        console.warn("error in handler", fn);
      }
    });
    return result.data;
  } catch (error) {
    console.error(`error in http request to ${finalUrl}`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
      stack: error.stack
    });
    apiConfig.errorHandlers?.forEach((fn) => {
      try {
        fn(error, { ...requestOptions, apiScope });
      } catch (err) {
        console.warn("error in handler", fn);
      }
    });
    throw error;
  }
}




/**
 * Function to performa an arbitrary request in a given api scope
 */
export async function httpGet<T>({ isProtected = true, ...requestOptions }: RequestOptions, cancelTokenSource?: CancelTokenSource): Promise<T> {
  return axiosRequest({ isProtected, method: "GET", ...requestOptions }, cancelTokenSource);
}

/**
 * Function to performa an arbitrary request in a given api scope
 */
export async function httpPost<T, P = any>({ isProtected = true, ...requestOptions }: RequestOptions<P>): Promise<T> {
  return axiosRequest({ isProtected, method: "POST", ...requestOptions });
}

export async function httpPut<T>({ isProtected = true, ...requestOptions }: RequestOptions): Promise<T> {
  return axiosRequest({ isProtected, method: "PUT", ...requestOptions });
}

export async function httpDelete<T>({ isProtected = true, ...requestOptions }: RequestOptions, cancelTokenSource?: CancelTokenSource): Promise<T> {
  return axiosRequest({ isProtected, method: "DELETE", ...requestOptions }, cancelTokenSource);
}


export async function patch<T>({ isProtected = true, ...requestOptions }: RequestOptions): Promise<T> {
  return axiosRequest({ isProtected, method: "PATCH", ...requestOptions });
}
