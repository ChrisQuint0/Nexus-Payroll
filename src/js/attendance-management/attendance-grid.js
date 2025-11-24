//attendance-grid.js
import { supabaseClient } from "../supabase/supabaseClient.js";
import { getEmployeeAttendanceTable } from "./raw-time-logs-data-retrieval.js";
import { getPayrollSummaryReport } from "./attendance-summary-data-retrieval.js";

const gridDiv = document.getElementById("attendanceGrid");

// Theme detection
const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
gridDiv.classList.add(isDarkMode ? "ag-theme-quartz-dark" : "ag-theme-quartz");

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
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

// Custom status cell editor
class CustomStatusEditor {
  constructor() {
    this.eSelect = null;
    this.value = null;
  }
  init(params) {
    this.params = params;
    this.value = params.value || "Present";
    const container = document.createElement("div");
    container.className = "w-full h-full flex items-center";
    this.eSelect = document.createElement("select");
    this.eSelect.className = "select select-accent w-full";
    const statuses = [
      "Present",
      "Absent",
      "Undertime",
      "Late",
      "Official Business",
      "Leave with Pay",
      "Leave w/o Pay",
    ];
    statuses.forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      if (status === this.value) option.selected = true;
      this.eSelect.appendChild(option);
    });
    this.eSelect.addEventListener("change", (e) => {
      this.value = e.target.value;
      params.stopEditing();
    });
    this.eSelect.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.value = this.eSelect.value;
        params.stopEditing();
      } else if (e.key === "Escape") {
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
    if (this.eSelect) this.eSelect.focus();
  }
  isPopup() {
    return false;
  }
}

