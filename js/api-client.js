(function (global) {
  "use strict";

  const API_BASE = "http://localhost:5000/api/v1";

  async function request(path, options = {}) {
    const config = { ...options };
    const headers = {
      Accept: "application/json",
      ...(config.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(config.headers || {}),
    };

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: config.method || "GET",
        headers,
        body: config.body !== undefined ? JSON.stringify(config.body) : undefined,
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (_error) {
        payload = null;
      }

      if (!response.ok || (payload && payload.ok === false)) {
        const error = new Error((payload && payload.error) || "Request failed");
        error.status = response.status;
        error.payload = payload;
        throw error;
      }

      return payload;
    } catch (error) {
      if (error && error.name === "TypeError" && !error.status) {
        const networkError = new Error("Network error while contacting the API");
        networkError.originalError = error;
        throw networkError;
      }
      throw error;
    }
  }

  const api = {
    baseUrl: API_BASE,
    health: () => request("/health"),
    fetchProblems: (query) => request(`/problems${query ? `?q=${encodeURIComponent(query)}` : ""}`),
    getProblems: (query) => api.fetchProblems(query),
    fetchRouteById: (id) => request(`/routes/${encodeURIComponent(id)}`),
    getRoute: (id) => api.fetchRouteById(id),
    postDraft: (payload) => request("/drafts", { method: "POST", body: payload }),
    generateDraft: (payload) => api.postDraft(payload),
    getTracker: () => request("/tracker"),
    fetchTracker: () => api.getTracker(),
    postTrackerItem: (item) => request("/tracker", { method: "POST", body: item }),
    saveTrackerItem: (item) => api.postTrackerItem(item),
  };

  global.NyayaAPI = api;
})(window);
