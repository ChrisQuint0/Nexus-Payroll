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
      width: 150
    },
    { field: "Name", width: 200 },
    { field: "Position", width: 180 },
    { field: "Department", width: 180 },
    { 
      field: "Leave Duration",
      width: 150,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 1,
        max: 365,
        precision: 0
      },
      valueFormatter: (params) => {
        if (params.value) {
          return `${params.value} day(s)`;
        }
        return params.value;
      },
      valueSetter: (params) => {
        const newValue = parseInt(params.newValue);
        if (!isNaN(newValue) && newValue > 0) {
          params.data["Leave Duration"] = newValue;
          return true;
        }
        return false;
      }
    },
    { 
      field: "Type", 
      width: 150,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['Vacation Leave', 'Sick Leave', 'Emergency Leave', 'Personal Leave', 'Maternity Leave']
      }
    },
    { 
      field: "Status",
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['Paid', 'Unpaid']
      },
      cellStyle: (params) => {
        const isPaid = params.value === "Paid";
        return {
          color: isPaid ? "#10b981" : "#f59e0b",
          fontWeight: "600"
        };
      }
    },
    { 
      field: "Leave Balance",
      width: 150,
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
    rowData: [],
    domLayout: "normal",
    autoSizeStrategy: {
      type: "fitGridWidth",
    },
    rowSelection: {
      mode: "multiRow",
      checkboxes: true,
      headerCheckbox: true,
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
      if (window.handleSelectionChange) {
        window.handleSelectionChange();
      }
    },
    onCellValueChanged: function(event) {
      if (window.handleCellEdit) {
        window.handleCellEdit(event);
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
