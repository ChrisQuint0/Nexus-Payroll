import { rowData } from "./reports-data.js";

const filterParams = {
  comparator: (filterLocalDateAtMidnight, cellValue) => {
    const dateAsString = cellValue;
    if (dateAsString == null) return -1;
    const dateParts = dateAsString.split("/");
    const cellDate = new Date(
      Number(dateParts[2]),
      Number(dateParts[1]) - 1,
      Number(dateParts[0])
    );

    if (filterLocalDateAtMidnight.getTime() === cellDate.getTime()) {
      return 0;
    }

    if (cellDate < filterLocalDateAtMidnight) {
      return -1;
    }

    if (cellDate > filterLocalDateAtMidnight) {
      return 1;
    }
    return 0;
  },
};

const gridOptions = {
  rowData,
  defaultColDef: {
    editable: true,
    minWidth: 100,
    flex: 1,
  },
  suppressExcelExport: true,
  popupParent: document.body,
  columnDefs: [
    { field: "Name", filter: true },
    {
      field: "Action",
      filter: true,
      cellStyle: (params) => {
        const action = params.value;
        if (action === "Edit") {
          return { color: "#fbbd23" }; // DaisyUI warning
        }
        if (action === "Create") {
          return { color: "#36d399" }; // DaisyUI success
        }
        if (action === "Delete") {
          return { color: "#f87272" }; // DaisyUI error
        }
        if (action === "View") {
          return { color: "#3abff8" }; // DaisyUI info
        }
        return null; // Default styling
      },
    },
    { field: "Description", filter: true },
    { field: "Module_Affected", filter: true },
    { field: "RecordID", filter: true },
    { field: "IP", filter: true },
    { field: "UserAgent", filter: true },
    { field: "Time", filter: true },
  ],
};

// Wait for DOM to be fully loaded
const gridDiv = document.getElementById("myGrid");
const gridApi = agGrid.createGrid(gridDiv, gridOptions);

// Determine user theme preference, adjust theme of the AG Grid to the user preference
const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
gridDiv.classList.add(isDarkMode ? "ag-theme-quartz-dark" : "ag-theme-quartz");

// Add global search functionality
const searchInput = document.getElementById("searchInput");
searchInput.addEventListener("input", (e) => {
  const searchValue = e.target.value;
  gridApi.setGridOption("quickFilterText", searchValue);
});

// Listen for system theme changes in real time
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    gridDiv.classList.toggle("ag-theme-quartz-dark", e.matches);
    gridDiv.classList.toggle("ag-theme-quartz", !e.matches);
  });

// Add filter functionality
const filterBtn = document.getElementById("filterBtn");
filterBtn.addEventListener("change", (e) => {
  const filterValue = e.target.value;

  if (filterValue === "") {
    // Clear the filter if no option is selected
    gridApi.setColumnFilterModel("Action", null);
  } else {
    // Apply the filter to the Action column
    gridApi.setColumnFilterModel("Action", {
      type: "equals",
      filter: filterValue,
    });
  }

  // Apply the filter changes
  gridApi.onFilterChanged();
});