// Raw Time Logs Columns
const rawTimeLogsColumns = [
  { field: "Date", sortable: true, filter: true, width: 130 },
  {
    field: "Employee ID",
    sortable: true,
    filter: true,
    width: 140,
    valueFormatter: (p) => (p.value ? String(p.value) : ""),
    comparator: (a, b) => String(a || "").localeCompare(String(b || "")),
  },
  {
    field: "Last Name",
    sortable: true,
    filter: true,
    width: 160,
    valueFormatter: (p) => (p.value ? p.value.toString() : ""),
  },
  {
    field: "First Name",
    sortable: true,
    filter: true,
    width: 160,
    valueFormatter: (p) => (p.value ? p.value.toString() : ""),
  },
  {
    field: "Middle Name",
    sortable: true,
    filter: true,
    width: 140,
    valueFormatter: (p) => (p.value ? p.value.toString().toUpperCase() : ""),
  },
  { field: "Official Time", sortable: true, filter: true, width: 160 },
  {
    field: "Time In",
    sortable: true,
    filter: true,
    editable: true,
    cellEditor: "agTextCellEditor",
    singleClickEdit: true,
    width: 180,
    valueFormatter: (p) => {
      const val = p.value || "";
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
    width: 180,
    valueFormatter: (p) => {
      const val = p.value || "";
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
    width: 100,
  },
  {
    field: "Undertime",
    sortable: true,
    filter: true,
    editable: true,
    cellEditor: "agNumberCellEditor",
    cellEditorParams: { min: 0, precision: 0 },
    singleClickEdit: true,
    width: 120,
  },
  {
    field: "Status",
    sortable: true,
    filter: true,
    editable: true,
    cellEditor: CustomStatusEditor,
    singleClickEdit: true,
    cellStyle: { cursor: "pointer" },
    width: 180,
    cellRenderer: (params) => {
      const value = params.value || "N/A";
      const colorClass = statusColorMap[value] || "text-gray-400";
      const capitalizedValue = value
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
      return `<div class="flex items-center justify-between w-full h-full px-2"><span class="${colorClass}">${capitalizedValue}</span><svg class="h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></div>`;
    },
  },
  { field: "Cutoff Period", sortable: true, filter: true, hide: true },
  {
    field: "Department",
    sortable: true,
    filter: true,
    width: 200,
    valueFormatter: (p) => {
      if (!p.value) return "";
      const dept = p.value.toString().toLowerCase();
      if (dept.includes("information") || dept.includes("ech"))
        return "Information Technology";
      return p.value;
    },
  },
];

// Attendance Summary Columns
const summaryColumns = [
  {
    headerName: "Cutoff ID",
    field: "Cutoff ID",
    sortable: true,
    filter: true,
    resizable: true,
    width: 130,
  },
  {
    headerName: "Employee ID",
    field: "Employee ID",
    sortable: true,
    filter: true,
    resizable: true,
    width: 140,
  },
  {
    headerName: "First Name",
    field: "First Name",
    sortable: true,
    filter: true,
    resizable: true,
    width: 160,
    valueFormatter: (p) => (p.value ? p.value.toString() : ""),
  },
  {
    headerName: "Middle Name",
    field: "Middle Name",
    sortable: true,
    filter: true,
    resizable: true,
    width: 140,
    valueFormatter: (p) => (p.value ? p.value.toString().toUpperCase() : ""),
  },
  {
    headerName: "Last Name",
    field: "Last Name",
    sortable: true,
    filter: true,
    resizable: true,
    width: 160,
    valueFormatter: (p) => (p.value ? p.value.toString() : ""),
  },
  {
    headerName: "Regular Hours",
    field: "Regular Hours",
    sortable: true,
    filter: true,
    resizable: true,
    width: 140,
    type: "numericColumn",
    valueFormatter: (p) =>
      p.value === null || p.value === undefined ? "0" : p.value.toString(),
  },
  {
    headerName: "Overtime Hours",
    field: "Overtime Hours",
    sortable: true,
    filter: true,
    resizable: true,
    width: 150,
    type: "numericColumn",
    valueFormatter: (p) =>
      p.value === null || p.value === undefined ? "0" : p.value.toString(),
  },
  {
    headerName: "Late (m)",
    field: "Late Minutes",
    sortable: true,
    filter: true,
    resizable: true,
    width: 120,
    type: "numericColumn",
    valueFormatter: (p) =>
      p.value === null || p.value === undefined ? "0" : p.value.toString(),
  },
  {
    headerName: "Undertime (m)",
    field: "Undertime Minutes",
    sortable: true,
    filter: true,
    resizable: true,
    width: 140,
    type: "numericColumn",
    valueFormatter: (p) =>
      p.value === null || p.value === undefined ? "0" : p.value.toString(),
  },
  {
    headerName: "Leave W/ Pay",
    field: "Leave W/ Pay",
    sortable: true,
    filter: true,
    resizable: true,
    width: 130,
    type: "numericColumn",
    valueFormatter: (p) =>
      p.value === null || p.value === undefined ? "0" : p.value.toString(),
  },
  {
    headerName: "Leave W/O Pay",
    field: "Leave W/O Pay",
    sortable: true,
    filter: true,
    resizable: true,
    width: 140,
    type: "numericColumn",
    valueFormatter: (p) =>
      p.value === null || p.value === undefined ? "0" : p.value.toString(),
  },
  {
    headerName: "Absences",
    field: "Absences",
    sortable: true,
    filter: true,
    resizable: true,
    width: 130,
    type: "numericColumn",
    valueFormatter: (p) =>
      p.value === null || p.value === undefined ? "0" : p.value.toString(),
  },
  {
    headerName: "Cutoff Period",
    field: "Cutoff Period",
    sortable: true,
    filter: true,
    resizable: true,
    width: 220,
    pinned: null,
    hide: false,
  },
  {
    headerName: "Department",
    field: "Department",
    sortable: true,
    filter: true,
    resizable: true,
    width: 200,
    valueFormatter: (p) => {
      if (!p.value) return "";
      const dept = p.value.toString().toLowerCase();
      if (dept.includes("information") || dept.includes("ech"))
        return "Information Technology";
      return p.value;
    },
  },
];

// Add Time Logs Tab - Employee List Columns
const addTimeLogsColumns = [
  {
    field: "Employee ID",
    sortable: true,
    filter: true,
    width: 130,
    valueFormatter: (p) => (p.value ? String(p.value) : ""),
    comparator: (a, b) => String(a || "").localeCompare(String(b || "")),
  },
  {
    field: "First Name",
    sortable: true,
    filter: true,
    width: 200,
    valueFormatter: (p) => (p.value ? p.value.toString() : ""),
  },
  {
    field: "Last Name",
    sortable: true,
    filter: true,
    width: 200,
    valueFormatter: (p) => (p.value ? p.value.toString() : ""),
  },
  {
    field: "Middle Name",
    sortable: true,
    filter: true,
    width: 140,
    valueFormatter: (p) => (p.value ? p.value.toString().toUpperCase() : ""),
  },
  {
    field: "Department",
    sortable: true,
    filter: true,
    width: 220,
    valueFormatter: (p) => {
      if (!p.value) return "";
      const dept = p.value.toString().toLowerCase();
      if (dept.includes("information") || dept.includes("ech"))
        return "Information Technology";
      return p.value;
    },
  },
  { field: "Position", sortable: true, filter: true, width: 220 },
];

// Save Edited Row Function
/**
 * Updates a single field of an employee's attendance record in the Supabase database.
 * This function saves the edited value for a specific field and handles error reporting and user feedback.
 *
 * Args:
 *   rowData (Object): The data for the row being edited, including employee ID and date.
 *   fieldChanged (string): The name of the field that was changed and needs to be saved.
 *
 * Returns:
 *   Promise<void>: Resolves when the save operation is complete.
 */
async function saveEditedRow(rowData, fieldChanged) {
  try {
    const fieldMapping = {
      "Time In": "time_in",
      "Time Out": "time_out",
      "Late (m)": "late",
      Undertime: "undertime",
      Status: "status",
    };
    const dbField = fieldMapping[fieldChanged];
    if (!dbField) return;
    const updateData = { [dbField]: rowData[fieldChanged] };
    if (dbField === "time_in" || dbField === "time_out") {
      const value = rowData[fieldChanged];
      if (value && !value.includes("T"))
        updateData[dbField] = value.replace(" ", "T");
    }
    const { data, error } = await supabaseClient
      .from("raw_time_logs")
      .update(updateData)
      .eq("emp_id", rowData["Employee ID"])
      .gte("time_in", rowData["Date"] + "T00:00:00")
      .lt("time_in", rowData["Date"] + "T23:59:59")
      .select();
    if (error) {
      showErrorAlert(`Failed to save changes: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      showWarningAlert("No matching record found to update.");
      return;
    }
    console.log("✅ Saved to Supabase:", data);
  } catch (err) {
    showErrorAlert(`Error saving: ${err.message}`);
  }
}

// Selected employees tracking
let selectedEmployees = [];
let selectedRawTimeLogEmployees = [];
let selectedSummaryEmployees = [];

// Update selected employees for Raw Time Logs
function updateSelectedEmployeesForRawTimeLogs() {
  selectedRawTimeLogEmployees = gridApi.getSelectedRows();
  console.log(
    "📋 Selected in Raw Time Logs:",
    selectedRawTimeLogEmployees.length
  );
}

// Update selected employees for Attendance Summary
function updateSelectedEmployeesForSummary() {
  selectedSummaryEmployees = gridApi.getSelectedRows();
  console.log("📋 Selected in Summary:", selectedSummaryEmployees.length);
}

// Update selected employee info in export modal
function updateExportSelectedEmployeeInfo() {
  const selectedEmployeeExportInfo = document.getElementById(
    "selectedEmployeeExportInfo"
  );
  const selectedEmployeeExportDetails = document.getElementById(
    "selectedEmployeeExportDetails"
  );
  if (!selectedEmployeeExportInfo || !selectedEmployeeExportDetails) return;

  let selectedRows = [];
  if (currentView === "raw") {
    selectedRows = selectedRawTimeLogEmployees;
  } else if (currentView === "summary") {
    selectedRows = selectedSummaryEmployees;
  }

  if (
    (currentView === "raw" || currentView === "summary") &&
    selectedRows.length > 0
  ) {
    selectedEmployeeExportInfo.classList.remove("hidden");
    const uniqueEmployees = [];
    const seenIds = new Set();
    selectedRows.forEach((row) => {
      const empId = row["Employee ID"];
      if (!seenIds.has(empId)) {
        seenIds.add(empId);
        uniqueEmployees.push({
          id: empId,
          firstName: row["First Name"],
          lastName: row["Last Name"],
          department: row["Department"],
        });
      }
    });
    if (uniqueEmployees.length === 1) {
      const emp = uniqueEmployees[0];
      selectedEmployeeExportDetails.innerHTML = `<div class="font-medium">${
        emp.firstName
      } ${emp.lastName}</div><div class="text-gray-600">ID: ${
        emp.id
      } | Department: ${
        emp.department || "N/A"
      }</div><div class="text-xs text-gray-500 mt-1">${
        selectedRows.length
      } record(s) selected</div>`;
    } else {
      selectedEmployeeExportDetails.innerHTML = `<div class="font-medium">${
        uniqueEmployees.length
      } employees selected</div><div class="text-xs text-gray-500 mt-1">${
        selectedRows.length
      } total record(s) selected</div><div class="text-xs text-gray-400 mt-1">${uniqueEmployees
        .slice(0, 3)
        .map((e) => `${e.firstName} ${e.lastName}`)
        .join(", ")}${
        uniqueEmployees.length > 3
          ? ` and ${uniqueEmployees.length - 3} more...`
          : ""
      }</div>`;
    }
  } else {
    selectedEmployeeExportInfo.classList.add("hidden");
    selectedEmployeeExportDetails.innerHTML = "No employee selected";
  }
}

// Update selected employees for Add Time Logs tab
function updateSelectedEmployeesForTimeLog() {
  selectedEmployees = gridApi.getSelectedRows();
  const addTimeLogButtonContainer = document.getElementById(
    "addTimeLogButtonContainer"
  );
  if (currentView === "addTimeLogs") {
    addTimeLogButtonContainer.classList.remove("hidden");
    if (selectedEmployees.length === 1)
      updateSelectedEmployeeInfo(selectedEmployees[0]);
  } else {
    addTimeLogButtonContainer.classList.add("hidden");
  }
}

function updateSelectedEmployeeInfo(employee) {
  const selectedEmployeeInfo = document.getElementById("selectedEmployeeInfo");
  if (selectedEmployeeInfo) {
    selectedEmployeeInfo.innerHTML = `<div class="font-medium">${
      employee["First Name"]
    } ${employee["Last Name"]}</div><div class="text-gray-600">ID: ${
      employee["Employee ID"]
    } | Department: ${employee["Department"] || "N/A"}</div>`;
  }
}

// Get employee's official time
async function getEmployeeOfficialTime(employeeId) {
  try {
    const { data, error } = await supabaseClient
      .from("employees")
      .select(
        `official_time_id, official_time!inner (official_time_id, start_time, end_time)`
      )
      .eq("emp_id", employeeId)
      .single();
    if (error || !data?.official_time)
      return { startTime: "08:00:00", endTime: "17:00:00" };
    return {
      startTime: data.official_time.start_time,
      endTime: data.official_time.end_time,
    };
  } catch (e) {
    return { startTime: "08:00:00", endTime: "17:00:00" };
  }
}

// Calculate late and undertime
function calculateTimeAdjustments(
  timeIn,
  timeOut,
  officialStartTime,
  officialEndTime,
  logDate
) {
  if (!timeIn) return { lateMinutes: 0, undertimeMinutes: 0, status: "Absent" };
  const timeInDate = new Date(timeIn);
  const officialStartDate = new Date(`${logDate}T${officialStartTime}`);
  const officialEndDate = new Date(`${logDate}T${officialEndTime}`);
  let lateMinutes = 0,
    undertimeMinutes = 0,
    status = "Present";
  if (timeInDate > officialStartDate)
    lateMinutes = Math.round((timeInDate - officialStartDate) / (1000 * 60));
  if (timeOut) {
    const timeOutDate = new Date(timeOut);
    if (timeOutDate < officialEndDate)
      undertimeMinutes = Math.round(
        (officialEndDate - timeOutDate) / (1000 * 60)
      );
  } else {
    const afternoonDuration = Math.round(
      (officialEndDate - new Date(`${logDate}T12:00:00`)) / (1000 * 60)
    );
    undertimeMinutes = afternoonDuration > 0 ? afternoonDuration : 240;
  }
  if (!timeIn) status = "Absent";
  else if (!timeOut) status = "Undertime";
  else if (lateMinutes > 0 && undertimeMinutes > 0) status = "Late/Undertime";
  else if (lateMinutes > 0) status = "Late";
  else if (undertimeMinutes > 0) status = "Undertime";
  return {
    lateMinutes: Math.max(0, lateMinutes),
    undertimeMinutes: Math.max(0, undertimeMinutes),
    status,
  };
}

// Save new time log
async function saveNewTimeLog(timeLogData) {
  try {
    const logDate = timeLogData.timeIn.split(" ")[0];
    const selectedDate = new Date(logDate);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate > currentDate)
      throw new Error(`Cannot add time logs for future dates.`);
    const startOfDay = logDate + " 00:00:00",
      endOfDay = logDate + " 23:59:59";
    const { data: existingLogs, error: checkError } = await supabaseClient
      .from("raw_time_logs")
      .select("time_in")
      .eq("emp_id", timeLogData.employeeId)
      .gte("time_in", startOfDay)
      .lte("time_in", endOfDay);
    if (checkError)
      throw new Error(`Failed to check existing logs: ${checkError.message}`);
    if (existingLogs && existingLogs.length > 0)
      throw new Error(`Employee already has a time log for ${logDate}.`);
    const { data: empData } = await supabaseClient
      .from("employees")
      .select("official_time_id")
      .eq("emp_id", timeLogData.employeeId)
      .single();
    const officialTimeId = empData?.official_time_id || 1;
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
        },
      ])
      .select();
    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
}

function createDateWarningElement() {
  const warningElement = document.createElement("div");
  warningElement.id = "dateWarning";
  warningElement.className =
    "text-warning text-sm mt-2 bg-warning/10 p-2 rounded hidden";
  const form = document.getElementById("addTimeLogForm");
  const dateInput = document.getElementById("logDate");
  if (form && dateInput) {
    const dateContainer =
      dateInput.closest(".form-control") || dateInput.parentElement;
    if (dateContainer && dateContainer.parentNode)
      dateContainer.parentNode.insertBefore(
        warningElement,
        dateContainer.nextSibling
      );
    else form.appendChild(warningElement);
  }
  return warningElement;
}

function validateDateSelection(date) {
  const selectedDate = new Date(date);
  const currentDate = new Date();
  selectedDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);
  const warningElement =
    document.getElementById("dateWarning") || createDateWarningElement();
  if (selectedDate > currentDate) {
    warningElement.textContent = `⚠️ Cannot add time logs for future dates.`;
    warningElement.classList.remove("hidden");
    return false;
  }
  warningElement.classList.add("hidden");
  return true;
}

function initializeTimeLogModal() {
  const addTimeLogForm = document.getElementById("addTimeLogForm");
  const logDateInput = document.getElementById("logDate");
  const timeInInput = document.getElementById("timeIn");
  const timeOutInput = document.getElementById("timeOut");
  const lateMinutesInput = document.getElementById("lateMinutes");
  const undertimeMinutesInput = document.getElementById("undertimeMinutes");
  const statusSelect = document.getElementById("logStatus");
  if (!addTimeLogForm || !logDateInput) return;
  const today = new Date().toISOString().split("T")[0];
  logDateInput.max = today;
  logDateInput.value = today;
  timeInInput.value = today + "T08:00";
  timeOutInput.value = today + "T17:00";

  async function autoCalculateTimes() {
    if (selectedEmployees.length !== 1) return;
    const timeIn = timeInInput.value,
      timeOut = timeOutInput.value,
      logDate = logDateInput.value;
    if (!timeIn) {
      lateMinutesInput.value = 0;
      undertimeMinutesInput.value = 0;
      statusSelect.value = "Absent";
      return;
    }
    try {
      const officialTime = await getEmployeeOfficialTime(
        selectedEmployees[0]["Employee ID"]
      );
      const { lateMinutes, undertimeMinutes, status } =
        calculateTimeAdjustments(
          timeIn ? timeIn.replace("T", " ") + ":00" : null,
          timeOut ? timeOut.replace("T", " ") + ":00" : null,
          officialTime.startTime,
          officialTime.endTime,
          logDate
        );
      lateMinutesInput.value = lateMinutes;
      undertimeMinutesInput.value = undertimeMinutes;
      statusSelect.value = status;
    } catch (e) {
      lateMinutesInput.value = 0;
      undertimeMinutesInput.value = 0;
      statusSelect.value = "Present";
    }
  }

  logDateInput.addEventListener("change", async function () {
    const date = this.value;
    if (!validateDateSelection(date)) {
      this.value = today;
      return;
    }
    timeInInput.value = date + "T08:00";
    timeOutInput.value = date + "T17:00";
    await autoCalculateTimes();
  });
  timeInInput.addEventListener("change", autoCalculateTimes);
  timeOutInput.addEventListener("change", autoCalculateTimes);

  addTimeLogForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (selectedEmployees.length !== 1) {
      showWarningAlert("Please select exactly one employee.");
      return;
    }
    try {
      if (!validateDateSelection(logDateInput.value)) {
        showWarningAlert(
          "Cannot add time logs for future dates. Please select today's date or a past date."
        );
        return;
      }
      await autoCalculateTimes();
      const timeLogData = {
        employeeId: selectedEmployees[0]["Employee ID"],
        timeIn: timeInInput.value.replace("T", " ") + ":00",
        timeOut: timeOutInput.value
          ? timeOutInput.value.replace("T", " ") + ":00"
          : null,
        lateMinutes: parseInt(lateMinutesInput.value) || 0,
        undertimeMinutes: parseInt(undertimeMinutesInput.value) || 0,
        status: statusSelect.value,
      };
      await saveNewTimeLog(timeLogData);
      const employee = selectedEmployees[0];
      showSuccessAlert(
        `Time log added successfully for ${employee["First Name"]} ${employee["Last Name"]}!`
      );
      document.getElementById("addTimeLogModal").close();
      if (currentView === "raw") await refreshGridData();
      addTimeLogForm.reset();
      const todayStr = new Date().toISOString().split("T")[0];
      logDateInput.value = todayStr;
      timeInInput.value = todayStr + "T08:00";
      timeOutInput.value = todayStr + "T17:00";
    } catch (error) {
      showErrorAlert(`Failed to add time log: ${error.message}`);
    }
  });
}

async function refreshGridData() {
  if (currentView === "raw") {
    const data = await loadRawTimeLogs();
    currentData = data;
    gridApi.setGridOption("rowData", data);
  }
}

function generateCutoffPeriodsFromDates(dates) {
  const cutoffPeriods = new Set();
  dates.forEach((dateStr) => {
    if (!dateStr) return;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;
      const year = date.getFullYear(),
        month = date.getMonth() + 1,
        day = date.getDate();
      let startDate, endDate;
      if (day <= 15) {
        startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
        endDate = `${year}-${month.toString().padStart(2, "0")}-15`;
      } else {
        const lastDay = new Date(year, month, 0).getDate();
        startDate = `${year}-${month.toString().padStart(2, "0")}-16`;
        endDate = `${year}-${month.toString().padStart(2, "0")}-${lastDay}`;
      }
      cutoffPeriods.add(`${startDate} to ${endDate}`);
    } catch (e) {}
  });
  return Array.from(cutoffPeriods).sort();
}

function isDateInCutoffPeriod(dateStr, cutoffPeriod) {
  if (!dateStr || !cutoffPeriod) return false;
  try {
    const [startStr, endStr] = cutoffPeriod.split(" to ");
    const date = new Date(dateStr),
      startDate = new Date(startStr),
      endDate = new Date(endStr);
    return date >= startDate && date <= endDate;
  } catch (e) {
    return false;
  }
}

function toggleFilterType() {
  const filterType = document.querySelector(
    'input[name="filterType"]:checked'
  )?.value;
  const cutoffContainer = document.getElementById("cutoffFilterContainer");
  const dateContainer = document.getElementById("dateFilterContainer");
  if (filterType === "cutoff") {
    cutoffContainer?.classList.remove("hidden");
    dateContainer?.classList.add("hidden");
  } else if (filterType === "date") {
    cutoffContainer?.classList.add("hidden");
    dateContainer?.classList.remove("hidden");
  }
}

function isDateInRange(dateStr, startDate, endDate) {
  if (!dateStr || !startDate || !endDate) return false;
  try {
    const date = new Date(dateStr),
      start = new Date(startDate),
      end = new Date(endDate);
    return date >= start && date <= end;
  } catch (e) {
    return false;
  }
}

// Main Export Function
function exportAttendanceData() {
  const departmentFilter =
    document.getElementById("csvDepartmentFilter")?.value || "all";
  const exportFormat =
    document.querySelector('input[name="exportFormat"]:checked')?.value ||
    "csv";
  const exportSelectedOnly =
    document.getElementById("exportSelectedOnly")?.checked || false;
  let cutoffFilter = "all",
    startDate = null,
    endDate = null,
    filterLabel = "All";

  // For Summary view, cutoff is the main filter
  if (currentView === "summary") {
    cutoffFilter = document.getElementById("csvCutoffFilter")?.value || "all";
    filterLabel =
      cutoffFilter === "all"
        ? "All_Cutoff"
        : cutoffFilter.replace(/[^a-zA-Z0-9]/g, "_");
  } else if (currentView === "raw") {
    const filterType =
      document.querySelector('input[name="filterType"]:checked')?.value ||
      "cutoff";
    if (filterType === "cutoff") {
      cutoffFilter = document.getElementById("csvCutoffFilter")?.value || "all";
      filterLabel = cutoffFilter === "all" ? "All_Cutoff" : cutoffFilter;
    } else if (filterType === "date") {
      startDate = document.getElementById("csvStartDate")?.value;
      endDate = document.getElementById("csvEndDate")?.value;
      if (!startDate || !endDate) {
        showWarningAlert("Please select both start and end dates.");
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        showWarningAlert("Start date cannot be after end date.");
        return;
      }
      filterLabel = `${startDate}_to_${endDate}`;
    }
  }

  let filteredData = currentData;
  let selectedRows =
    currentView === "raw"
      ? selectedRawTimeLogEmployees
      : currentView === "summary"
      ? selectedSummaryEmployees
      : [];

  // If exporting selected employees only
  if (exportSelectedOnly && selectedRows.length > 0) {
    const selectedEmployeeIds = new Set(
      selectedRows.map((row) => row["Employee ID"])
    );
    filteredData = filteredData.filter((row) =>
      selectedEmployeeIds.has(row["Employee ID"])
    );
    console.log(
      `📋 Filtering to ${selectedEmployeeIds.size} selected employee(s), ${filteredData.length} records`
    );
  }

  // Apply cutoff/date filters
  if (currentView === "raw") {
    const filterType =
      document.querySelector('input[name="filterType"]:checked')?.value ||
      "cutoff";
    if (filterType === "cutoff" && cutoffFilter !== "all") {
      filteredData = filteredData.filter((row) =>
        isDateInCutoffPeriod(row["Date"], cutoffFilter)
      );
    } else if (filterType === "date" && startDate && endDate) {
      filteredData = filteredData.filter((row) =>
        isDateInRange(row["Date"], startDate, endDate)
      );
    }
  } else if (currentView === "summary" && cutoffFilter !== "all") {
    filteredData = filteredData.filter((row) => {
      const rowCutoff =
        row["Cutoff Period"] ||
        row["Cutoff ID"] ||
        row.cutoff_period ||
        row.cutoff_id;
      return (
        rowCutoff === cutoffFilter || String(row["Cutoff ID"]) === cutoffFilter
      );
    });
  }

  // Apply department filter
  if (departmentFilter !== "all") {
    filteredData = filteredData.filter(
      (row) =>
        (row["Department"] || row.department || row.dept) === departmentFilter
    );
  }

  if (filteredData.length === 0) {
    const displayLabel = filterLabel.replace(/_/g, " ");
    showWarningAlert(
      `No data to export.\n\nFilters:\n• Period: ${displayLabel}\n• Department: ${departmentFilter}${
        exportSelectedOnly ? "\n• Selected employees only" : ""
      }\n\nTotal records: ${currentData.length}`
    );
    return;
  }

  // Generate filename suffix for selected employees
  let employeeSuffix = "";
  if (exportSelectedOnly && selectedRows.length > 0) {
    const uniqueEmployees = [];
    const seenIds = new Set();
    selectedRows.forEach((row) => {
      if (!seenIds.has(row["Employee ID"])) {
        seenIds.add(row["Employee ID"]);
        uniqueEmployees.push(row);
      }
    });
    if (uniqueEmployees.length === 1) {
      employeeSuffix =
        `_${uniqueEmployees[0]["Last Name"]}_${uniqueEmployees[0]["First Name"]}`.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        );
    } else {
      employeeSuffix = `_${uniqueEmployees.length}_Employees`;
    }
  }

  try {
    switch (exportFormat) {
      case "csv":
        generateCSVFile(
          filteredData,
          filterLabel,
          departmentFilter,
          employeeSuffix
        );
        break;
      case "pdf":
        generatePDFFile(
          filteredData,
          filterLabel,
          departmentFilter,
          employeeSuffix
        );
        break;
      case "both":
        generateCSVFile(
          filteredData,
          filterLabel,
          departmentFilter,
          employeeSuffix
        );
        generatePDFFile(
          filteredData,
          filterLabel,
          departmentFilter,
          employeeSuffix
        );
        break;
      default:
        generateCSVFile(
          filteredData,
          filterLabel,
          departmentFilter,
          employeeSuffix
        );
    }
    document.getElementById("generateCSV").close();
  } catch (error) {
    showErrorAlert(`Export failed: ${error.message}`);
  }
}

function generateCSVFile(
  data,
  cutoffFilter,
  departmentFilter,
  employeeSuffix = ""
) {
  const columns = gridApi.getColumnDefs();
  const headers = columns
    .map((col) => col.field || col.headerName)
    .filter(Boolean);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          const stringValue = String(value);
          return stringValue.includes(",") || stringValue.includes('"')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const viewName =
    currentView === "raw"
      ? "Raw_Time_Logs"
      : currentView === "addTimeLogs"
      ? "All_Employees"
      : "Attendance_Summary";
  const cutoffLabel =
    cutoffFilter === "all"
      ? "All_Cutoff"
      : cutoffFilter.replace(/[^a-zA-Z0-9]/g, "_");
  const deptLabel =
    departmentFilter === "all"
      ? "All_Departments"
      : departmentFilter.replace(/[^a-zA-Z0-9]/g, "_");
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `${viewName}_${cutoffLabel}_${deptLabel}${employeeSuffix}_${timestamp}.csv`;

  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  console.log(`✅ CSV: ${filename}`);
}

function generatePDFFile(
  data,
  cutoffFilter,
  departmentFilter,
  employeeSuffix = ""
) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const columns = gridApi.getColumnDefs();
    const visibleColumns = columns.filter((col) => !col.hide);
    const headers = visibleColumns
      .map((col) => col.headerName || col.field)
      .filter(Boolean);

    const viewName =
      currentView === "raw"
        ? "Raw Time Logs Report"
        : currentView === "addTimeLogs"
        ? "All Employees Report"
        : "Attendance Summary Report";
    const cutoffLabel =
      cutoffFilter === "all"
        ? "All Cutoff Periods"
        : cutoffFilter.replace(/_/g, " ");
    const deptLabel =
      departmentFilter === "all" ? "All Departments" : departmentFilter;

    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text(viewName, 14, 20);
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    const formattedCutoffLabel = cutoffLabel.replace(
      /(\d{4}) (\d{2}) (\d{2})/g,
      "$1-$2-$3"
    );
    doc.text(`Cutoff Period: ${formattedCutoffLabel}`, 14, 30);
    doc.text(`Department: ${deptLabel}`, 14, 37);
    let yPos = 44;
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, yPos);
    yPos += 7;
    doc.text(`Total Records: ${data.length}`, 14, yPos);

    const displayData = data.slice(0, 50);
    const tableData = displayData.map((row) =>
      visibleColumns.map((col) => {
        const fieldName = col.field || col.headerName;
        let value = row[fieldName];

        // Check if value is 0 or "0" for numeric fields
        if (
          (value === 0 || value === "0") &&
          (fieldName === "Late (m)" ||
            fieldName === "Late Minutes" ||
            fieldName === "Undertime" ||
            fieldName === "Undertime Minutes" ||
            fieldName === "Regular Hours" ||
            fieldName === "Overtime Hours" ||
            fieldName === "Leave W/ Pay" ||
            fieldName === "Leave W/O Pay" ||
            fieldName === "Absences")
        ) {
          return "-";
        }

        // If value is null, undefined, or empty string
        if (value === null || value === undefined || value === "") return "-";

        const stringValue = String(value);

        // Format datetime
        if (
          typeof value === "string" &&
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)
        )
          return value.replace("T", " ").substring(0, 16);

        // Format status
        if (fieldName === "Status")
          return stringValue
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");

        // Format department
        if (fieldName === "Department") {
          const dept = stringValue.toLowerCase();
          if (dept.includes("information") || dept.includes("ech"))
            return "Information Technology";
        }

        return stringValue;
      })
    );

    let columnStyles = {};
    if (currentView === "raw")
      columnStyles = {
        0: { cellWidth: 20 },
        1: { cellWidth: 20 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
        5: { cellWidth: 25 },
        6: { cellWidth: 25 },
        7: { cellWidth: 25 },
        8: { cellWidth: 15 },
        9: { cellWidth: 18 },
        10: { cellWidth: 20 },
        11: { cellWidth: 30 },
      };
    else if (currentView === "addTimeLogs")
      columnStyles = {
        0: { cellWidth: 20 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 35 },
        5: { cellWidth: 35 },
      };
    else
      columnStyles = {
        0: { cellWidth: 15 },
        1: { cellWidth: 20 },
        2: { cellWidth: 20 },
        3: { cellWidth: 15 },
        4: { cellWidth: 20 },
        5: { cellWidth: 18 },
        6: { cellWidth: 18 },
        7: { cellWidth: 15 },
        8: { cellWidth: 15 },
        9: { cellWidth: 15 },
        10: { cellWidth: 15 },
        11: { cellWidth: 15 },
        12: { cellWidth: 25 },
        13: { cellWidth: 25 },
      };

    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: yPos + 10,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: "linebreak",
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles,
      margin: { top: 60, right: 10, bottom: 20, left: 10 },
      pageBreak: "auto",
      tableWidth: "wrap",
      theme: "grid",
    });

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
    if (data.length > 50) {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Note: Showing first 50 of ${data.length} records.`,
        14,
        doc.lastAutoTable.finalY + 10
      );
    }

    const viewNameFile =
      currentView === "raw"
        ? "Raw_Time_Logs"
        : currentView === "addTimeLogs"
        ? "All_Employees"
        : "Attendance_Summary";
    const filename = `${viewNameFile}_${
      cutoffFilter === "all"
        ? "All_Cutoff"
        : cutoffFilter.replace(/[^a-zA-Z0-9]/g, "_")
    }_${
      departmentFilter === "all"
        ? "All_Departments"
        : departmentFilter.replace(/[^a-zA-Z0-9]/g, "_")
    }${employeeSuffix}_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);
    console.log(`✅ PDF: ${filename}`);
  } catch (error) {
    showErrorAlert(`PDF error: ${error.message}`);
  }
}

function populateCSVModalDropdowns() {
  const cutoffSelect = document.getElementById("csvCutoffFilter");
  const departmentSelect = document.getElementById("csvDepartmentFilter");
  const filterTypeContainer = document.getElementById("filterTypeContainer");
  const selectedEmployeeExportInfo = document.getElementById(
    "selectedEmployeeExportInfo"
  );
  if (!cutoffSelect || !departmentSelect) return;

  // Show filter type only for Raw view, hide for Summary (Summary uses cutoff only)
  if (currentView === "raw") {
    filterTypeContainer?.classList.remove("hidden");
  } else {
    filterTypeContainer?.classList.add("hidden");
  }

  // Update selected employee info for both Raw and Summary views
  if (currentView === "raw" || currentView === "summary") {
    updateExportSelectedEmployeeInfo();
  } else {
    selectedEmployeeExportInfo?.classList.add("hidden");
  }

  cutoffSelect.innerHTML = "";
  departmentSelect.innerHTML = "";
  cutoffSelect.appendChild(
    Object.assign(document.createElement("option"), {
      value: "all",
      textContent: "All Cutoff Periods",
    })
  );
  departmentSelect.appendChild(
    Object.assign(document.createElement("option"), {
      value: "all",
      textContent: "All Departments",
    })
  );

  if (currentView === "raw") {
    const dates = currentData.map((row) => row["Date"]).filter(Boolean);
    const cutoffPeriods = generateCutoffPeriodsFromDates(dates);
    if (cutoffPeriods.length > 0)
      cutoffPeriods.forEach((period) =>
        cutoffSelect.appendChild(
          Object.assign(document.createElement("option"), {
            value: period,
            textContent: period,
          })
        )
      );
    const today = new Date();
    const startDateInput = document.getElementById("csvStartDate"),
      endDateInput = document.getElementById("csvEndDate");
    if (startDateInput && endDateInput) {
      startDateInput.value = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      endDateInput.value = today.toISOString().split("T")[0];
    }
  } else if (currentView === "summary") {
    // For Summary, populate cutoff periods from the data
    const uniqueCutoffs = new Set();
    currentData.forEach((row) => {
      const cutoff =
        row["Cutoff Period"] || row["Cutoff ID"] || row.cutoff_period;
      if (cutoff) uniqueCutoffs.add(cutoff);
    });
    Array.from(uniqueCutoffs)
      .sort()
      .forEach((period) =>
        cutoffSelect.appendChild(
          Object.assign(document.createElement("option"), {
            value: period,
            textContent: period,
          })
        )
      );
  }

  // Populate departments
  const uniqueDepartments = new Set();
  currentData.forEach((row) => {
    const dept = row["Department"] || row.department;
    if (dept) uniqueDepartments.add(dept);
  });
  if (uniqueDepartments.size > 0)
    Array.from(uniqueDepartments)
      .sort()
      .forEach((dept) =>
        departmentSelect.appendChild(
          Object.assign(document.createElement("option"), {
            value: dept,
            textContent: dept,
          })
        )
      );
  else
    [
      "Information Technology",
      "Human Resources",
      "Accounting",
      "Sales",
    ].forEach((dept) =>
      departmentSelect.appendChild(
        Object.assign(document.createElement("option"), {
          value: dept,
          textContent: dept,
        })
      )
    );

  toggleFilterType();
}

// Grid initialization
let currentData = [];
let currentView = "raw";

const gridOptions = {
  columnDefs: rawTimeLogsColumns,
  rowData: [],
  domLayout: "normal",
  rowSelection: { mode: "multiRow", headerCheckbox: true, pinned: "left" },
  defaultColDef: { filter: true, sortable: true, cellClass: "text-sm" },
  suppressFieldDotNotation: true,
  enableCellTextSelection: true,
  overlayNoRowsTemplate: "<span style='padding:10px;'></span>",
  onCellValueChanged: (event) => {
    saveEditedRow(event.data, event.colDef.field);
  },
  onSelectionChanged: () => {
    if (currentView === "addTimeLogs") updateSelectedEmployeesForTimeLog();
    else if (currentView === "raw") updateSelectedEmployeesForRawTimeLogs();
    else if (currentView === "summary") updateSelectedEmployeesForSummary();
  },
};

export const gridApi = agGrid.createGrid(gridDiv, gridOptions);
window.gridApi = gridApi;

async function loadRawTimeLogs() {
  try {
    const data = await getEmployeeAttendanceTable();
    console.log("📊 Raw time logs:", data.length);
    return data;
  } catch (e) {
    console.error("❌ Failed to load raw time logs:", e);
    return [];
  }
}

async function loadAttendanceSummary() {
  try {
    const cutoffIds = [1, 2];
    let allData = [];
    for (const cutoffId of cutoffIds) {
      try {
        const { data } = await getPayrollSummaryReport(cutoffId);
        allData = allData.concat(data);
      } catch (err) {
        console.warn(`⚠️ Could not load cutoff ${cutoffId}:`, err);
      }
    }
    return allData;
  } catch (e) {
    console.error("❌ Failed to load summary:", e);
    return [];
  }
}

async function loadAllEmployees() {
  try {
    const { data, error } = await supabaseClient
      .from("employee_full_details")
      .select(
        `emp_id, first_name, middle_name, last_name, position_name, department_name`
      )
      .order("last_name", { ascending: true });
    if (error) return [];
    return data.map((emp) => ({
      "Employee ID": emp.emp_id,
      "First Name": emp.first_name,
      "Middle Name": emp.middle_name,
      "Last Name": emp.last_name,
      Position: emp.position_name,
      Department: emp.department_name,
    }));
  } catch (e) {
    return [];
  }
}

async function initializeGrid() {
  const rawData = await loadRawTimeLogs();
  currentData = rawData;
  gridApi.setGridOption("rowData", rawData);
  console.log("✅ Raw Time Logs displayed");
  initializeTimeLogModal();
}

initializeGrid();

export async function switchView(view) {
  currentView = view;
  const generateButtonsContainer = document.getElementById(
    "generateButtonsContainer"
  );
  const addTimeLogButtonContainer = document.getElementById(
    "addTimeLogButtonContainer"
  );
  const cutoffContainer = document.getElementById("cutoffPeriodContainer");

  gridApi.resetColumnState();
  selectedEmployees = [];
  selectedRawTimeLogEmployees = [];
  selectedSummaryEmployees = [];

  if (view === "raw") {
    cutoffContainer?.classList.add("hidden");
    generateButtonsContainer?.classList.remove("hidden");
    addTimeLogButtonContainer?.classList.add("hidden");
    const data = await loadRawTimeLogs();
    currentData = data;
    gridApi.setGridOption("columnDefs", rawTimeLogsColumns);
    gridApi.setGridOption("rowData", data);
    gridApi.setGridOption("rowSelection", {
      mode: "multiRow",
      headerCheckbox: true,
    });
    console.log("✅ Switched to Raw Time Logs");
  } else if (view === "summary") {
    cutoffContainer?.classList.remove("hidden");
    generateButtonsContainer?.classList.remove("hidden");
    addTimeLogButtonContainer?.classList.add("hidden");
    const data = await loadAttendanceSummary();
    currentData = data;
    populateCutoffDropdown(data);
    gridApi.setGridOption("columnDefs", summaryColumns);
    gridApi.setGridOption("rowData", data);
    gridApi.setGridOption("rowSelection", {
      mode: "multiRow",
      headerCheckbox: true,
    });
    console.log("✅ Switched to Attendance Summary with multi-select");
  } else if (view === "addTimeLogs") {
    cutoffContainer?.classList.add("hidden");
    generateButtonsContainer?.classList.add("hidden");
    addTimeLogButtonContainer?.classList.remove("hidden");
    const data = await loadAllEmployees();
    currentData = data;
    gridApi.setGridOption("columnDefs", addTimeLogsColumns);
    gridApi.setGridOption("rowData", data);
    gridApi.setGridOption("rowSelection", { mode: "singleRow" });
    console.log("✅ Switched to Add Time Logs");
  }

  gridApi.setFilterModel(null);
  gridApi.setGridOption("quickFilterText", "");
  gridApi.deselectAll();
  if (view === "addTimeLogs") setTimeout(() => gridApi.sizeColumnsToFit(), 100);
}

function populateCutoffDropdown(data) {
  const cutoffSelect = document.getElementById("cutoffFilter");
  if (!cutoffSelect) return;
  cutoffSelect.innerHTML = "";
  cutoffSelect.appendChild(
    Object.assign(document.createElement("option"), {
      value: "",
      textContent: "All Cutoff",
    })
  );
  const uniquePeriods = new Set();
  data.forEach((row) => {
    const period = row.cutoff_period || row["Cutoff Period"];
    if (period) uniquePeriods.add(period);
  });
  Array.from(uniquePeriods)
    .sort()
    .forEach((period) =>
      cutoffSelect.appendChild(
        Object.assign(document.createElement("option"), {
          value: period,
          textContent: period,
        })
      )
    );
}

export function applyDataFilter(searchValue, cutoffValue) {
  const search = (searchValue || "").trim(),
    cutoff = (cutoffValue || "").trim();
  gridApi.setGridOption("quickFilterText", search);
  if (cutoff === "" || cutoff === "All Cutoff")
    gridApi.setColumnFilterModel("Cutoff Period", null);
  else
    gridApi.setColumnFilterModel("Cutoff Period", {
      filterType: "text",
      type: "equals",
      filter: cutoff,
    });
  gridApi.onFilterChanged();
}

// DaisyUI Toast Alert Functions
function showToastAlert(message, type = "info", duration = 4000) {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.className =
      "fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col gap-2";
    document.body.appendChild(toastContainer);
  }

  // Create the alert element
  const alertEl = document.createElement("div");

  // Set colors based on type - using DaisyUI alert colors
  let alertClass = "alert-success";
  switch (type) {
    case "success":
      alertClass = "alert-success";
      break;
    case "error":
      alertClass = "alert-error";
      break;
    case "warning":
      alertClass = "alert-warning";
      break;
    default:
      alertClass = "alert-info";
  }

  alertEl.className = `alert ${alertClass} shadow-lg rounded-lg px-4 py-3 flex items-center gap-2 min-w-[400px] animate-fade-in`;
  alertEl.innerHTML = `<span class="text-sm font-medium">${message}</span>`;

  // Add custom animation styles if not already added
  if (!document.getElementById("toastStyles")) {
    const styleEl = document.createElement("style");
    styleEl.id = "toastStyles";
    styleEl.textContent = `
      @keyframes fadeInDown {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeOutUp {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
      }
      .animate-fade-in { animation: fadeInDown 0.3s ease-out; }
      .animate-fade-out { animation: fadeOutUp 0.3s ease-in forwards; }
    `;
    document.head.appendChild(styleEl);
  }

  toastContainer.appendChild(alertEl);

  // Auto remove after duration
  setTimeout(() => {
    alertEl.classList.remove("animate-fade-in");
    alertEl.classList.add("animate-fade-out");
    setTimeout(() => alertEl.remove(), 300);
  }, duration);
}

function showSuccessAlert(message, duration = 4000) {
  showToastAlert(message, "success", duration);
}

function showErrorAlert(message, duration = 5000) {
  showToastAlert(message, "error", duration);
}

function showWarningAlert(message, duration = 4000) {
  showToastAlert(message, "warning", duration);
}

function showInfoAlert(message, duration = 4000) {
  showToastAlert(message, "info", duration);
}

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search");
  const cutoffFilter = document.getElementById("cutoffFilter");
  const filterBtn = document.getElementById("filterBtn");
  const generateCSVBtn = document.getElementById("generateCSVBtn");

  searchInput?.addEventListener("input", () =>
    applyDataFilter(searchInput.value, cutoffFilter?.value)
  );
  cutoffFilter?.addEventListener("change", () =>
    applyDataFilter(searchInput?.value, cutoffFilter.value)
  );
  filterBtn?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (cutoffFilter) cutoffFilter.value = "";
    applyDataFilter("", "");
  });

  document.getElementById("addTimeLogBtn")?.addEventListener("click", () => {
    if (selectedEmployees.length === 1)
      document.getElementById("addTimeLogModal").showModal();
    else showWarningAlert("Please select an employee first from the table.");
  });

  generateCSVBtn?.addEventListener("click", () => {
    populateCSVModalDropdowns();
    document.getElementById("generateCSV").showModal();
  });
  document
    .getElementById("modalGenerateExportBtn")
    ?.addEventListener("click", exportAttendanceData);

  document.querySelectorAll('input[name="exportFormat"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const text = document.getElementById("exportButtonText");
      if (text) {
        if (e.target.value === "csv") text.textContent = "Export CSV";
        else if (e.target.value === "pdf") text.textContent = "Export PDF";
        else text.textContent = "Export Both";
      }
    });
  });

  document
    .querySelectorAll('input[name="filterType"]')
    .forEach((radio) => radio.addEventListener("change", toggleFilterType));
});

window.exportAttendanceData = exportAttendanceData;
console.log("✅ attendance-grid.js loaded successfully");
