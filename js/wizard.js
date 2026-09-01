(function () {
  "use strict";

  var root = document.getElementById("nyaya-wizard");
  if (!root || !window.NyayaAPI) {
    return;
  }

  var state = {
    problems: [],
    selectedProblem: null,
    route: null,
    answers: {},
    step: "search",
  };

  root.innerHTML =
    '<div class="nyaya-app-card">' +
    '<div class="nyaya-kicker">[ Action Wizard ]</div>' +
    "<h2>Describe your issue and get the official next step</h2>" +
    '<p class="nyaya-lead">NyayaSetu maps your problem to a verified .gov.in destination. It does not file complaints for you.</p>' +
    '<form class="nyaya-search-row" id="nyaya-search-form">' +
    '<input type="search" id="nyaya-search-input" placeholder="Search refund, pothole, UPI, scholarship..." autocomplete="off">' +
    '<button type="submit" class="nyaya-btn">Search</button>' +
    "</form>" +
    '<div id="nyaya-wizard-status" class="nyaya-status"></div>' +
    '<div id="nyaya-problem-list" class="nyaya-grid"></div>' +
    '<div id="nyaya-question-panel" class="nyaya-hidden"></div>' +
    '<div id="nyaya-result-panel" class="nyaya-hidden"></div>' +
    "</div>";

  var statusEl = document.getElementById("nyaya-wizard-status");
  var listEl = document.getElementById("nyaya-problem-list");
  var questionEl = document.getElementById("nyaya-question-panel");
  var resultEl = document.getElementById("nyaya-result-panel");

  function setStatus(message, isError) {
    statusEl.textContent = message || "";
    statusEl.className = "nyaya-status" + (isError ? " is-error" : "");
  }

  function show(el) {
    el.classList.remove("nyaya-hidden");
  }

  function hide(el) {
    el.classList.add("nyaya-hidden");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderProblems(problems) {
    if (!problems.length) {
      listEl.innerHTML = '<p class="nyaya-empty">No matching categories. Try a broader keyword.</p>';
      return;
    }

    listEl.innerHTML = problems
      .map(function (problem) {
        return (
          '<button type="button" class="nyaya-choice" data-id="' +
          escapeHtml(problem.id) +
          '">' +
          '<span class="nyaya-pill">' +
          escapeHtml(problem.category) +
          "</span>" +
          "<strong>" +
          escapeHtml(problem.title) +
          "</strong>" +
          "<span>" +
          escapeHtml(problem.summary) +
          "</span>" +
          "</button>"
        );
      })
      .join("");
  }

  function loadProblems(query) {
    setStatus("Loading guidance categories...");
    hide(questionEl);
    hide(resultEl);
    show(listEl);

    window.NyayaAPI.getProblems(query)
      .then(function (payload) {
        state.problems = payload.data || [];
        setStatus(state.problems.length + " categor" + (state.problems.length === 1 ? "y" : "ies") + " found.");
        renderProblems(state.problems);
      })
      .catch(function () {
        setStatus("Cannot reach the NyayaSetu server. Start it with npm start in /server (port 5000).", true);
        listEl.innerHTML = "";
      });
  }

  function renderQuestions() {
    var questions = (state.route && state.route.questions) || [];
    var html =
      '<div class="nyaya-route-meta">' +
      "<h3>" +
      escapeHtml(state.selectedProblem.title) +
      "</h3>" +
      "<p>Official destination: <strong>" +
      escapeHtml(state.route.authorityName) +
      "</strong></p>" +
      "</div>";

    questions.forEach(function (question, index) {
      html +=
        '<fieldset class="nyaya-fieldset">' +
        "<legend>Q" +
        (index + 1) +
        ". " +
        escapeHtml(question.prompt) +
        "</legend>";
      question.options.forEach(function (option) {
        var optionId = question.id + "-" + option.value;
        html +=
          '<label class="nyaya-option" for="' +
          escapeHtml(optionId) +
          '">' +
          '<input type="radio" name="' +
          escapeHtml(question.questionKey) +
          '" id="' +
          escapeHtml(optionId) +
          '" value="' +
          escapeHtml(option.value) +
          '">' +
          escapeHtml(option.label) +
          "</label>";
      });
      html += "</fieldset>";
    });

    html +=
      '<div class="nyaya-actions">' +
      '<button type="button" class="nyaya-btn is-ghost" id="nyaya-back-to-list">Back</button>' +
      '<button type="button" class="nyaya-btn" id="nyaya-show-route">Show official route</button>' +
      "</div>";

    questionEl.innerHTML = html;
    hide(listEl);
    show(questionEl);

    document.getElementById("nyaya-back-to-list").addEventListener("click", function () {
      hide(questionEl);
      hide(resultEl);
      show(listEl);
    });

    document.getElementById("nyaya-show-route").addEventListener("click", collectAnswersAndShowRoute);
  }

  function collectAnswersAndShowRoute() {
    var questions = (state.route && state.route.questions) || [];
    state.answers = {};
    var missing = false;

    questions.forEach(function (question) {
      var selected = questionEl.querySelector('input[name="' + question.questionKey + '"]:checked');
      if (!selected) {
        missing = true;
        return;
      }
      state.answers[question.questionKey] = selected.value;
    });

    if (missing) {
      setStatus("Please answer every guided question.", true);
      return;
    }

    renderResult();
  }

  function renderResult() {
    var route = state.route;
    var checklist = (route.checklist || [])
      .map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      })
      .join("");
    var steps = (route.steps || [])
      .map(function (item, index) {
        return "<li><strong>Step " + (index + 1) + ".</strong> " + escapeHtml(item) + "</li>";
      })
      .join("");

    resultEl.innerHTML =
      '<div class="nyaya-result">' +
      "<h3>Recommended official destination</h3>" +
      '<p class="nyaya-badge">Verified guidance — not a government website</p>' +
      "<p><strong>" +
      escapeHtml(route.authorityName) +
      "</strong><br>" +
      escapeHtml(route.department) +
      "</p>" +
      "<p>Portal: <a href=\"" +
      escapeHtml(route.portalUrl) +
      '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(route.portalName) +
      "</a></p>" +
      "<p>Helpline: " +
      escapeHtml(route.helpline) +
      "</p>" +
      "<h4>Documents to keep ready</h4><ul>" +
      checklist +
      "</ul>" +
      "<h4>Action plan</h4><ol>" +
      steps +
      "</ol>" +
      '<div class="nyaya-actions">' +
      '<a class="nyaya-btn" href="#nyaya-draft">Prepare complaint draft</a>' +
      '<a class="nyaya-btn is-ghost" href="pricing.html">Save in tracker</a>' +
      "</div></div>";

    show(resultEl);
    setStatus("Route mapped. Generate a draft below, then file it yourself on the official portal.");

    window.dispatchEvent(
      new CustomEvent("nyaya:route-selected", {
        detail: {
          problem: state.selectedProblem,
          route: state.route,
          answers: state.answers,
        },
      })
    );
  }

  listEl.addEventListener("click", function (event) {
    var button = event.target.closest("[data-id]");
    if (!button) {
      return;
    }

    var problem = state.problems.find(function (item) {
      return item.id === button.getAttribute("data-id");
    });
    if (!problem) {
      return;
    }

    state.selectedProblem = problem;
    setStatus("Loading route logic...");
    window.NyayaAPI.getRoute(problem.routeId)
      .then(function (payload) {
        state.route = payload.data;
        setStatus("Answer a few questions so the action plan matches your situation.");
        renderQuestions();
      })
      .catch(function () {
        setStatus("Could not load route logic for this category.", true);
      });
  });

  document.getElementById("nyaya-search-form").addEventListener("submit", function (event) {
    event.preventDefault();
    loadProblems(document.getElementById("nyaya-search-input").value);
  });

  var params = new URLSearchParams(window.location.search);
  loadProblems(params.get("q") || "");
})();
