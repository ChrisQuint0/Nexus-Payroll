import { rowData } from "./reports-data.js";

const gridOptions = {
  rowData,
  columnDefs: [
    { field: "Name" },
    { field: "Action" },
    { field: "Description" },
    { field: "Module_Affected" },
    { field: "RecordID" },
    { field: "IP" },
    { field: "UserAgent" },
    { field: "Time" },
  ],
};

// Wait for DOM to be fully loaded
const gridDiv = document.getElementById("myGrid");
const gridApi = agGrid.createGrid(gridDiv, gridOptions);

// Determine user theme preference, adjust theme of the AG Grid to the user preference
const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
gridDiv.classList.add(isDarkMode ? "ag-theme-quartz-dark" : "ag-theme-quartz");

// Listen for system theme changes in real time
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    gridDiv.classList.toggle("ag-theme-quartz-dark", e.matches);
    gridDiv.classList.toggle("ag-theme-quartz", !e.matches);
  });
