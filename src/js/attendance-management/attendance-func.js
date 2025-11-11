//attendance-func.js
import {
  switchView,
  applyDataFilter,
} from "./attendance-grid.js";

// Defer DOM wiring until DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  const rawBtn = document.getElementById("rawTimeLogsTab");
  const summaryBtn = document.getElementById("attendanceSummaryTab");
  const searchInput = document.getElementById("search");
  const cutoffFilter = document.getElementById("cutoffFilter");
  const cutoffContainer = document.getElementById("cutoffPeriodContainer");
  const filterBtn = document.getElementById("filterBtn");
  const dtrBtn = document.getElementById("generateDTRBtn"); // DTR button reference

  function setActiveButton(active, inactive) {
    if (!active || !inactive) return;
    active.classList.add("btn-primary");
    active.classList.remove("btn-outline");
    inactive.classList.remove("btn-primary");
    inactive.classList.add("btn-outline");
  }

  async function showRaw() {
    setActiveButton(rawBtn, summaryBtn);
    cutoffContainer?.classList.add("hidden"); // hide cutoff when Raw is active
    if (dtrBtn) dtrBtn.classList.remove("hidden"); //  show DTR button
    await switchView("raw");
  }

  async function showSummary() {
    setActiveButton(summaryBtn, rawBtn);
    cutoffContainer?.classList.remove("hidden"); // show cutoff when Summary is active
    if (dtrBtn) dtrBtn.classList.add("hidden"); //  hide DTR button
    await switchView("summary");
  }

  if (rawBtn)
    rawBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showRaw();
    });
  if (summaryBtn)
    summaryBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showSummary();
    });

  // Search + cutoff filter wiring
  function applyFilters() {
    const search = (searchInput?.value || "").trim();
    const cutoff = (cutoffFilter?.value || "").trim();
    applyDataFilter(search, cutoff);
  }

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (cutoffFilter) cutoffFilter.addEventListener("change", applyFilters);
  if (filterBtn)
    filterBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (cutoffFilter) cutoffFilter.value = "";
      applyFilters();
    });

  // initialize UI: show raw table by default
  if (rawBtn && summaryBtn) {
    setActiveButton(rawBtn, summaryBtn);
  }

  // Start with Raw view and hide cutoff
  cutoffContainer?.classList.add("hidden");
  if (dtrBtn) dtrBtn.classList.remove("hidden"); //  ensure visible on load

  showRaw().catch((err) =>
    console.error("Failed to initialize attendance view:", err)
  );
});

//  DEBUG LOG
console.log(" attendance-func.js loaded successfully");