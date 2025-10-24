import { getEmployeeAttendanceTable } from "./raw-time-logs-data-retrieval.js";
import { getPayrollSummaryReport } from "./attendance-summary-data-retrieval.js";

const gridDiv = document.getElementById("attendanceGrid");

// Theme detection 
const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
gridDiv.classList.add(isDarkMode ? "ag-theme-quartz-dark" : "ag-theme-quartz");

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  gridDiv.classList.toggle("ag-theme-quartz-dark", e.matches);
  gridDiv.classList.toggle("ag-theme-quartz", !e.matches);
});

// Status to Color Mapping
const statusColorMap = {
  present: "status-present",
  Present: "status-present",
  absent: "status-absent",
  Absent: "status-absent",
  undertime: "status-undertime",
  Undertime: "status-undertime",
  late: "status-late",
  Late: "status-late",
  "leave with pay": "status-leave-pay",
  "Leave with Pay": "status-leave-pay",
  "leave w/o pay": "status-leave-no-pay",
  "Leave w/o Pay": "status-leave-no-pay",
  "official business": "status-official",
  "Official Business": "status-official",
};

// custom status cell editor
class CustomStatusEditor {
  constructor() {
    this.eSelect = null;
    this.value = null;
  }

  init(params) {
    this.params = params;
    this.value = params.value || "Present";
    
    // Create container
    const container = document.createElement('div');
    container.className = 'w-full h-full flex items-center';
    
    this.eSelect = document.createElement('select');
    this.eSelect.className = 'select select-accent w-full';
    
    // Add status options
    const statuses = [
      "Present",
      "Absent", 
      "Undertime",
      "Late",
      "Official Business",
      "Leave with Pay",
      "Leave w/o Pay"
    ];
    
    statuses.forEach(status => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status;
      if (status === this.value) {
        option.selected = true;
      }
      this.eSelect.appendChild(option);
    });
    
    // Listen for changes
    this.eSelect.addEventListener('change', (e) => {
      this.value = e.target.value;
      params.stopEditing();
    });
    

    // Add keydown handler for Enter and Escape
    this.eSelect.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.value = this.eSelect.value;
        params.stopEditing();
      } else if (e.key === 'Escape') {
        params.stopEditing(true); 
      }
    });
    
    container.appendChild(this.eSelect);
    this.eGui = container;
  }
  
  getGui() {
    return this.eGui;
  }
  
  getValue() {
    return this.value;
  }
  
  afterGuiAttached() {
    if (this.eSelect) {
      this.eSelect.focus();
    }
  }
  
  isPopup() {
    return false;
  }
}

//column definitions

// Raw Time Logs Columns
const rawTimeLogsColumns = [
  { field: "Date", sortable: true, filter: true },
  { field: "Employee ID", sortable: true, filter: true },
  { field: "Last Name", sortable: true, filter: true },
  { field: "First Name", sortable: true, filter: true },
  { field: "Middle Name", sortable: true, filter: true },
  { field: "Official Time", sortable: true, filter: true },

  { 
    field: "Time In", 
    sortable: true, 
    filter: true,
    editable: true,
    cellEditor: "agTextCellEditor",
    singleClickEdit: true,
    valueFormatter: (params) => {
      const val = params.value || "";
      return val.includes("T") ? val.replace("T", " ") : val;
    },
  },

  { 
    field: "Time Out", 
    sortable: true, 
    filter: true,
    editable: true,
    cellEditor: "agTextCellEditor",
    singleClickEdit: true,
    valueFormatter: (params) => {
      const val = params.value || "";
      return val.includes("T") ? val.replace("T", " ") : val;
    },
  },

  { 
    field: "Late (m)", 
    sortable: true, 
    filter: true,
    editable: true,
    cellEditor: "agNumberCellEditor",
    cellEditorParams: { min: 0, precision: 0 },
    singleClickEdit: true
  },
  { 
    field: "Undertime", 
    sortable: true, 
    filter: true,
    editable: true,
    cellEditor: "agNumberCellEditor",
    cellEditorParams: { min: 0, precision: 0 },
    singleClickEdit: true
  },
  {
    field: "Status",
    sortable: true,
    filter: true,
    editable: true,
    cellEditor: CustomStatusEditor,
    singleClickEdit: true,
    cellStyle: { cursor: 'pointer' },
    cellRenderer: (params) => {
      const value = params.value || "N/A";
      const colorClass = statusColorMap[value] || "text-gray-400";
      const capitalizedValue = value
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
      return `
        <div class="flex items-center justify-between w-full h-full px-2">
          <span class="${colorClass}">${capitalizedValue}</span>
          <svg class="h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </div>
      `;
    },
  },
  { field: "Cutoff Period", sortable: true, filter: true, hide: true },
];


