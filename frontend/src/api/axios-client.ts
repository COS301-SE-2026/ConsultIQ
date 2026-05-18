import axios from "axios";

let getAccessToken: () => string | null;
let refreshTokenFn: () => Promise<string | null>;
let logoutFn: () => void;

export const injectAuth = ({
  getToken,
  refreshToken,
  logout,
}: {
  getToken: () => string | null;
  refreshToken: () => Promise<string | null>;
  logout: () => void;
}) => {
  getAccessToken = getToken;
  refreshTokenFn = refreshToken;
  logoutFn = logout;
};

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});


api.interceptors.request.use((config) => {
  const token = getAccessToken?.();

  if (token && config.headers) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  return config;
});

// ---- Refresh logic ----
let isRefreshing = false;
let queue: ((token: string | null) => void)[] = [];

const processQueue = (token: string | null) => {
  queue.forEach((cb) => cb(token));
  queue = [];
};

// ---- Response interceptor ----
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push((token) => {
          if (!token) return reject(error);

          originalRequest.headers["Authorization"] = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const newToken = await refreshTokenFn();

      if (!newToken) throw new Error("Refresh failed");

      processQueue(newToken);

      originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (err) {
      processQueue(null);
      logoutFn();
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;