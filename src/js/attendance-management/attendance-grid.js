//attendance-grid.js
import { supabaseClient } from "../supabase/supabaseClient.js";
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
  { field: "Date", sortable: true, filter: true, width: 100 },
  { field: "Employee ID", sortable: true, filter: true, width: 110 },
  { 
    field: "Last Name", 
    sortable: true, 
    filter: true, 
    width: 120,
    valueFormatter: (params) => {
      if (!params.value) return '';
      // Ensure all letters including 'T' are displayed properly
      return params.value.toString();
    }
  },
  { 
    field: "First Name", 
    sortable: true, 
    filter: true, 
    width: 120,
    valueFormatter: (params) => {
      if (!params.value) return '';
      // Ensure all letters including 'T' are displayed properly
      return params.value.toString();
    }
  },
  { 
    field: "Middle Name", 
    sortable: true, 
    filter: true, 
    width: 100,
    valueFormatter: (params) => {
      if (!params.value) return '';
      return params.value.toString().toUpperCase();
    }
  },
  { field: "Official Time", sortable: true, filter: true, width: 130 },

  { 
    field: "Time In", 
    sortable: true, 
    filter: true,
    editable: true,
    cellEditor: "agTextCellEditor",
    singleClickEdit: true,
    width: 130,
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
    width: 130,
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
    singleClickEdit: true,
    width: 80
  },
  { 
    field: "Undertime", 
    sortable: true, 
    filter: true,
    editable: true,
    cellEditor: "agNumberCellEditor",
    cellEditorParams: { min: 0, precision: 0 },
    singleClickEdit: true,
    width: 90
  },
  {
    field: "Status",
    sortable: true,
    filter: true,
    editable: true,
    cellEditor: CustomStatusEditor,
    singleClickEdit: true,
    cellStyle: { cursor: 'pointer' },
    width: 120,
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
  { 
    field: "Department", 
    sortable: true, 
    filter: true, 
    width: 150,
    valueFormatter: (params) => {
      // Fix department spelling
      if (!params.value) return '';
      const dept = params.value.toString().toLowerCase();
      if (dept.includes('information') || dept.includes('ech')) {
        return 'Information Technology';
      }
      return params.value;
    }
  },
];


// Attendance Summary Columns - ALL FIELDS 
const summaryColumns = [
  { headerName: "Cutoff ID", field: "Cutoff ID", sortable: true, filter: true, resizable: true, width: 100 },
  { headerName: "Employee ID", field: "Employee ID", sortable: true, filter: true, resizable: true, width: 110 },
  { 
    headerName: "First Name", 
    field: "First Name", 
    sortable: true, 
    filter: true, 
    resizable: true, 
    width: 120,
    valueFormatter: (params) => {
      if (!params.value) return '';
      return params.value.toString();
    }
  },
  { 
    headerName: "Middle Name", 
    field: "Middle Name", 
    sortable: true, 
    filter: true, 
    resizable: true, 
    width: 120,
    valueFormatter: (params) => {
      if (!params.value) return '';
      return params.value.toString().toUpperCase();
    }
  },
  { 
    headerName: "Last Name", 
    field: "Last Name", 
    sortable: true, 
    filter: true, 
    resizable: true, 
    width: 120,
    valueFormatter: (params) => {
      if (!params.value) return '';
      return params.value.toString();
    }
  },
  { headerName: "Regular Hours", field: "Regular Hours", sortable: true, filter: true, resizable: true, width: 120 },
  { headerName: "Overtime Hours", field: "Overtime Hours", sortable: true, filter: true, resizable: true, width: 120 },
  { headerName: "Late", field: "Late Minutes", sortable: true, filter: true, resizable: true, width: 80 },
  { headerName: "Undertime", field: "Undertime Minutes", sortable: true, filter: true, resizable: true, width: 100 },
  { headerName: "Leave W/ Pay", field: "Leave W/ Pay", sortable: true, filter: true, resizable: true, width: 120 },
  { headerName: "Leave W/O Pay", field: "Leave W/O Pay", sortable: true, filter: true, resizable: true, width: 120 },
  { headerName: "Absences", field: "Absences", sortable: true, filter: true, resizable: true, width: 100 },
  { headerName: "Cutoff Period", field: "Cutoff Period", sortable: true, filter: true, resizable: true, width: 180, pinned: null, hide: false },
  { 
    headerName: "Department", 
    field: "Department", 
    sortable: true, 
    filter: true, 
    resizable: true, 
    width: 150,
    valueFormatter: (params) => {
      if (!params.value) return '';
      const dept = params.value.toString().toLowerCase();
      if (dept.includes('information') || dept.includes('ech')) {
        return 'Information Technology';
      }
      return params.value;
    }
  },
];

