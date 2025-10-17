// attendance-grid.js
import { rawTimeLogsData, attendanceSummaryData } from "./attendance-data.js";

const gridDiv = document.getElementById("attendanceGrid");

// Determine user theme preference, adjust theme of the AG Grid to the user preference
const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

// Apply the correct AG Grid theme
gridDiv.classList.add(isDarkMode ? "ag-theme-quartz-dark" : "ag-theme-quartz");

// Listen for system theme changes in real time
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    gridDiv.classList.toggle("ag-theme-quartz-dark", e.matches);
    gridDiv.classList.toggle("ag-theme-quartz", !e.matches);
  });

// Column definitions for Raw Time Logs
const rawTimeLogsColumns = [
  { field: "Date", sortable: true, filter: true },
  { field: "Employee ID", sortable: true, filter: true },
  { field: "Name", sortable: true, filter: true },
  { field: "Time In", sortable: true, filter: true },
  { field: "Time Out", sortable: true, filter: true },
  { field: "Late (m)", sortable: true, filter: true },
  { field: "Undertime", sortable: true, filter: true },
  {
    field: "Status",
    sortable: true,
    filter: true,
    cellStyle: (params) => {
      if (params.value === "Present") return { color: "#10b981" };
      if (params.value === "Absent") return { color: "#ef4444" };
      if (params.value === "Undertime") return { color: "#f59e0b" };
      if (params.value === "Leave with Pay") return { color: "#3b82f6" };
      if (params.value === "Leave w/o Pay") return { color: "#6366f1" };
      if (params.value === "Official Business") return { color: "#8b5cf6" };
      return null;
    },
  },
  {
    field: "Cutoff Period",
    sortable: true,
    filter: true,
    hide: true, // Hidden but available for filtering
  },
];

// Column definitions for Attendance Summary
const attendanceSummaryColumns = [
  { field: "Employee ID", sortable: true, filter: true },
  { field: "Name", sortable: true, filter: true },
  { field: "Regular Hours", sortable: true, filter: true },
  { field: "Overtime", sortable: true, filter: true },
  { field: "Late", sortable: true, filter: true },
  { field: "Undertime", sortable: true, filter: true },
  { field: "Leave w/ Pay", sortable: true, filter: true },
  { field: "Leave w/o Pay", sortable: true, filter: true },
  { field: "Incomplete (Days)", sortable: true, filter: true },
  { field: "Absences", sortable: true, filter: true },
  {
    field: "Cutoff Period",
    sortable: true,
    filter: true,
    hide: true, // Hidden but available for filtering
  },
];

// Store current data and view state
let currentData = [];
let currentView = "raw";

// Grid options - start with Raw Time Logs view
const gridOptions = {
  columnDefs: rawTimeLogsColumns,
  rowData: rawTimeLogsData,
  domLayout: "normal",
  autoSizeStrategy: {
    type: "fitGridWidth",
  },
  rowSelection: {
    mode: "multiRow",
    headerCheckbox: true,
    pinned: "left",
  },
  defaultColDef: {
    filter: true,
    sortable: true,
  },
};

// Create grid and export gridApi
export const gridApi = agGrid.createGrid(
  document.getElementById("attendanceGrid"),
  gridOptions
);

// Function to switch between views
export function switchView(view) {
  currentView = view;

  if (view === "raw") {
    gridApi.setGridOption("columnDefs", rawTimeLogsColumns);
    currentData = rawTimeLogsData;
    gridApi.setGridOption("rowData", currentData);
  } else if (view === "summary") {
    gridApi.setGridOption("columnDefs", attendanceSummaryColumns);
    currentData = attendanceSummaryData;
    gridApi.setGridOption("rowData", currentData);
  }

  // Clear any existing filters
  gridApi.setFilterModel(null);
  gridApi.setGridOption("quickFilterText", "");
}

// Function to apply data filters
export function applyDataFilter(searchValue, cutoffValue) {
  let filteredData = [];

  if (currentView === "raw") {
    filteredData = rawTimeLogsData.filter((item) => {
      const matchesSearch =
        !searchValue ||
        item["Employee ID"].toString().toLowerCase().includes(searchValue) ||
        item["Name"].toLowerCase().includes(searchValue);

      const matchesCutoff =
        !cutoffValue || item["Cutoff Period"] === cutoffValue;

      return matchesSearch && matchesCutoff;
    });
  } else {
    filteredData = attendanceSummaryData.filter((item) => {
      const matchesSearch =
        !searchValue ||
        item["Employee ID"].toString().toLowerCase().includes(searchValue) ||
        item["Name"].toLowerCase().includes(searchValue);

      const matchesCutoff =
        !cutoffValue || item["Cutoff Period"] === cutoffValue;

      return matchesSearch && matchesCutoff;
    });
  }

  currentData = filteredData;
  gridApi.setGridOption("rowData", filteredData);
}

// Function to get current filtered data
export function getCurrentData() {
  return currentData;
}

// Function to get current view
export function getCurrentView() {
  return currentView;
}

// Initialize with raw view data
currentData = rawTimeLogsData;
