import { getAuditTrailData } from "./reports-data.js";
import { supabaseClient } from "../supabase/supabaseClient.js";

const rowData = await getAuditTrailData();

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
  pagination: true,
  paginationPageSize: 20,
  paginationPageSizeSelector: [10, 20, 50, 100],
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

// Date filter modal functionality
const dateFilterBtn = document.getElementById("dateFilterBtn");
const dateFilterModal = document.getElementById("dateFilterModal");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const applyDateFilter = document.getElementById("applyDateFilter");
const clearDateFilter = document.getElementById("clearDateFilter");

// Open modal
dateFilterBtn.addEventListener("click", () => {
  dateFilterModal.showModal();
});

// Apply date filter
applyDateFilter.addEventListener("click", () => {
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  if (!startDate || !endDate) {
    alert("Please select both start and end dates");
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    alert("Start date cannot be after end date");
    return;
  }

  // Add one day to endDate to include the entire end date
  const endDatePlusOne = new Date(endDate);
  endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
  const endDateInclusive = endDatePlusOne.toISOString().split("T")[0];

  // Apply custom filter to Time column
  gridApi.setColumnFilterModel("Time", {
    filterType: "date",
    type: "inRange",
    dateFrom: startDate,
    dateTo: endDateInclusive,
  });

  gridApi.onFilterChanged();
  dateFilterModal.close();
});

// Clear date filter
clearDateFilter.addEventListener("click", () => {
  startDateInput.value = "";
  endDateInput.value = "";
  gridApi.setColumnFilterModel("Time", null);
  gridApi.onFilterChanged();
  dateFilterModal.close();
});

// Add CSV export functionality
const generateCsvBtn = document.getElementById("generateCsvBtn");
generateCsvBtn.addEventListener("click", () => {
  // Get all rows (filtered if filters are applied)
  const rows = [];
  gridApi.forEachNodeAfterFilterAndSort((node) => {
    rows.push(node.data);
  });

  if (rows.length === 0) {
    alert("No data to export");
    return;
  }

  // Get column headers
  const headers = gridOptions.columnDefs.map((col) => col.field);

  // Create CSV content
  let csvContent = headers.join(",") + "\n";

  rows.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header] || "";
      // Escape values that contain commas or quotes
      if (value.toString().includes(",") || value.toString().includes('"')) {
        return `"${value.toString().replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvContent += values.join(",") + "\n";
  });

  // Create download link
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `audit_trail_${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});
