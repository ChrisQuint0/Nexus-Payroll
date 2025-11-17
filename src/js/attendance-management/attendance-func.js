//attendance-func.js
import {
  switchView,
  applyDataFilter,
} from "./attendance-grid.js";

// Defer DOM wiring until DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  const rawBtn = document.getElementById("rawTimeLogsTab");
  const summaryBtn = document.getElementById("attendanceSummaryTab");
  const addTimeLogsBtn = document.getElementById("addTimeLogsTab");
  const searchInput = document.getElementById("search");
  const cutoffFilter = document.getElementById("cutoffFilter");
  const cutoffContainer = document.getElementById("cutoffPeriodContainer");
  const filterBtn = document.getElementById("filterBtn");
  const dtrBtn = document.getElementById("generateDTRBtn"); // DTR button reference

  function setActiveButton(activeBtn) {
    const allButtons = [rawBtn, summaryBtn, addTimeLogsBtn];
    
    allButtons.forEach(btn => {
      if (!btn) return;
      
      if (btn === activeBtn) {
        btn.classList.add("btn-primary");
        btn.classList.remove("btn-outline");
      } else {
        btn.classList.remove("btn-primary");
        btn.classList.add("btn-outline");
      }
    });
  }

  async function showRaw() {
    setActiveButton(rawBtn);
    cutoffContainer?.classList.add("hidden"); // hide cutoff when Raw is active
    if (dtrBtn) dtrBtn.classList.remove("hidden"); //  show DTR button
    await switchView("raw");
  }

  async function showSummary() {
    setActiveButton(summaryBtn);
    cutoffContainer?.classList.remove("hidden"); // show cutoff when Summary is active
    if (dtrBtn) dtrBtn.classList.add("hidden"); //  hide DTR button
    await switchView("summary");
  }

  async function showAddTimeLogs() {
    setActiveButton(addTimeLogsBtn);
    cutoffContainer?.classList.add("hidden"); // hide cutoff in Add Time Logs view
    if (dtrBtn) dtrBtn.classList.add("hidden"); // hide DTR button
    await switchView("addTimeLogs");
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
  if (addTimeLogsBtn)
    addTimeLogsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showAddTimeLogs();
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
  if (rawBtn) {
    setActiveButton(rawBtn);
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