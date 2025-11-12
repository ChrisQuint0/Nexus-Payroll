// grid.js
let gridApi = null;

export function initializeGrid() {
  const gridDiv = document.getElementById("leaveManagementGrid");
  
  if (!gridDiv) {
    console.error("Grid container element not found!");
    return null;
  }

  const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  gridDiv.classList.add(isDarkMode ? "ag-theme-quartz-dark" : "ag-theme-quartz");

  window.matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      gridDiv.classList.toggle("ag-theme-quartz-dark", e.matches);
      gridDiv.classList.toggle("ag-theme-quartz", !e.matches);
    });

  const columnDefs = [
    { 
      field: "Employee ID",
      width: 120
    },
    { field: "Last Name", width: 150 },
    { field: "First Name", width: 150 },
    { field: "Middle Initial", width: 120 },
    { field: "Position", width: 180 },
    { field: "Department", width: 180 },
    {
      field: "Actions",
      width: 150,
      cellRenderer: (params) => {
        return `
          <button
            class="btn btn-primary btn-sm add-leave-btn"
            data-employee="${params.data["Employee ID"]}"
            data-employee-name="${params.data["First Name"]} ${params.data["Middle Initial"] ? params.data["Middle Initial"] + ' ' : ''}${params.data["Last Name"]}"
          >
            Add Leave
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
    rowData: [],
    domLayout: "normal",
    autoSizeStrategy: {
      type: "fitGridWidth",
    },
    rowSelection: {
      mode: "singleRow",
    },
    defaultColDef: {
      filter: true,
      sortable: true,
      resizable: true,
    },
    pagination: true,
    paginationPageSize: 10,
    paginationPageSizeSelector: [10, 20, 50, 100],
    animateRows: true,
    onSelectionChanged: function() {
      const selectedRows = gridApi.getSelectedRows();
      const viewHistoryBtn = document.getElementById('viewHistoryBtn');
      
      if (viewHistoryBtn) {
        viewHistoryBtn.disabled = selectedRows.length === 0;
      }
      
      if (window.handleSelectionChange) {
        window.handleSelectionChange();
      }
    },
  };

  gridApi = agGrid.createGrid(gridDiv, gridOptions);
  return gridApi;
}

export function setGridData(data) {
  if (!gridApi) {
    console.error("Grid not initialized yet!");
    return;
  }
  gridApi.setGridOption('rowData', data);
}

export function getSelectedRows() {
  if (!gridApi) {
    console.error("Grid not initialized yet!");
    return [];
  }
  return gridApi.getSelectedRows();
}

export function deselectAll() {
  if (!gridApi) {
    console.error("Grid not initialized yet!");
    return;
  }
  gridApi.deselectAll();
}