// Save Edited Row Function
async function saveEditedRow(rowData, fieldChanged) {
  try {
    console.log("💾 Saving edited row to Supabase...", { rowData, fieldChanged });
    
    // Map the display field names to database column names
    const fieldMapping = {
      "Time In": "time_in",
      "Time Out": "time_out",
      "Late (m)": "late",
      "Undertime": "undertime",
      "Status": "status"
    };
    
    const dbField = fieldMapping[fieldChanged];
    
    if (!dbField) {
      console.warn("⚠️ Field not mapped for saving:", fieldChanged);
      return;
    }
    
    // Prepare the update object
    const updateData = {
      [dbField]: rowData[fieldChanged]
    };
    
    // Format datetime fields if needed (Time In/Time Out)
    if (dbField === "time_in" || dbField === "time_out") {
      const value = rowData[fieldChanged];
      if (value && !value.includes("T")) {
        // If the value doesn't have 'T', add it back for proper datetime format
        updateData[dbField] = value.replace(" ", "T");
      }
    }
    
    console.log("📝 Update data:", updateData);
    console.log("Matching on emp_id:", rowData["Employee ID"], "and date:", rowData["Date"]);
    
    // Find the record by emp_id and date
    // Since raw_time_logs uses time_in as timestamp, we need to match by date part
    const { data, error } = await supabaseClient
      .from("raw_time_logs")
      .update(updateData)
      .eq("emp_id", rowData["Employee ID"])
      .gte("time_in", rowData["Date"] + "T00:00:00")
      .lt("time_in", rowData["Date"] + "T23:59:59")
      .select();
    
    if (error) {
      console.error("❌ Error saving to Supabase:", error);
      alert(`Failed to save changes: ${error.message}`);
      return;
    }
    
    if (!data || data.length === 0) {
      console.warn("⚠️ No records updated. Check if employee ID and date match.");
      alert("No matching record found to update. Please refresh and try again.");
      return;
    }
    
    console.log("✅ Successfully saved to Supabase:", data);
    
  } catch (err) {
    console.error("💥 Unexpected error saving row:", err);
    alert(`An error occurred while saving: ${err.message}`);
  }
}

// Add New Time Log Variables and Functions
let selectedEmployees = [];
const addTimeLogContainer = document.getElementById("addTimeLogContainer");
const addTimeLogBtn = document.getElementById("addTimeLogBtn");

// Function to update selected employees and show/hide add button
function updateSelectedEmployees() {
  selectedEmployees = gridApi.getSelectedRows();
  
  // Only show button in Raw Time Logs view and when exactly one employee is selected
  if (currentView === "raw" && selectedEmployees.length === 1) {
    // Show button and update selected employee info
    addTimeLogContainer.classList.remove("hidden");
    updateSelectedEmployeeInfo(selectedEmployees[0]);
  } else {
    // Hide button in all other cases (summary view, no selection, or multiple selection)
    addTimeLogContainer.classList.add("hidden");
  }
}

// Function to update the selected employee info in modal
function updateSelectedEmployeeInfo(employee) {
  const selectedEmployeeInfo = document.getElementById("selectedEmployeeInfo");
  if (selectedEmployeeInfo) {
    selectedEmployeeInfo.innerHTML = `
      <div class="font-medium">${employee["First Name"]} ${employee["Last Name"]}</div>
      <div class="text-gray-600">ID: ${employee["Employee ID"]} | Department: ${employee["Department"] || "N/A"}</div>
    `;
  }
}

// Function to get employee's official time
async function getEmployeeOfficialTime(employeeId) {
  try {
    const { data: employeeData, error } = await supabaseClient
      .from("employees")
      .select(`
        official_time_id,
        official_time!inner (
          official_time_id,
          start_time,
          end_time
        )
      `)
      .eq("emp_id", employeeId)
      .single();

    if (error) {
      console.warn("Error fetching employee official_time, using default:", error);
      return {
        startTime: "08:00:00",
        endTime: "17:00:00"
      };
    }

    if (employeeData && employeeData.official_time) {
      return {
        startTime: employeeData.official_time.start_time,
        endTime: employeeData.official_time.end_time
      };
    }

    return {
      startTime: "08:00:00",
      endTime: "17:00:00"
    };
  } catch (error) {
    console.warn("Error getting official time:", error);
    return {
      startTime: "08:00:00",
      endTime: "17:00:00"
    };
  }
}