// Attendance Summary Columns - ALL FIELDS 
const summaryColumns = [
  { headerName: "Cutoff ID", field: "Cutoff ID", sortable: true, filter: true, resizable: true, width: 110 },
  { headerName: "Employee ID", field: "Employee ID", sortable: true, filter: true, resizable: true, width: 120 },
  { headerName: "First Name", field: "First Name", sortable: true, filter: true, resizable: true },
  { headerName: "Middle Name", field: "Middle Name", sortable: true, filter: true, resizable: true },
  { headerName: "Last Name", field: "Last Name", sortable: true, filter: true, resizable: true },
  { headerName: "Regular Hours", field: "Regular Hours", sortable: true, filter: true, resizable: true },
  { headerName: "Overtime Hours", field: "Overtime Hours", sortable: true, filter: true, resizable: true },
  { headerName: "Late Minutes", field: "Late Minutes", sortable: true, filter: true, resizable: true },
  { headerName: "Undertime Minutes", field: "Undertime Minutes", sortable: true, filter: true, resizable: true },
  { headerName: "Leave W/ Pay", field: "Leave W/ Pay", sortable: true, filter: true, resizable: true },
  { headerName: "Leave W/O Pay", field: "Leave W/O Pay", sortable: true, filter: true, resizable: true },
  { headerName: "Absences", field: "Absences", sortable: true, filter: true, resizable: true },
  { headerName: "Cutoff Period", field: "Cutoff Period", sortable: true, filter: true, resizable: true, width: 220, pinned: null, hide: false },
];

// grid initialization

let currentData = [];
let currentView = "raw"; 
let currentCutoffInfo = null; 

const gridOptions = {
  columnDefs: rawTimeLogsColumns,
  rowData: [],
  domLayout: "normal",
  rowSelection: { mode: "multiRow", headerCheckbox: true, pinned: "left" },
  defaultColDef: {
    filter: true,
    sortable: true,
    resizable: true,
    cellClass: "text-sm",
  },
  suppressFieldDotNotation: true,
  enableCellTextSelection: true,
  overlayNoRowsTemplate: "<span style='padding:10px;'></span>",
  onCellValueChanged: (event) => {
    console.log(" Cell value changed:", {
      field: event.colDef.field,
      oldValue: event.oldValue,
      newValue: event.newValue,
      rowData: event.data
    });
    
    // Save the edited row data
    saveEditedRow(event.data, event.colDef.field);
  }
};

export const gridApi = agGrid.createGrid(gridDiv, gridOptions);
window.gridApi = gridApi; //  Make available for CSV export



// Loaders

async function loadRawTimeLogs() {
  try {
    const data = await getEmployeeAttendanceTable();
    console.log(" Raw time logs loaded:", data.length);
    return data;
  } catch (error) {
    console.error("❌ Failed to load raw time logs:", error);
    return [];
  }
}

async function loadAttendanceSummary() {
  try {
    // Load data from multiple cutoff periods and combine them
    const cutoffIds = [1, 2]; // Add more cutoff IDs as needed
    let allData = [];
    
    for (const cutoffId of cutoffIds) {
      try {
        const { data } = await getPayrollSummaryReport(cutoffId);
        allData = allData.concat(data);
        console.log(` Loaded cutoff ${cutoffId}:`, data.length, "rows");
      } catch (err) {
        console.warn(` Could not load cutoff ${cutoffId}:`, err);
      }
    }
    
    console.log(" Total attendance summary loaded:", allData.length, "rows");
    if (allData.length > 0) {
      console.log(" First row:", allData[0]);
      console.log(" Last row:", allData[allData.length - 1]);
      console.log(" All keys in first row:", Object.keys(allData[0]));
    }
    
    return allData;
  } catch (error) {
    console.error(" Failed to load attendance summary:", error);
    return [];
  }
}


