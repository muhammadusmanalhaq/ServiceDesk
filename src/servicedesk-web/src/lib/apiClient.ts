import createClient, { Middleware } from "openapi-fetch";
import type { paths } from "./api-types";

// Dynamically pull the URL we just injected into the environment
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5093";

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const apiFetch = createClient<paths>({ baseUrl: API_BASE_URL });

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    if (accessToken) {
      request.headers.set("Authorization", `Bearer ${accessToken}`);
    }
    const newRequest = new Request(request, {
      credentials: "include"
    });
    return newRequest;
  },
  async onResponse({ request, response }) {
    if (response.status === 401 && !request.url.includes("/api/auth/refresh")) {
      try {
        const refreshReq = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (refreshReq.ok) {
          const data = await refreshReq.json();
          setAccessToken(data.accessToken);

          const newRequest = new Request(request, {
            headers: new Headers(request.headers),
          });
          newRequest.headers.set("Authorization", `Bearer ${data.accessToken}`);
          const retryResponse = await fetch(newRequest);
          return retryResponse;
        } else {
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