// Function to calculate late and undertime based on official time
function calculateTimeAdjustments(timeIn, timeOut, officialStartTime, officialEndTime, logDate) {
  if (!timeIn) {
    return { lateMinutes: 0, undertimeMinutes: 0, status: "Absent" };
  }

  // Parse times
  const timeInDate = new Date(timeIn);
  const officialStartDate = new Date(`${logDate}T${officialStartTime}`);
  const officialEndDate = new Date(`${logDate}T${officialEndTime}`);
  
  let lateMinutes = 0;
  let undertimeMinutes = 0;
  let status = "Present";

  // Calculate late minutes (if time in is after official start time)
  if (timeInDate > officialStartDate) {
    lateMinutes = Math.round((timeInDate - officialStartDate) / (1000 * 60));
  }

  // Calculate undertime minutes (if time out is before official end time and time out exists)
  if (timeOut) {
    const timeOutDate = new Date(timeOut);
    if (timeOutDate < officialEndDate) {
      undertimeMinutes = Math.round((officialEndDate - timeOutDate) / (1000 * 60));
    }
  } else {
    // If no time out, consider it as undertime for the full afternoon
    const afternoonDuration = Math.round((officialEndDate - new Date(`${logDate}T12:00:00`)) / (1000 * 60));
    undertimeMinutes = afternoonDuration > 0 ? afternoonDuration : 240; // Default 4 hours if calculation fails
  }

  // Determine status based on time adjustments
  if (!timeOut) {
    status = "Undertime";
  } else if (lateMinutes > 0 && undertimeMinutes > 0) {
    status = "Late/Undertime";
  } else if (lateMinutes > 0) {
    status = "Late";
  } else if (undertimeMinutes > 0) {
    status = "Undertime";
  } else {
    status = "Present";
  }

  return {
    lateMinutes: Math.max(0, lateMinutes),
    undertimeMinutes: Math.max(0, undertimeMinutes),
    status
  };
}

// Function to save new time log to Supabase with duplicate prevention
async function saveNewTimeLog(timeLogData, selectedEmployee) {
  try {
    console.log("Saving new time log to Supabase...", timeLogData);

    // First, check if a time log already exists for this employee on the same date
    const logDate = timeLogData.timeIn.split(' ')[0]; // Extract date part from timeIn
    
    console.log("Checking for duplicates for employee:", timeLogData.employeeId, "on date:", logDate);

    const startOfDay = logDate + ' 00:00:00';
    const endOfDay = logDate + ' 23:59:59';
    
    const { data: existingLogs, error: checkError } = await supabaseClient
      .from("raw_time_logs")
      .select("time_in")
      .eq("emp_id", timeLogData.employeeId)
      .gte("time_in", startOfDay)
      .lte("time_in", endOfDay);

    if (checkError) {
      console.error("Error checking for existing time logs:", checkError);
      throw new Error(`Failed to check for existing time logs: ${checkError.message}`);
    }

    console.log("Found existing logs for date:", existingLogs);

    if (existingLogs && existingLogs.length > 0) {
      throw new Error(`This employee already has a time log for ${logDate}. Please edit the existing record instead.`);
    }

    // If no existing log, proceed with insertion
    const { data: employeeData, error: employeeError } = await supabaseClient
      .from("employees")
      .select("official_time_id")
      .eq("emp_id", timeLogData.employeeId)
      .single();

    let officialTimeId = 1; // Default fallback

    if (employeeError) {
      console.warn("Error fetching employee official_time_id, using default:", employeeError);
    } else if (employeeData && employeeData.official_time_id) {
      officialTimeId = employeeData.official_time_id;
    }

    const { data, error } = await supabaseClient
      .from("raw_time_logs")
      .insert([
        {
          emp_id: timeLogData.employeeId,
          time_in: timeLogData.timeIn,
          time_out: timeLogData.timeOut,
          late: timeLogData.lateMinutes,
          undertime: timeLogData.undertimeMinutes,
          status: timeLogData.status,
          official_time_id: officialTimeId,
        }
      ])
      .select();

    if (error) {
      console.error("Error saving new time log:", error);
      throw error;
    }

    console.log("Successfully saved new time log:", data);
    return data;
  } catch (error) {
    console.error("Unexpected error saving time log:", error);
    throw error;
  }
}

// Helper function to create warning element
function createDateWarningElement() {
  const warningElement = document.createElement('div');
  warningElement.id = 'dateWarning';
  warningElement.className = 'text-warning text-sm mt-2 bg-warning/10 p-2 rounded hidden';
  
  const form = document.getElementById('addTimeLogForm');
  const dateInput = document.getElementById('logDate');
  form.insertBefore(warningElement, dateInput.nextSibling);
  
  return warningElement;
}

