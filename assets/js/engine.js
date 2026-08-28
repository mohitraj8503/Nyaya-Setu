/* NyayaSetu deterministic rules engine v2 + LocalStorage tracker.
 * Problems → (wizard answers) → curated routeId → verified route.
 * Pure functions over curated NYAYA data — no AI/LLM routing. */
(function () {
  "use strict";
  const D = window.NYAYA || { problems: [], sources: {}, routes: {} };

  function findProblems(query, cat) {
    query = (query || "").toLowerCase().trim();
    return D.problems.filter((p) => {
      const inCat = !cat || cat === "All" || p.cat === cat;
      const inText = !query ||
        p.title.toLowerCase().includes(query) ||
        p.desc.toLowerCase().includes(query) ||
        p.cat.toLowerCase().includes(query);
      return inCat && inText;
    });
  }
  function categories() { return ["All", ...Array.from(new Set(D.problems.map((p) => p.cat)))]; }
  function getProblem(id) { return D.problems.find((p) => p.id === id) || null; }

  /* Pick the curated route from answers; never invents a destination. */
  function resolveRouteId(problem, answers) {
    const r = problem.routes || {};
    if (r.byAnswer && answers) {
      for (const key of Object.keys(r.byAnswer)) {
        const val = answers[key];
        if (val && r.byAnswer[key][val]) return r.byAnswer[key][val];
      }
    }
    return r.default || null;
  }

  function evaluateRules(problemId, answers) {
    const p = getProblem(problemId);
    if (!p) return null;
    const routeId = resolveRouteId(p, answers || {});
    const route = D.routes[routeId] || null;
    if (!route) return null;
    const src = D.sources[route.sourceKey] || null;
    return {
      problem: p,
      route: route,
      source: src,
      emergency: !!(p.emergency && answers && answers.emergency === "yes"),
      why: route.purpose,
      docs: p.docs,
      draft: p.draft,
    };
  }
  function buildActionPlan(route) { return route; }

  function generateDraft(template, values) {
    if (!template) return { subject: "", body: "" };
    const fill = (s) => String(s || "").replace(/\{(\w+)\}/g, (_, k) =>
      values && values[k] !== undefined && values[k] !== "" ? values[k] : "______");
    return { subject: fill(template.subject), body: fill(template.body) };
  }

  /* ---------- LocalStorage tracker (privacy-first, local only) ---------- */
  const KEY = "nyayasetu_tracker_v1";
  function loadTrackerItems() {
    try { const a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function persist(items) { try { localStorage.setItem(KEY, JSON.stringify(items)); return true; } catch (e) { return false; } }
  function saveTrackerItem(item) {
    const items = loadTrackerItems();
    const now = new Date().toISOString();
    if (item.id) {
      const i = items.findIndex((x) => x.id === item.id);
      if (i >= 0) { items[i] = Object.assign({}, items[i], item, { updatedAt: now }); persist(items); return items[i]; }
    }
    const rec = Object.assign({
      id: "t_" + Date.now() + "_" + Math.floor(Math.random() * 1e4),
      title: "", portalName: "", referenceNo: "", status: "Prepared",
      createdAt: now.slice(0, 10), dueAt: "", notes: "",
    }, item, { updatedAt: now });
    items.unshift(rec); persist(items); return rec;
  }
  function deleteTrackerItem(id) { persist(loadTrackerItems().filter((x) => x.id !== id)); }
  function updateTrackerItem(id, patch) {
    const items = loadTrackerItems();
    const i = items.findIndex((x) => x.id === id);
    if (i >= 0) { items[i] = Object.assign({}, items[i], patch, { updatedAt: new Date().toISOString() }); persist(items); return items[i]; }
    return null;
  }

  window.NyayaEngine = {
    findProblems, categories, getProblem, resolveRouteId,
    evaluateRules, buildActionPlan, generateDraft,
    loadTrackerItems, saveTrackerItem, deleteTrackerItem, updateTrackerItem,
  };
})();
