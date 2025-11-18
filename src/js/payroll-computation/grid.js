import { fetchPayrollData } from "./payroll-data.js";
import { populateCutoffDropdown, setupCutoffFilter } from "./cutoff-handler.js";
import { initializeCSVGenerator } from "./csv-generator.js";

const gridDiv = document.getElementById("payrollComputationGrid");

// Determine user theme preference
const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
gridDiv.classList.add(isDarkMode ? "ag-theme-quartz-dark" : "ag-theme-quartz");

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    gridDiv.classList.toggle("ag-theme-quartz-dark", e.matches);
    gridDiv.classList.toggle("ag-theme-quartz", !e.matches);
  });

// Column Definition of the Grid
const columnDefs = [
  { field: "Employee ID", width: 120 },
  { field: "Name", width: 200 },
  {
    field: "Net",
    width: 120,
    valueFormatter: (params) =>
      params.value ? `₱${parseFloat(params.value).toLocaleString()}` : "",
  },
  {
    field: "Gross",
    width: 120,
    valueFormatter: (params) =>
      params.value ? `₱${parseFloat(params.value).toLocaleString()}` : "",
  },
  {
    field: "Total Deductions",
    width: 150,
    valueFormatter: (params) =>
      params.value ? `₱${parseFloat(params.value).toLocaleString()}` : "",
  },
  { field: "Cutoff Period", width: 180 },
  { field: "Department", width: 150 },
  {
    field: "Cutoff ID",
    hide: true,
    filter: "agNumberColumnFilter",
  },
  {
    field: "Actions",
    width: 120,
    cellRenderer: (params) => {
      return `
        <button
          class="btn btn-primary btn-sm view-more-btn"
          data-employee="${params.data["Employee ID"]}"
        >
          View More
        </button>`;
    },
    cellStyle: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
  },
];

// Configurations
const gridOptions = {
  columnDefs,
  rowData: [],
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
  onGridReady: async (params) => {
    params.api.showLoadingOverlay();

    const data = await fetchPayrollData();
    params.api.setGridOption("rowData", data);
    params.api.hideOverlay();

    await populateCutoffDropdown();
    setupCutoffFilter();

    // Initialize CSV generator
    await initializeCSVGenerator();
  },
};

// Create grid
export const gridApi = agGrid.createGrid(
  document.getElementById("payrollComputationGrid"),
  gridOptions
);