// Function to initialize time log modal
function initializeTimeLogModal() {
  const addTimeLogForm = document.getElementById("addTimeLogForm");
  const logDateInput = document.getElementById("logDate");
  const timeInInput = document.getElementById("timeIn");
  const timeOutInput = document.getElementById("timeOut");
  const lateMinutesInput = document.getElementById("lateMinutes");
  const undertimeMinutesInput = document.getElementById("undertimeMinutes");
  const statusSelect = document.getElementById("logStatus");

  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  logDateInput.value = today;

  // Enhanced date change listener with duplicate checking
  logDateInput.addEventListener('change', async function() {
    const date = this.value;
    timeInInput.value = date + 'T08:00';
    timeOutInput.value = date + 'T17:00';
    
    // Auto-calculate times when date changes
    await autoCalculateTimes();

    // If an employee is selected, check if they already have a log for this date
    if (selectedEmployees.length === 1) {
      const selectedEmployee = selectedEmployees[0];
      try {
        const startOfDay = date + ' 00:00:00';
        const endOfDay = date + ' 23:59:59';
        
        const { data: existingLogs, error } = await supabaseClient
          .from("raw_time_logs")
          .select("time_in")
          .eq("emp_id", selectedEmployee["Employee ID"])
          .gte("time_in", startOfDay)
          .lte("time_in", endOfDay);

        if (!error && existingLogs && existingLogs.length > 0) {
          const warningElement = document.getElementById('dateWarning') || createDateWarningElement();
          warningElement.textContent = `⚠️ This employee already has a time log for ${date}. Adding a new one will be blocked.`;
          warningElement.classList.remove('hidden');
        } else {
          const warningElement = document.getElementById('dateWarning');
          if (warningElement) {
            warningElement.classList.add('hidden');
          }
        }
      } catch (err) {
        console.warn("Could not check for existing logs:", err);
      }
    }
  });

  // Set initial times
  timeInInput.value = today + 'T08:00';
  timeOutInput.value = today + 'T17:00';

  // Auto-calculate when time inputs change
  timeInInput.addEventListener('change', autoCalculateTimes);
  timeOutInput.addEventListener('change', autoCalculateTimes);

  // Function to auto-calculate late, undertime, and status
  async function autoCalculateTimes() {
    if (selectedEmployees.length !== 1) return;

    const timeIn = timeInInput.value;
    const timeOut = timeOutInput.value;
    const logDate = logDateInput.value;

    if (!timeIn) return;

    try {
      const selectedEmployee = selectedEmployees[0];
      const officialTime = await getEmployeeOfficialTime(selectedEmployee["Employee ID"]);
      
      const { lateMinutes, undertimeMinutes, status } = calculateTimeAdjustments(
        timeIn ? timeIn.replace('T', ' ') + ':00' : null,
        timeOut ? timeOut.replace('T', ' ') + ':00' : null,
        officialTime.startTime,
        officialTime.endTime,
        logDate
      );

      lateMinutesInput.value = lateMinutes;
      undertimeMinutesInput.value = undertimeMinutes;
      statusSelect.value = status;

    } catch (error) {
      console.warn("Error auto-calculating times:", error);
    }
  }

  // Also auto-calculate when employee selection changes
  const originalUpdateSelectedEmployeeInfo = updateSelectedEmployeeInfo;
  updateSelectedEmployeeInfo = function(employee) {
    originalUpdateSelectedEmployeeInfo(employee);
    autoCalculateTimes();
  };

  // Form submission handler
  addTimeLogForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (selectedEmployees.length !== 1) {
      alert("Please select exactly one employee.");
      return;
    }

    const selectedEmployee = selectedEmployees[0];
    
    try {
      const selectedDateStr = logDateInput.value;
      const currentDateStr = new Date().toISOString().split('T')[0];

      if (selectedDateStr > currentDateStr) {
        alert("Cannot add time logs for future dates.");
        return;
      }

      await autoCalculateTimes();

      const timeLogData = {
        employeeId: selectedEmployee["Employee ID"],
        timeIn: timeInInput.value.replace('T', ' ') + ':00',
        timeOut: timeOutInput.value ? timeOutInput.value.replace('T', ' ') + ':00' : null,
        lateMinutes: parseInt(lateMinutesInput.value) || 0,
        undertimeMinutes: parseInt(undertimeMinutesInput.value) || 0,
        status: statusSelect.value
      };

      await saveNewTimeLog(timeLogData, selectedEmployee);

      alert("Time log added successfully!");
      document.getElementById('addTimeLogModal').close();
      await refreshGridData();

      addTimeLogForm.reset();
      const todayStr = new Date().toISOString().split('T')[0];
      logDateInput.value = todayStr;
      timeInInput.value = todayStr + 'T08:00';
      timeOutInput.value = todayStr + 'T17:00';

    } catch (error) {
      alert(`Failed to add time log: ${error.message}`);
    }
  });
}

// Function to refresh grid data
async function refreshGridData() {
  if (currentView === "raw") {
    const data = await loadRawTimeLogs();
    currentData = data;
    gridApi.setGridOption("rowData", data);
  }
}

