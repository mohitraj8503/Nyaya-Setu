(function () {
  "use strict";

  var root = document.getElementById("nyaya-tracker");

  if (!root || !window.NyayaAPI) {
    return;
  }

  var STATUS_OPTIONS = [
    { value: "drafted", label: "Drafted" },
    { value: "filed", label: "Submitted" },
    { value: "follow-up", label: "Follow-up Required" },
    { value: "closed", label: "Closed" }
  ];

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getStatusLabel(status) {
    var found = STATUS_OPTIONS.find(function (item) {
      return item.value === status;
    });

    return found ? found.label : status || "Unknown";
  }

  function normalizeStatus(status) {
    if (status === "in-progress") {
      return "filed";
    }

    if (status === "resolved") {
      return "closed";
    }

    return status || "drafted";
  }

  root.innerHTML = `
    <div class="tracker-card">
      <div class="tracker-header">
        <h2>Complaint Tracker</h2>
        <p>Keep track of your grievance progress in one place.</p>
      </div>

      <form id="tracker-form" class="tracker-form">
        <div class="form-row">
          <label>
            Complaint / Issue
            <input
              type="text"
              id="tracker-title"
              name="title"
              placeholder="Example: Electricity complaint"
              required
            />
          </label>

          <label>
            Reference Number
            <input
              type="text"
              id="tracker-reference"
              name="reference"
              placeholder="Optional reference number"
            />
          </label>
        </div>

        <div class="form-row">
          <label>
            Status
            <select id="tracker-status" name="status">
              ${STATUS_OPTIONS.map(function (item) {
                return `
                  <option value="${item.value}">
                    ${item.label}
                  </option>
                `;
              }).join("")}
            </select>
          </label>

          <label>
            Notes
            <input
              type="text"
              id="tracker-notes"
              name="notes"
              placeholder="Optional notes"
            />
          </label>
        </div>

        <button type="submit" class="primary-btn">
          Add to Tracker
        </button>

        <p id="tracker-message" class="tracker-message" aria-live="polite"></p>
      </form>

      <div class="tracker-list-section">
        <h3>Your Complaints</h3>
        <div id="tracker-list">
          <p>Loading tracker...</p>
        </div>
      </div>
    </div>
  `;

  var form = document.getElementById("tracker-form");
  var list = document.getElementById("tracker-list");
  var message = document.getElementById("tracker-message");

  function showMessage(text, isError) {
    message.textContent = text;
    message.style.color = isError ? "#b91c1c" : "";
  }

  function renderItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      list.innerHTML = `
        <div class="tracker-empty">
          <p>No complaints added yet.</p>
          <p>Add a complaint above to start tracking it.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = items
      .map(function (item) {
        var status = normalizeStatus(item.status);

        return `
          <article class="tracker-item">
            <div class="tracker-item-content">

              <div class="tracker-item-top">
                <h4>
                  ${escapeHtml(
                    item.title ||
                    item.issue ||
                    item.problem ||
                    "Untitled Complaint"
                  )}
                </h4>

                <span class="tracker-status">
                  ${escapeHtml(getStatusLabel(status))}
                </span>
              </div>

              ${
                item.reference
                  ? `
                    <p>
                      <strong>Reference:</strong>
                      ${escapeHtml(item.reference)}
                    </p>
                  `
                  : ""
              }

              ${
                item.notes
                  ? `
                    <p>
                      <strong>Notes:</strong>
                      ${escapeHtml(item.notes)}
                    </p>
                  `
                  : ""
              }

              ${
                item.created_at || item.createdAt
                  ? `
                    <p>
                      <strong>Added:</strong>
                      ${escapeHtml(
                        item.created_at || item.createdAt
                      )}
                    </p>
                  `
                  : ""
              }

            </div>

            <div class="tracker-item-actions">
              <label>
                Update status
                <select
                  class="tracker-status-select"
                  data-id="${escapeHtml(item.id)}"
                >
                  ${STATUS_OPTIONS.map(function (option) {
                    return `
                      <option
                        value="${option.value}"
                        ${
                          option.value === status
                            ? "selected"
                            : ""
                        }
                      >
                        ${option.label}
                      </option>
                    `;
                  }).join("")}
                </select>
              </label>

              <button
                type="button"
                class="tracker-delete"
                data-id="${escapeHtml(item.id)}"
              >
                Delete
              </button>
            </div>
          </article>
        `;
      })
      .join("");

    attachItemHandlers();
  }

  async function loadTracker() {
    try {
      var response = await window.NyayaAPI.getTracker();

      var items = Array.isArray(response)
        ? response
        : response && Array.isArray(response.items)
        ? response.items
        : [];

      renderItems(items);
    } catch (error) {
      console.error("Tracker loading failed:", error);

      list.innerHTML = `
        <div class="tracker-error">
          <p>Unable to load tracker data.</p>
          <p>Please refresh the page and try again.</p>
        </div>
      `;
    }
  }

  async function addTrackerItem(event) {
    event.preventDefault();

    var title = document.getElementById("tracker-title").value.trim();
    var reference = document
      .getElementById("tracker-reference")
      .value.trim();

    var status = document.getElementById("tracker-status").value;

    var notes = document
      .getElementById("tracker-notes")
      .value.trim();

    if (!title) {
      showMessage("Please enter a complaint or issue.", true);
      return;
    }

    try {
      showMessage("Adding complaint...", false);

      await window.NyayaAPI.saveTrackerItem({
        title: title,
        reference: reference,
        status: status,
        notes: notes
      });

      form.reset();

      document.getElementById("tracker-status").value = "drafted";

      showMessage("Complaint added to your tracker.", false);

      await loadTracker();
    } catch (error) {
      console.error("Unable to save tracker item:", error);

      showMessage(
        "Unable to save the complaint. Please try again.",
        true
      );
    }
  }

  function attachItemHandlers() {
    var statusSelects = list.querySelectorAll(
      ".tracker-status-select"
    );

    statusSelects.forEach(function (select) {
      select.addEventListener("change", async function () {
        var id = select.getAttribute("data-id");
        var nextStatus = select.value;

        try {
          select.disabled = true;

          await window.NyayaAPI.updateTrackerItem(id, {
            status: nextStatus
          });

          await loadTracker();
        } catch (error) {
          console.error(
            "Unable to update tracker status:",
            error
          );

          alert(
            "Unable to update the complaint status. Please try again."
          );

          await loadTracker();
        }
      });
    });

    var deleteButtons = list.querySelectorAll(
      ".tracker-delete"
    );

    deleteButtons.forEach(function (button) {
      button.addEventListener("click", async function () {
        var id = button.getAttribute("data-id");

        if (!id) {
          return;
        }

        var confirmed = window.confirm(
          "Are you sure you want to remove this complaint from your tracker?"
        );

        if (!confirmed) {
          return;
        }

        try {
          button.disabled = true;

          if (
            typeof window.NyayaAPI.deleteTrackerItem ===
            "function"
          ) {
            await window.NyayaAPI.deleteTrackerItem(id);
          } else {
            await window.NyayaAPI.updateTrackerItem(id, {
              status: "closed"
            });
          }

          await loadTracker();
        } catch (error) {
          console.error(
            "Unable to remove tracker item:",
            error
          );

          alert(
            "Unable to remove the complaint. Please try again."
          );

          button.disabled = false;
        }
      });
    });
  }

  form.addEventListener("submit", addTrackerItem);

  loadTracker();
})();