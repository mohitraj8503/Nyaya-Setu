(function (window) {
  "use strict";

  var API_BASE = "http://localhost:5000/api/v1";

  function request(path, options) {
    var config = options || {};
    return fetch(API_BASE + path, {
      method: config.method || "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: config.body ? JSON.stringify(config.body) : undefined,
    }).then(function (response) {
      return response.json().then(function (payload) {
        if (!response.ok || (payload && payload.ok === false)) {
          var error = new Error((payload && payload.error) || "Request failed");
          error.status = response.status;
          error.payload = payload;
          throw error;
        }
        return payload;
      });
    });
  }

  window.NyayaAPI = {
    baseUrl: API_BASE,
    health: function () {
      return request("/health");
    },
    getProblems: function (query) {
      var suffix = query ? "?q=" + encodeURIComponent(query) : "";
      return request("/problems" + suffix);
    },
    getRoute: function (id) {
      return request("/routes/" + encodeURIComponent(id));
    },
    generateDraft: function (payload) {
      return request("/drafts/generate", { method: "POST", body: payload });
    },
    getTracker: function () {
      return request("/tracker");
    },
    saveTrackerItem: function (item) {
      return request("/tracker", { method: "POST", body: item });
    },
  };
})(window);