// Function to generate cutoff periods from dates in format "2025-10-1 to 2025-10-15"
function generateCutoffPeriodsFromDates(dates) {
  const cutoffPeriods = new Set();
  
  dates.forEach(dateStr => {
    if (!dateStr) return;
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      let startDate, endDate;
      
      if (day <= 15) {
        startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        endDate = `${year}-${month.toString().padStart(2, '0')}-15`;
      } else {
        const lastDay = new Date(year, month, 0).getDate();
        startDate = `${year}-${month.toString().padStart(2, '0')}-16`;
        endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
      }
      
      const cutoffPeriod = `${startDate} to ${endDate}`;
      cutoffPeriods.add(cutoffPeriod);
      
    } catch (error) {
      console.warn(`Invalid date format: ${dateStr}`, error);
    }
  });
  
  return Array.from(cutoffPeriods).sort();
}

// Function to check if a date falls within a cutoff period
function isDateInCutoffPeriod(dateStr, cutoffPeriod) {
  if (!dateStr || !cutoffPeriod) return false;
  
  try {
    const [startStr, endStr] = cutoffPeriod.split(' to ');
    const date = new Date(dateStr);
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    
    return date >= startDate && date <= endDate;
  } catch (error) {
    console.warn('Error checking date in cutoff period:', error);
    return false;
  }
}

// Updated CSV and PDF Export Functions with date-based cutoff periods
function exportToCSVAndPDF() {
  const cutoffFilter = document.getElementById("csvCutoffFilter")?.value || "all";
  const departmentFilter = document.getElementById("csvDepartmentFilter")?.value || "all";
  
  console.log("=== CSV EXPORT DEBUG ===");
  console.log("Export parameters:", {
    cutoffFilter,
    departmentFilter,
    currentView,
    totalRecords: currentData.length
  });
  
  let filteredData = currentData;
  
  // Apply filters if needed
  if (cutoffFilter !== "all") {
    if (currentView === "raw") {
      filteredData = filteredData.filter(row => {
        const rowDate = row["Date"];
        return isDateInCutoffPeriod(rowDate, cutoffFilter);
      });
    } else {
      filteredData = filteredData.filter(row => {
        const rowCutoff = row["Cutoff Period"] || row["Cutoff ID"] || row.cutoff_period || row.cutoff_id;
        return rowCutoff === cutoffFilter;
      });
    }
  }
  
  if (departmentFilter !== "all") {
    filteredData = filteredData.filter(row => {
      const rowDept = row["Department"] || row.department || row.dept;
      return rowDept === departmentFilter;
    });
  }
  
  if (filteredData.length === 0) {
    let availableCutoffs, availableDepts;
    
    if (currentView === "raw") {
      const dates = currentData.map(row => row["Date"]).filter(Boolean);
      availableCutoffs = generateCutoffPeriodsFromDates(dates);
      availableDepts = [...new Set(currentData.map(row => row["Department"] || row.department).filter(Boolean))];
    } else {
      availableCutoffs = [...new Set(currentData.map(row => row["Cutoff Period"] || row["Cutoff ID"]).filter(Boolean))];
      availableDepts = [...new Set(currentData.map(row => row["Department"] || row.department).filter(Boolean))];
    }
    
    alert(`No data to export with the selected filters.\n\nSelected Filters:\n• Cutoff Period: ${cutoffFilter}\n• Department: ${departmentFilter}\n\nAvailable in Data:\n• Cutoff Periods: ${availableCutoffs.length > 0 ? availableCutoffs.join(', ') : 'None found'}\n• Departments: ${availableDepts.length > 0 ? availableDepts.join(', ') : 'None found'}\n\nTotal records available: ${currentData.length}`);
    return;
  }
  
  // Generate CSV
  generateCSVFile(filteredData, cutoffFilter, departmentFilter);
  
  // Generate PDF
  generatePDFFile(filteredData, cutoffFilter, departmentFilter);
  
  // Close modal
  document.getElementById('generateCSV').close();
}