// Initial Load

async function initializeGrid() {
  const rawData = await loadRawTimeLogs();
  currentData = rawData;
  gridApi.setGridOption("rowData", rawData);
  console.log(" Raw Time Logs Table Displayed");
}

initializeGrid();

// View Switching

export async function switchView(view) {
  currentView = view;
  const generateButtonsDiv = document.getElementById("generateButtonsDiv");
  const cutoffContainer = document.getElementById("cutoffPeriodContainer");

  if (view === "raw") {
    // Hide cutoff filter in raw view
    if (cutoffContainer) cutoffContainer.classList.add("hidden");
    if (generateButtonsDiv) generateButtonsDiv.classList.remove("hidden");

    const data = await loadRawTimeLogs();
    currentData = data;
    gridApi.setGridOption("columnDefs", rawTimeLogsColumns);
    gridApi.setGridOption("rowData", data);
    console.log(" Switched to Raw Time Logs");
  } else if (view === "summary") {
    // Show cutoff filter in summary view
    if (cutoffContainer) cutoffContainer.classList.remove("hidden");
    if (generateButtonsDiv) generateButtonsDiv.classList.add("hidden");

    const data = await loadAttendanceSummary();
    currentData = data;
    
    // Populate dropdown with cutoff periods from data
    populateCutoffDropdown(data);
    
    gridApi.setGridOption("columnDefs", summaryColumns);
    gridApi.setGridOption("rowData", data);
    console.log(" Switched to Attendance Summary");
  }

  gridApi.setFilterModel(null);
  gridApi.setGridOption("quickFilterText", "");
}

// Cutoff Period Handling

function populateCutoffDropdown(data) {
  const cutoffSelect = document.getElementById("cutoffFilter");
  if (!cutoffSelect) return;

  // Clear existing options
  cutoffSelect.innerHTML = "";

  // Add "All Cutoff" option
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All Cutoff";
  cutoffSelect.appendChild(allOption);

  // Get unique cutoff periods
  const uniquePeriods = new Set();
  data.forEach(row => {
    const period = row.cutoff_period || row["Cutoff Period"];
    if (period) uniquePeriods.add(period);
  });

  // Add options for each unique period
  Array.from(uniquePeriods)
    .sort()
    .forEach(period => {
      const option = document.createElement("option");
      option.value = period;
      option.textContent = period;
      cutoffSelect.appendChild(option);
    });
}

// Filtering
export function applyDataFilter(searchValue, cutoffValue) {
  const search = (searchValue || "").toLowerCase().trim();
  const cutoff = (cutoffValue || "").trim();

  const filteredData = currentData.filter((item) => {
    // Search across multiple fields
    const searchMatches = !search || [
      item["Employee ID"],
      item["employee_id"],
      item["First Name"],
      item["first_name"],
      item["Last Name"], 
      item["last_name"]
    ].some(field => String(field || "").toLowerCase().includes(search));

    // Match cutoff period
    const cutoffMatches = !cutoff || 
      String(item["Cutoff Period"] || item.cutoff_period || "").trim() === cutoff;

    return searchMatches && cutoffMatches;
  });

  gridApi.setGridOption("rowData", filteredData);

  // Highlight filtered rows
  if (filteredData.length > 0) {
    setTimeout(() => {
      const displayedRows = [];
      gridApi.forEachNodeAfterFilterAndSort((node) => displayedRows.push(node));
      displayedRows.slice(0, 10).forEach((node) => {
        gridApi.flashCells({ rowNodes: [node] });
      });
    }, 100);
  }
}

// Add event listeners when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search");
  const cutoffFilter = document.getElementById("cutoffFilter");
  const filterBtn = document.getElementById("filterBtn");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      applyDataFilter(searchInput.value, cutoffFilter?.value);
    });
  }

  if (cutoffFilter) {
    cutoffFilter.addEventListener("change", () => {
      applyDataFilter(searchInput?.value, cutoffFilter.value);
    });
  }

  if (filterBtn) {
    filterBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (cutoffFilter) cutoffFilter.value = "";
      applyDataFilter("", "");
    });
  }
});