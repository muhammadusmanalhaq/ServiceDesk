import createClient, { Middleware } from "openapi-fetch";
import type { paths } from "./api-types";

// Keep token in memory (set by AuthContext upon login)
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

// Create the openapi-fetch client
export const apiFetch = createClient<paths>({ baseUrl: "http://127.0.0.1:5093/" });

// Authentication and Refresh Interceptor
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    if (accessToken) {
      request.headers.set("Authorization", `Bearer ${accessToken}`);
    }
    
    // API requires cookies for the refresh token
    const newRequest = new Request(request, {
      credentials: "include"
    });
    
    return newRequest;
  },
  async onResponse({ request, response }) {
    if (response.status === 401 && !request.url.includes("/api/auth/refresh")) {
      try {
        // Try to refresh token
        const refreshReq = await fetch("http://127.0.0.1:5093/api/auth/refresh", {
          method: "POST",
          credentials: "include", // send httpOnly cookie
        });

        if (refreshReq.ok) {
          const data = await refreshReq.json();
          setAccessToken(data.accessToken);

          // Retry original request
          const newRequest = new Request(request, {
            headers: new Headers(request.headers),
          });
          newRequest.headers.set("Authorization", `Bearer ${data.accessToken}`);
          const retryResponse = await fetch(newRequest);
          return retryResponse;
        } else {
          // Refresh failed, clear token and redirect to login
          setAccessToken(null);
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
      } catch (err) {
        setAccessToken(null);
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return response;
  }
};

apiFetch.use(authMiddleware);