function generateCSVFile(data, cutoffFilter, departmentFilter) {
  const columns = gridApi.getColumnDefs();
  const headers = columns.map(col => col.field || col.headerName).filter(Boolean);
  
  const csvContent = [
    headers.join(","),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        return stringValue.includes(',') || stringValue.includes('"') 
          ? `"${stringValue.replace(/"/g, '""')}"` 
          : stringValue;
      }).join(",")
    )
  ].join("\n");
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  const viewName = currentView === "raw" ? "Raw_Time_Logs" : "Attendance_Summary";
  const cutoffLabel = cutoffFilter === "all" ? "All_Cutoff" : cutoffFilter.replace(/[^a-zA-Z0-9]/g, "_");
  const deptLabel = departmentFilter === "all" ? "All_Departments" : departmentFilter.replace(/[^a-zA-Z0-9]/g, "_");
  const timestamp = new Date().toISOString().split('T')[0];
  
  const filename = `${viewName}_${cutoffLabel}_${deptLabel}_${timestamp}.csv`;
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// FIXED PDF GENERATION FOR BOTH VIEWS
function generatePDFFile(data, cutoffFilter, departmentFilter) {
  try {
    const { jsPDF } = window.jspdf;
    
    // Create landscape PDF for better table display
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    const columns = gridApi.getColumnDefs();
    
    // Filter out hidden columns and get visible ones only
    const visibleColumns = columns.filter(col => !col.hide);
    const headers = visibleColumns.map(col => col.headerName || col.field).filter(Boolean);
    
    // Add title and metadata
    const viewName = currentView === "raw" ? "Raw Time Logs Report" : "Attendance Summary Report";
    const cutoffLabel = cutoffFilter === "all" ? "All Cutoff Periods" : cutoffFilter;
    const deptLabel = departmentFilter === "all" ? "All Departments" : departmentFilter;
    
    // Title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(viewName, 14, 20);
    
    // Metadata
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Cutoff Period: ${cutoffLabel}`, 14, 30);
    doc.text(`Department: ${deptLabel}`, 14, 37);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 44);
    doc.text(`Total Records: ${data.length}`, 14, 51);
    
    // Prepare table data with proper formatting - FIXED DATA ACCESS
    const displayData = data.slice(0, 50); // Limit records for readability
    
    const tableData = displayData.map(row => 
      visibleColumns.map(col => {
        // FIX: Use the actual field name to get the value
        const fieldName = col.field || col.headerName;
        let value = row[fieldName] || '';
        
        // If value is still empty, try alternative field names
        if (!value && fieldName === "Last Name") {
          value = row["Last Name"] || row["last_name"] || row["lastName"] || '';
        } else if (!value && fieldName === "First Name") {
          value = row["First Name"] || row["first_name"] || row["firstName"] || '';
        } else if (!value && fieldName === "Middle Name") {
          value = row["Middle Name"] || row["middle_name"] || row["middleName"] || '';
        }
        
        // Format data for better readability
        if (value === null || value === undefined || value === '') {
          return '-';
        }
        
        // Convert to string to ensure all characters are preserved
        const stringValue = String(value);
        
        // Format datetime values (only if it looks like a datetime with pattern YYYY-MM-DDTHH:MM)
        if (typeof value === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
          return value.replace('T', ' ').substring(0, 16);
        }
        
        // Format numeric values
        if ((fieldName === 'Late (m)' || fieldName === 'Late Minutes' || 
             fieldName === 'Undertime' || fieldName === 'Undertime Minutes') && 
            (value === 0 || value === '0')) {
          return '-';
        }
        
        // Capitalize status values
        if (fieldName === 'Status') {
          return stringValue.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
        }
        
        // For name fields, ensure we return the complete string including 'T'
        if (fieldName === 'Last Name' || fieldName === 'First Name' || fieldName === 'Middle Name') {
          return stringValue; // Return the complete string as-is
        }
        
        // For department, ensure proper spelling
        if (fieldName === 'Department') {
          const dept = stringValue.toLowerCase();
          if (dept.includes('information') || dept.includes('ech')) {
            return 'Information Technology';
          }
        }
        
        return stringValue;
      })
    );
    
    // Configure column styles based on view type
    let columnStyles = {};
    
    if (currentView === "raw") {
      // Raw Time Logs column widths
      columnStyles = {
        0: { cellWidth: 20 },  // Date
        1: { cellWidth: 20 },  // Employee ID
        2: { cellWidth: 25 },  // Last Name
        3: { cellWidth: 25 },  // First Name
        4: { cellWidth: 20 },  // Middle Name
        5: { cellWidth: 25 },  // Official Time
        6: { cellWidth: 25 },  // Time In
        7: { cellWidth: 25 },  // Time Out
        8: { cellWidth: 15 },  // Late (m)
        9: { cellWidth: 18 },  // Undertime
        10: { cellWidth: 20 }, // Status
        11: { cellWidth: 30 }  // Department
      };
    } else {
      // Attendance Summary column widths
      columnStyles = {
        0: { cellWidth: 15 },  // Cutoff ID
        1: { cellWidth: 20 },  // Employee ID
        2: { cellWidth: 20 },  // First Name
        3: { cellWidth: 20 },  // Middle Name
        4: { cellWidth: 20 },  // Last Name
        5: { cellWidth: 20 },  // Regular Hours
        6: { cellWidth: 20 },  // Overtime Hours
        7: { cellWidth: 15 },  // Late
        8: { cellWidth: 18 },  // Undertime
        9: { cellWidth: 20 },  // Leave W/ Pay
        10: { cellWidth: 20 }, // Leave W/O Pay
        11: { cellWidth: 15 }, // Absences
        12: { cellWidth: 30 }, // Cutoff Period
        13: { cellWidth: 25 }  // Department
      };
    }
    
    // Generate table with proper formatting
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 60,
      styles: { 
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: columnStyles,
      margin: { top: 60, right: 10, bottom: 20, left: 10 },
      pageBreak: 'auto',
      tableWidth: 'wrap',
      theme: 'grid'
    });
    
    // Add page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width - 20,
        doc.internal.pageSize.height - 10
      );
    }
    
    // Add truncation note if needed
    if (data.length > 50) {
      const finalY = doc.lastAutoTable.finalY || 60;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Note: Showing first 50 of ${data.length} records. For complete data, export CSV.`,
        14,
        finalY + 10
      );
    }
    
    // Generate filename
    const viewNameFile = currentView === "raw" ? "Raw_Time_Logs" : "Attendance_Summary";
    const cutoffLabelFile = cutoffFilter === "all" ? "All_Cutoff" : cutoffFilter.replace(/[^a-zA-Z0-9]/g, "_");
    const deptLabelFile = departmentFilter === "all" ? "All_Departments" : departmentFilter.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = new Date().toISOString().split('T')[0];
    
    const filename = `${viewNameFile}_${cutoffLabelFile}_${deptLabelFile}_${timestamp}.pdf`;
    
    doc.save(filename);
    console.log(`PDF file generated: ${filename} with ${Math.min(data.length, 50)} records displayed`);
    
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert(`Error generating PDF: ${error.message}. Please try generating CSV instead.`);
  }
}

