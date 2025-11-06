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
  gridDiv.classList.add(isDarkMode ? "ag-theme-quartz-dark" : "ag-theme-quartz");

  // Listen for system theme changes
  window.matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      gridDiv.classList.toggle("ag-theme-quartz-dark", e.matches);
      gridDiv.classList.toggle("ag-theme-quartz", !e.matches);
    });

  const columnDefs = [
    { field: "Employee ID" },
    { field: "Last Name" },
    { field: "First Name" },
    { field: "Middle Initial" },
    { field: "Position" },
    { field: "Department" },
      { field: "Rate" },
    { 
      field: "Status",
      valueFormatter: (params) => {
        // Capitalize the status text
        if (params.value) {
          return params.value.charAt(0).toUpperCase() + params.value.slice(1).toLowerCase();
        }
        return params.value;
      },
      cellStyle: (params) => {
        if (params.value && params.value.toLowerCase() === 'active') {
          return { color: 'green', fontWeight: 'bold' };
        } else {
          return { color: 'red', fontWeight: 'bold' };
        }
      }
    },
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

  // Grid configurations
  const gridOptions = {
    columnDefs,
    rowData: [], // Start with empty array
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
    pagination: true,
    paginationPageSize: 10,
    paginationPageSizeSelector: [10, 20, 50, 100],
    onSelectionChanged: function() {
      if (window.handleSelectionChange) {
        window.handleSelectionChange();
      }
    },
  };

  // Create grid
  gridApi = agGrid.createGrid(gridDiv, gridOptions);
  console.log("Grid initialized successfully");
  return gridApi;
}

// Initialize the grid when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGrid);
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
  gridApi.setGridOption('rowData', data);
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