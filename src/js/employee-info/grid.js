// grid.js
let gridApi = null;
// Initialize grid when DOM is ready
function initializeGrid() {
  const gridDiv = document.getElementById("employeeInfoGrid");

  if (!gridDiv) {
    console.error("Grid container element not found!");
    return null;
  }
  // Determine user theme preference
  const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  gridDiv.classList.add(
    isDarkMode ? "ag-theme-quartz-dark" : "ag-theme-quartz"
  );
  // Listen for system theme changes
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      gridDiv.classList.toggle("ag-theme-quartz-dark", e.matches);
      gridDiv.classList.toggle("ag-theme-quartz", !e.matches);
    });
  const columnDefs = [
    { field: "Employee ID", minWidth: 100, flex: 1 },
    { field: "Last Name", minWidth: 120, flex: 1 },
    { field: "First Name", minWidth: 120, flex: 1 },
    { field: "Middle Initial", minWidth: 100, flex: 1 },
    { field: "Position", minWidth: 150, flex: 1 },
    { field: "Department", minWidth: 150, flex: 1 },
    {
      field: "Rate",
      minWidth: 120,
      flex: 1,
      valueFormatter: (params) => {
        if (params.value) {
          const rate = parseFloat(params.value);
          return (
            "₱" +
            rate.toLocaleString("en-PH", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          );
        }
        return params.value;
      },
    },
    {
      field: "Status",
      minWidth: 100,
      flex: 1,
      valueFormatter: (params) => {
        // Capitalize the status text
        if (params.value) {
          return (
            params.value.charAt(0).toUpperCase() +
            params.value.slice(1).toLowerCase()
          );
        }
        return params.value;
      },
      cellStyle: (params) => {
        if (params.value && params.value.toLowerCase() === "active") {
          return { color: "green", fontWeight: "bold" };
        } else {
          return { color: "red", fontWeight: "bold" };
        }
      },
    },
    {
      field: "Actions",
      minWidth: 120,
      flex: 1,
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
  // Grid configurations
  const gridOptions = {
    columnDefs,
    rowData: [], // Start with empty array
    domLayout: "normal",
    suppressHorizontalScroll: false,
    rowSelection: {
      mode: "multiRow",
      headerCheckbox: true,
      pinned: "left",
    },
    defaultColDef: {
      filter: true,
      sortable: true,
      resizable: true, // Allow manual column resizing
    },
    pagination: true,
    paginationPageSize: 10,
    paginationPageSizeSelector: [10, 20, 50, 100],
    onSelectionChanged: function () {
      if (window.handleSelectionChange) {
        window.handleSelectionChange();
      }
    },
    onGridReady: function (params) {
      // Optionally auto-size columns on grid ready
      // params.api.sizeColumnsToFit();
    },
  };
  // Create grid
  gridApi = agGrid.createGrid(gridDiv, gridOptions);
  console.log("Grid initialized successfully");
  return gridApi;
}
// Initialize the grid when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeGrid);
} else {
  initializeGrid();
}
// Export function to set grid data
export function setGridData(data) {
  if (!gridApi) {
    console.error("Grid not initialized yet!");
    return;
  }
  console.log("Setting grid data:", data);
  gridApi.setGridOption("rowData", data);
}
// Export function to get selected rows
export function getSelectedRows() {
  if (!gridApi) {
    console.error("Grid not initialized yet!");
    return [];
  }
  return gridApi.getSelectedRows();
}
// Export function to deselect all
export function deselectAll() {
  if (!gridApi) {
    console.error("Grid not initialized yet!");
    return;
  }
  gridApi.deselectAll();
}