// Enhanced function to populate CSV modal dropdowns with date-based cutoff periods
function populateCSVModalDropdowns() {
  const cutoffSelect = document.getElementById("csvCutoffFilter");
  const departmentSelect = document.getElementById("csvDepartmentFilter");
  
  if (!cutoffSelect || !departmentSelect) {
    console.error("CSV modal dropdown elements not found");
    return;
  }
  
  // Clear existing options
  cutoffSelect.innerHTML = "";
  departmentSelect.innerHTML = "";
  
  // Add "All" options
  const allCutoffOption = document.createElement("option");
  allCutoffOption.value = "all";
  allCutoffOption.textContent = "All Cutoff Periods";
  cutoffSelect.appendChild(allCutoffOption);
  
  const allDeptOption = document.createElement("option");
  allDeptOption.value = "all";
  allDeptOption.textContent = "All Departments";
  departmentSelect.appendChild(allDeptOption);
  
  console.log("=== POPULATING CSV DROPDOWNS ===");
  console.log("Current view:", currentView);
  console.log("Total records:", currentData.length);
  
  // Handle cutoff periods based on current view
  if (currentView === "raw") {
    // For raw time logs, generate cutoff periods from dates
    const dates = currentData.map(row => row["Date"]).filter(Boolean);
    console.log("Unique dates found:", [...new Set(dates)].sort());
    
    const cutoffPeriods = generateCutoffPeriodsFromDates(dates);
    console.log("Generated cutoff periods:", cutoffPeriods);
    
    if (cutoffPeriods.length > 0) {
      cutoffPeriods.forEach(period => {
        const option = document.createElement("option");
        option.value = period;
        option.textContent = period;
        cutoffSelect.appendChild(option);
      });
      console.log(`Added ${cutoffPeriods.length} date-based cutoff periods to dropdown`);
    } else {
      console.warn("No cutoff periods generated from dates");
      // Generate some example cutoff periods based on current date
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const examplePeriods = [
        `${year}-${month.toString().padStart(2, '0')}-01 to ${year}-${month.toString().padStart(2, '0')}-15`,
        `${year}-${month.toString().padStart(2, '0')}-16 to ${year}-${month.toString().padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
      ];
      
      examplePeriods.forEach(period => {
        const option = document.createElement("option");
        option.value = period;
        option.textContent = period;
        cutoffSelect.appendChild(option);
      });
    }
  } else {
    // For summary view, use existing cutoff periods from data
    const uniqueCutoffPeriods = new Set();
    currentData.forEach(row => {
      const cutoffPeriod = row["Cutoff Period"] || row["Cutoff ID"] || row.cutoff_period;
      if (cutoffPeriod) uniqueCutoffPeriods.add(cutoffPeriod);
    });
    
    if (uniqueCutoffPeriods.size > 0) {
      Array.from(uniqueCutoffPeriods).sort().forEach(period => {
        const option = document.createElement("option");
        option.value = period;
        option.textContent = period;
        cutoffSelect.appendChild(option);
      });
      console.log(`Added ${uniqueCutoffPeriods.size} summary cutoff periods to dropdown`);
    }
  }
  
  // Populate department dropdown (same for both views)
  const uniqueDepartments = new Set();
  currentData.forEach(row => {
    const department = row["Department"] || row.department || row.dept;
    if (department) uniqueDepartments.add(department);
  });
  
  if (uniqueDepartments.size > 0) {
    Array.from(uniqueDepartments).sort().forEach(dept => {
      const option = document.createElement("option");
      option.value = dept;
      option.textContent = dept;
      departmentSelect.appendChild(option);
    });
    console.log(`Added ${uniqueDepartments.size} departments to dropdown`);
  } else {
    // Fallback departments
    const fallbackDepts = ["Information Technology", "Human Resources", "Accounting", "Sales"];
    fallbackDepts.forEach(dept => {
      const option = document.createElement("option");
      option.value = dept;
      option.textContent = dept;
      departmentSelect.appendChild(option);
    });
  }
}

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
    console.log("📝 Cell value changed:", {
      field: event.colDef.field,
      oldValue: event.oldValue,
      newValue: event.newValue,
      rowData: event.data
    });
    
    // Save the edited row data
    saveEditedRow(event.data, event.colDef.field);
  },
  // Add this new callback for row selection
  onSelectionChanged: (event) => {
    updateSelectedEmployees();
  }
};

export const gridApi = agGrid.createGrid(gridDiv, gridOptions);
window.gridApi = gridApi; //  Make available for CSV export

// Loaders

async function loadRawTimeLogs() {
  try {
    const data = await getEmployeeAttendanceTable();
    console.log("📊 Raw time logs loaded:", data.length);
    if (data.length > 0) {
      console.log("Sample raw time log record:", data[0]);
      // Log the actual name values to debug the missing 'T' issue
      const sampleNames = data.slice(0, 5).map(row => ({
        firstName: row["First Name"],
        lastName: row["Last Name"],
        fullName: `${row["First Name"]} ${row["Last Name"]}`
      }));
      console.log("Sample names in data:", sampleNames);
      
      // Log unique dates for debugging
      const uniqueDates = [...new Set(data.map(row => row["Date"]).filter(Boolean))].sort();
      console.log("Unique dates in raw time logs:", uniqueDates);
    }
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
        console.log(`📊 Loaded cutoff ${cutoffId}:`, data.length, "rows");
      } catch (err) {
        console.warn(`⚠️ Could not load cutoff ${cutoffId}:`, err);
      }
    }
    
    console.log("📊 Total attendance summary loaded:", allData.length, "rows");
    if (allData.length > 0) {
      console.log("🔍 First row:", allData[0]);
      console.log("🔑 All keys in first row:", Object.keys(allData[0]));
    }
    
    return allData;
  } catch (error) {
    console.error("❌ Failed to load attendance summary:", error);
    return [];
  }
}

// Initial Load

async function initializeGrid() {
  const rawData = await loadRawTimeLogs();
  currentData = rawData;
  gridApi.setGridOption("rowData", rawData);
  console.log("✅ Raw Time Logs Table Displayed");
  
  // Initialize the time log modal
  initializeTimeLogModal();
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
    console.log("✅ Switched to Raw Time Logs");
    
    // Update button visibility based on current selection
    updateSelectedEmployees();
    
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
    console.log("✅ Switched to Attendance Summary");
    
    // Force hide add time log button in summary view
    addTimeLogContainer.classList.add("hidden");
  }

  gridApi.setFilterModel(null);
  gridApi.setGridOption("quickFilterText", "");
  
  // Clear selection when switching views
  gridApi.deselectAll();
  selectedEmployees = [];
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
  const search = (searchValue || "").trim();
  const cutoff = (cutoffValue || "").trim();

  // Apply quick filter for search (searches across all columns)
  gridApi.setGridOption("quickFilterText", search);

  // Apply cutoff period filter
  if (cutoff === "" || cutoff === "All Cutoff") {
    // Clear filter if "All Cutoff" selected
    gridApi.setColumnFilterModel("Cutoff Period", null);
  } else {
    // Apply filter to the "Cutoff Period" column
    gridApi.setColumnFilterModel("Cutoff Period", {
      filterType: "text",
      type: "equals",
      filter: cutoff,
    });
  }

  // Refresh grid to apply the changes
  gridApi.onFilterChanged();
}

// Add event listeners when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search");
  const cutoffFilter = document.getElementById("cutoffFilter");
  const filterBtn = document.getElementById("filterBtn");
  const generateCSVBtn = document.getElementById("generateCSVBtn");

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

  // Add event listener for the Add Time Log button
  if (addTimeLogBtn) {
    addTimeLogBtn.addEventListener('click', function() {
      if (selectedEmployees.length === 1 && currentView === "raw") {
        document.getElementById('addTimeLogModal').showModal();
      }
    });
  }

  // Add event listener for CSV generation button
  if (generateCSVBtn) {
    generateCSVBtn.addEventListener('click', () => {
      // Populate dropdowns with current data before showing modal
      populateCSVModalDropdowns();
      document.getElementById('generateCSV').showModal();
    });
  }

  // Handle CSV generation from modal
  const modalGenerateCSVBtn = document.getElementById("modalGenerateCSVBtn");
  if (modalGenerateCSVBtn) {
    modalGenerateCSVBtn.addEventListener('click', exportToCSVAndPDF);
  }
});

// Export functions to global scope for HTML access
window.exportToCSVAndPDF = exportToCSVAndPDF;