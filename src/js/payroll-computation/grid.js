import { rowData } from "./payroll-data.js";

const gridDiv = document.getElementById("payrollComputationGrid");

//Determine user theme preference, adjust theme of the AG Grid to the user preference

// Detect system dark mode
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

//Column Definition of the Grid
const columnDefs = [
  { field: "Employee ID" },
  { field: "Name" },
  { field: "Gross" },
  { field: "Total Deductions" },
  { field: "Cutoff Period" },
  { field: "Department" },
  {
    field: "Actions",
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

//Configurations
const gridOptions = {
  columnDefs,
  rowData,
  domLayout: "normal", // allows flexible resizing
  autoSizeStrategy: {
    type: "fitGridWidth",
  },
  rowSelection: {
    mode: "multiRow", // allows multiple rows to be selected
    headerCheckbox: true, // enables header checkbox functionality
    pinned: "left",
  },
  defaultColDef: {
    filter: true, // enables filter icon and filter input
    sortable: true, // optional: enables sorting too
  },
};

// Create grid
export const gridApi = agGrid.createGrid(
  document.getElementById("payrollComputationGrid"),
  gridOptions
);

//Functionalities
