// ============================================================================
// Imports
// ============================================================================
import {
  initializeGrid,
  setGridData,
  getSelectedRows,
  deselectAll,
} from "./grid.js";
import { initializeLeaveData } from "./leave-data.js";
import { showGlobalAlert } from "../utils/alerts.js";

// ============================================================================
// Global Variables
// ============================================================================
let currentLeaveData = [];

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener("DOMContentLoaded", async function () {
  initializeGrid();
  await initializeData();
  initializeEventListeners();
  initializeSearch();
});

async function initializeData() {
  try {
    const { employees } = await initializeLeaveData();
    currentLeaveData = employees;
    setGridData(currentLeaveData);
  } catch (error) {
    console.error("Error initializing data:", error);
    showGlobalAlert(
      "error",
      "Error loading employee data. Please refresh the page."
    );
  }
}

async function refreshData() {
  const { employees } = await initializeLeaveData();
  currentLeaveData = employees;
  setGridData(currentLeaveData);
}

// ============================================================================
// Event Listeners
// ============================================================================

// Initialize all event listeners
function initializeEventListeners() {
  // Add leave form
  const addLeaveForm = document.getElementById("addLeaveForm");
  if (addLeaveForm) {
    addLeaveForm.addEventListener("submit", handleAddLeave);
  }

  // CSV Generation button
  const generateCsvBtn = document.getElementById("generateCsvBtn");
  if (generateCsvBtn) {
    generateCsvBtn.addEventListener("click", handleGenerateCSV);
  }

  // PDF Generation button
  const generatePdfBtn = document.getElementById("generatePdfBtn");
  if (generatePdfBtn) {
    generatePdfBtn.addEventListener("click", handleGeneratePDF);
  }

  // View History button (top bar)
  const viewHistoryBtn = document.getElementById("viewHistoryBtn");
  if (viewHistoryBtn) {
    viewHistoryBtn.addEventListener("click", function () {
      const selectedRows = getSelectedRows();
      if (selectedRows.length > 0) {
        const employee = selectedRows[0];
        const employeeId = employee["Employee ID"];
        const employeeName = `${employee["First Name"]} ${
          employee["Middle Initial"] ? employee["Middle Initial"] + " " : ""
        }${employee["Last Name"]}`;
        showLeaveHistory(employeeId, employeeName);
      }
    });
  }

  // Date type radio buttons
  const dateTypeRadios = document.querySelectorAll('input[name="dateType"]');
  dateTypeRadios.forEach((radio) => {
    radio.addEventListener("change", handleDateTypeChange);
  });

  // Date range inputs for automatic duration calculation
  const startDateInput = document.getElementById("startDateInput");
  const endDateInput = document.getElementById("endDateInput");
  if (startDateInput && endDateInput) {
    startDateInput.addEventListener("change", calculateDurationFromRange);
    endDateInput.addEventListener("change", calculateDurationFromRange);
  }

  // View balance buttons (delegated event handling)
  document.addEventListener("click", function (e) {
    // Add leave buttons (delegated event handling)
    if (e.target.classList.contains("add-leave-btn")) {
      const employeeId = e.target.getAttribute("data-employee");
      const employeeName = e.target.getAttribute("data-employee-name");
      openAddLeaveModal(employeeId, employeeName);
    }
  });
}

// Handle date type change (range vs specific)
function handleDateTypeChange(event) {
  const dateType = event.target.value;
  const dateRangeFields = document.getElementById("dateRangeFields");
  const specificDateField = document.getElementById("specificDateField");
  const startDateInput = document.getElementById("startDateInput");
  const endDateInput = document.getElementById("endDateInput");
  const specificDateInput = document.getElementById("specificDateInput");
  const durationInput = document.getElementById("durationInput");

  if (dateType === "range") {
    // Show date range fields
    dateRangeFields.style.display = "grid";
    specificDateField.style.display = "none";

    // Set required attributes
    startDateInput.required = true;
    endDateInput.required = true;
    specificDateInput.required = false;

    // Make duration read-only for range (auto-calculated)
    durationInput.readOnly = true;
    durationInput.classList.add("input-disabled");
    durationInput.placeholder = "Auto-calculated";

    // Clear specific date
    specificDateInput.value = "";

    // Recalculate duration if dates are set
    calculateDurationFromRange();
  } else {
    // Show specific date field
    dateRangeFields.style.display = "none";
    specificDateField.style.display = "block";

    // Set required attributes
    startDateInput.required = false;
    endDateInput.required = false;
    specificDateInput.required = true;

    // Make duration editable for specific date
    durationInput.readOnly = false;
    durationInput.classList.remove("input-disabled");
    durationInput.placeholder = "Number of days";

    // Clear range dates
    startDateInput.value = "";
    endDateInput.value = "";
    durationInput.value = "";
  }
}

// Calculate duration from date range
function calculateDurationFromRange() {
  const startDateInput = document.getElementById("startDateInput");
  const endDateInput = document.getElementById("endDateInput");
  const durationInput = document.getElementById("durationInput");

  if (startDateInput.value && endDateInput.value) {
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);

    // Validate that end date is not before start date
    if (endDate < startDate) {
      endDateInput.setCustomValidity("End date cannot be before start date");
      durationInput.value = "";
      return;
    } else {
      endDateInput.setCustomValidity("");
    }

    // Calculate duration in days (inclusive)
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    durationInput.value = diffDays;
  } else {
    durationInput.value = "";
  }
}

// Handle selection change - no longer needed
window.handleSelectionChange = function () {
  // Empty - no top action buttons anymore
};

// ============================================================================
// Leave Management
// ============================================================================

// Open add leave modal for specific employee
async function openAddLeaveModal(employeeId, employeeName) {
  const employee = currentLeaveData.find(
    (emp) => emp["Employee ID"] === employeeId
  );
  if (!employee) {
    showGlobalAlert("error", "Employee not found.");
    return;
  }

  // Pre-fill form with employee information
  const form = document.getElementById("addLeaveForm");
  form.reset();
  form.dataset.employeeId = employeeId;
  form.dataset.leaveTrackingId = employee["Leave Tracking ID"];

  document.getElementById("modalEmployeeName").textContent = employeeName;
  document.getElementById("modalEmployeeId").textContent = employeeId;

  // Reset date type to range (default) and trigger the change
  document.querySelector(
    'input[name="dateType"][value="range"]'
  ).checked = true;
  handleDateTypeChange({ target: { value: "range" } });

  // Define default allocations (for percentage calculation)
  const defaultBalances = {
    "Vacation Leave": 15,
    "Sick Leave": 15,
    "Emergency Leave": 5,
    "Personal Leave": 3,
    "Maternity Leave": 105,
  };

  // Display current leave balances in modal with progress bars
  const leaveDetails = employee["Leave Details"];

  // Helper function to update leave balance display
  const updateLeaveDisplay = (type, remaining, total) => {
    const used = total - remaining;
    const percentage = (remaining / total) * 100;
    const barColor =
      percentage > 50 ? "#10b981" : percentage > 25 ? "#f59e0b" : "#ef4444";

    return { used, percentage, barColor };
  };

  // Fetch the latest leave balances from database to ensure we have current data
  try {
    const { supabaseClient } = await import("../supabase/supabaseClient.js");
    const { data: freshLeaveData, error } = await supabaseClient
      .from("leave_tracking")
      .select(
        "vacation_leave, sick_leave, emergency_leave, personal_leave, maternity_leave"
      )
      .eq("leave_tracking_id", parseInt(employee["Leave Tracking ID"]))
      .single();

    if (error) throw error;

    if (freshLeaveData) {
      // Update the local data with fresh database values
      leaveDetails["Vacation Leave"] = freshLeaveData.vacation_leave;
      leaveDetails["Sick Leave"] = freshLeaveData.sick_leave;
      leaveDetails["Emergency Leave"] = freshLeaveData.emergency_leave;
      leaveDetails["Personal Leave"] = freshLeaveData.personal_leave;
      leaveDetails["Maternity Leave"] = freshLeaveData.maternity_leave;
    }
  } catch (error) {
    console.error("Error fetching fresh leave data:", error);
  }

  // Vacation Leave
  const vacation = updateLeaveDisplay(
    "Vacation",
    leaveDetails["Vacation Leave"],
    defaultBalances["Vacation Leave"]
  );
  document.getElementById(
    "vacationBalance"
  ).textContent = `${leaveDetails["Vacation Leave"]} days`;
  document.getElementById(
    "vacationBar"
  ).style.width = `${vacation.percentage}%`;
  document.getElementById("vacationBar").style.backgroundColor =
    vacation.barColor;
  document.getElementById(
    "vacationUsed"
  ).textContent = `Used: ${vacation.used} day(s)`;
  document.getElementById(
    "vacationTotal"
  ).textContent = `Total: ${defaultBalances["Vacation Leave"]} day(s)`;

  // Sick Leave
  const sick = updateLeaveDisplay(
    "Sick",
    leaveDetails["Sick Leave"],
    defaultBalances["Sick Leave"]
  );
  document.getElementById(
    "sickBalance"
  ).textContent = `${leaveDetails["Sick Leave"]} days`;
  document.getElementById("sickBar").style.width = `${sick.percentage}%`;
  document.getElementById("sickBar").style.backgroundColor = sick.barColor;
  document.getElementById("sickUsed").textContent = `Used: ${sick.used} day(s)`;
  document.getElementById(
    "sickTotal"
  ).textContent = `Total: ${defaultBalances["Sick Leave"]} day(s)`;

  // Emergency Leave
  const emergency = updateLeaveDisplay(
    "Emergency",
    leaveDetails["Emergency Leave"],
    defaultBalances["Emergency Leave"]
  );
  document.getElementById(
    "emergencyBalance"
  ).textContent = `${leaveDetails["Emergency Leave"]} days`;
  document.getElementById(
    "emergencyBar"
  ).style.width = `${emergency.percentage}%`;
  document.getElementById("emergencyBar").style.backgroundColor =
    emergency.barColor;
  document.getElementById(
    "emergencyUsed"
  ).textContent = `Used: ${emergency.used} day(s)`;
  document.getElementById(
    "emergencyTotal"
  ).textContent = `Total: ${defaultBalances["Emergency Leave"]} day(s)`;

  // Personal Leave
  const personal = updateLeaveDisplay(
    "Personal",
    leaveDetails["Personal Leave"],
    defaultBalances["Personal Leave"]
  );
  document.getElementById(
    "personalBalance"
  ).textContent = `${leaveDetails["Personal Leave"]} days`;
  document.getElementById(
    "personalBar"
  ).style.width = `${personal.percentage}%`;
  document.getElementById("personalBar").style.backgroundColor =
    personal.barColor;
  document.getElementById(
    "personalUsed"
  ).textContent = `Used: ${personal.used} day(s)`;
  document.getElementById(
    "personalTotal"
  ).textContent = `Total: ${defaultBalances["Personal Leave"]} day(s)`;

  // Maternity Leave
  const maternity = updateLeaveDisplay(
    "Maternity",
    leaveDetails["Maternity Leave"],
    defaultBalances["Maternity Leave"]
  );
  document.getElementById(
    "maternityBalance"
  ).textContent = `${leaveDetails["Maternity Leave"]} days`;
  document.getElementById(
    "maternityBar"
  ).style.width = `${maternity.percentage}%`;
  document.getElementById("maternityBar").style.backgroundColor =
    maternity.barColor;
  document.getElementById(
    "maternityUsed"
  ).textContent = `Used: ${maternity.used} day(s)`;
  document.getElementById(
    "maternityTotal"
  ).textContent = `Total: ${defaultBalances["Maternity Leave"]} day(s)`;

  document.getElementById("addLeaveModal").showModal();
}

// Add new leave record
async function handleAddLeave(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  const employeeId = form.dataset.employeeId;
  const leaveTrackingId = form.dataset.leaveTrackingId;
  const leaveType = formData.get("leaveType");
  const duration = parseInt(formData.get("duration"));
  const paidOption = formData.get("paid");
  // Convert to boolean: 'Yes' -> true, 'No' -> false, null/empty -> null
  const isPaid =
    paidOption === "Yes" ? true : paidOption === "No" ? false : null;

  // Get date type
  const dateType = formData.get("dateType");
  let startDate, endDate;

  if (dateType === "range") {
    // Date range mode
    const startDateStr = formData.get("startDate");
    const endDateStr = formData.get("endDate");

    if (!startDateStr || !endDateStr) {
      showGlobalAlert("error", "Please select both start and end dates.");
      return;
    }

    startDate = startDateStr;
    endDate = endDateStr;
  } else {
    // Specific date mode
    const specificDateStr = formData.get("specificDate");

    if (!specificDateStr) {
      showGlobalAlert("error", "Please select a leave date.");
      return;
    }

    if (!duration || duration < 1) {
      showGlobalAlert("error", "Please enter a valid duration.");
      return;
    }

    // Calculate end date from start date and duration
    const leaveStart = new Date(specificDateStr);
    const leaveEnd = new Date(leaveStart);
    leaveEnd.setDate(leaveEnd.getDate() + duration - 1);

    startDate = specificDateStr;
    endDate = leaveEnd.toISOString().split("T")[0];
  }

  // Validate inputs
  if (
    !employeeId ||
    !leaveType ||
    !duration ||
    !startDate ||
    paidOption === "" ||
    paidOption === null
  ) {
    showGlobalAlert("error", "Please fill in all required fields.");
    return;
  }

  // Find employee and check leave balance
  const employee = currentLeaveData.find(
    (emp) => emp["Employee ID"] === employeeId
  );
  if (!employee) {
    showGlobalAlert("error", "Employee not found.");
    return;
  }

  const leaveDetails = employee["Leave Details"];
  let leaveColumn = "";
  let currentBalance = 0;

  // Map leave type to database column
  switch (leaveType) {
    case "Vacation Leave":
      leaveColumn = "vacation_leave";
      currentBalance = leaveDetails["Vacation Leave"];
      break;
    case "Sick Leave":
      leaveColumn = "sick_leave";
      currentBalance = leaveDetails["Sick Leave"];
      break;
    case "Emergency Leave":
      leaveColumn = "emergency_leave";
      currentBalance = leaveDetails["Emergency Leave"];
      break;
    case "Personal Leave":
      leaveColumn = "personal_leave";
      currentBalance = leaveDetails["Personal Leave"];
      break;
    case "Maternity Leave":
      leaveColumn = "maternity_leave";
      currentBalance = leaveDetails["Maternity Leave"];
      break;
    default:
      showGlobalAlert("error", "Invalid leave type.");
      return;
  }

  // Check if employee has enough leave balance
  if (currentBalance < duration) {
    showGlobalAlert(
      "error",
      `Insufficient ${leaveType} balance. Current balance: ${currentBalance} day(s).`
    );
    return;
  }

  try {
    const { supabaseClient } = await import("../supabase/supabaseClient.js");

    // Convert dates to proper format
    const leaveStart = new Date(startDate);
    const leaveEnd = new Date(endDate);

    // Insert leave record into leave_management
    const { data: leaveData, error: leaveError } = await supabaseClient
      .from("leave_management")
      .insert({
        emp_id: parseInt(employeeId),
        leave_type: leaveType,
        leave_start: leaveStart.toISOString(),
        leave_end: leaveEnd.toISOString(),
        is_paid: isPaid,
      })
      .select()
      .single();

    if (leaveError) throw leaveError;

    // Update leave_tracking table - deduct the leave days
    const newBalance = currentBalance - duration;
    const updateData = {};
    updateData[leaveColumn] = newBalance;

    const { error: trackingError } = await supabaseClient
      .from("leave_tracking")
      .update(updateData)
      .eq("leave_tracking_id", parseInt(leaveTrackingId));

    if (trackingError) throw trackingError;

    // Update local data immediately to reflect the change
    const employeeIndex = currentLeaveData.findIndex(
      (emp) => emp["Employee ID"] === employeeId
    );
    if (employeeIndex !== -1) {
      // Map the leaveType to the display name in Leave Details
      let leaveDetailKey = "";
      switch (leaveType) {
        case "Vacation Leave":
          leaveDetailKey = "Vacation Leave";
          break;
        case "Sick Leave":
          leaveDetailKey = "Sick Leave";
          break;
        case "Emergency Leave":
          leaveDetailKey = "Emergency Leave";
          break;
        case "Personal Leave":
          leaveDetailKey = "Personal Leave";
          break;
        case "Maternity Leave":
          leaveDetailKey = "Maternity Leave";
          break;
      }

      // Update the leave balance in the local data
      currentLeaveData[employeeIndex]["Leave Details"][leaveDetailKey] =
        newBalance;
      currentLeaveData[employeeIndex]["Total Leave Balance"] = Object.values(
        currentLeaveData[employeeIndex]["Leave Details"]
      ).reduce((sum, val) => sum + val, 0);
    }

    const dateRangeText =
      dateType === "range"
        ? `from ${new Date(startDate).toLocaleDateString()} to ${new Date(
            endDate
          ).toLocaleDateString()}`
        : `starting ${new Date(startDate).toLocaleDateString()}`;

    // Log to Audit Trail
    try {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      const employeeName =
        employee["Employee Name"] || `Employee ID ${employeeId}`;
      const paidStatus = isPaid ? "Paid" : "Unpaid";

      const description = `Created ${leaveType} request for ${employeeName} - ${duration} day(s) ${dateRangeText} (${paidStatus})`;

      await supabaseClient.from("audit_trail").insert({
        user_id: user?.id,
        action: "create",
        description: description,
        module_affected: "Leave Management",
        record_id: leaveData?.leave_id || null,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error("Error logging audit trail:", auditError);
      // Don't throw error - leave request was successful
    }

    showGlobalAlert(
      "success",
      `Leave request added successfully! ${duration} day(s) of ${leaveType} ${dateRangeText}.`
    );

    // Close modal and refresh data from database
    document.getElementById("addLeaveModal").close();
    form.reset();
    delete form.dataset.employeeId;
    delete form.dataset.leaveTrackingId;

    // Reset date type to range (default)
    document.querySelector(
      'input[name="dateType"][value="range"]'
    ).checked = true;
    handleDateTypeChange({ target: { value: "range" } });

    await refreshData();
  } catch (error) {
    console.error("Error adding leave record:", error);
    showGlobalAlert("error", "Error adding leave record. Please try again.");
  }
}

// Delete selected leave records
async function handleDeleteSelected() {
  const selectedRows = getSelectedRows();

  if (selectedRows.length === 0) {
    showGlobalAlert(
      "error",
      "Please select at least one employee to view leave history."
    );
    return;
  }

  if (selectedRows.length > 1) {
    showGlobalAlert(
      "error",
      "Please select only one employee to view leave history."
    );
    return;
  }

  // Get the selected employee
  const employee = selectedRows[0];
  await showLeaveHistory(
    employee["Employee ID"],
    `${employee["First Name"]} ${
      employee["Middle Initial"] ? employee["Middle Initial"] + " " : ""
    }${employee["Last Name"]}`
  );
}

// Show leave history for an employee
async function showLeaveHistory(employeeId, employeeName, selectedYear = null) {
  try {
    const { supabaseClient } = await import("../supabase/supabaseClient.js");

    // Use selected year or current year
    const year = selectedYear || new Date().getFullYear();
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    // Fetch leave history for this employee for the selected year
    const { data: leaveHistory, error } = await supabaseClient
      .from("leave_management")
      .select("*")
      .eq("emp_id", parseInt(employeeId))
      .gte("leave_start", startOfYear)
      .lte("leave_start", endOfYear)
      .order("leave_start", { ascending: false });

    if (error) throw error;

    // Create modal content
    let historyContent = "";
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate comparison

    if (!leaveHistory || leaveHistory.length === 0) {
      historyContent = `
        <div class="text-center py-8">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-gray-600">No leave records found for ${year}</p>
        </div>
      `;
    } else {
      historyContent = `
        <!-- Legend -->
        <div class="mb-4 p-2 bg-blue-50 border-l-4 border-blue-500 rounded">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <span class="text-xs text-blue-800">Rows highlighted in indicate leaves that are active.</span>
          </div>
        </div>
        
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Leave Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Duration</th>
                <th>Paid/Unpaid</th>
              </tr>
            </thead>
            <tbody>
              ${leaveHistory
                .map((leave) => {
                  const startDate = new Date(leave.leave_start);
                  const endDate = new Date(leave.leave_end);
                  startDate.setHours(0, 0, 0, 0);
                  endDate.setHours(0, 0, 0, 0);

                  const duration =
                    Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) +
                    1;
                  // Display Paid or Unpaid status only
                  const isPaid = leave.is_paid ? "Paid" : "Unpaid";
                  const statusColor = leave.is_paid
                    ? "text-green-600"
                    : "text-orange-600";

                  // Check if leave is currently active
                  const isActive = today >= startDate && today <= endDate;
                  const rowStyle = isActive
                    ? "background-color: rgba(59, 130, 246, 0.15); border-left: 4px solid rgb(59, 130, 246);"
                    : "";

                  return `
                  <tr style="${rowStyle}">
                    <td><span class="font-semibold">${
                      leave.leave_type
                    }</span></td>
                    <td>${startDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}</td>
                    <td>${endDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}</td>
                    <td>${duration} day(s)</td>
                    <td><span class="${statusColor} font-semibold">${isPaid}</span></td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
        
        <div class="mt-4 p-3 bg-base-200 rounded-lg">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-600">Total Leave Days Taken:</span>
              <span class="font-bold ml-2">${leaveHistory.reduce(
                (sum, leave) => {
                  const start = new Date(leave.leave_start);
                  const end = new Date(leave.leave_end);
                  return (
                    sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
                  );
                },
                0
              )} days</span>
            </div>
            <div>
              <span class="text-gray-600">Total Leaves Filed:</span>
              <span class="font-bold ml-2">${leaveHistory.length}</span>
            </div>
          </div>
        </div>
      `;
    }

    const modalContent = `
      <div>
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-2xl font-bold">Leave History</h3>
            <p class="text-gray-600 mt-1">${employeeName} (ID: ${employeeId})</p>
          </div>
          <button onclick="this.closest('dialog').close()" class="btn btn-sm btn-circle btn-ghost">✕</button>
        </div>
        
        <div class="mb-4">
          <label class="label">
            <span class="label-text font-semibold">Select Year:</span>
          </label>
          <select id="yearSelector" class="select select-bordered w-full max-w-xs" onchange="window.changeLeaveHistoryYear('${employeeId}', '${employeeName}', this.value)">
            <option value="2025" ${
              year === 2025 ? "selected" : ""
            }>2025</option>
            <option value="2026" ${
              year === 2026 ? "selected" : ""
            }>2026</option>
            <option value="2027" ${
              year === 2027 ? "selected" : ""
            }>2027</option>
          </select>
        </div>
        
        ${historyContent}
      </div>
    `;

    // Create or get modal
    let modal = document.getElementById("leaveHistoryModal");
    if (!modal) {
      modal = document.createElement("dialog");
      modal.id = "leaveHistoryModal";
      modal.className = "modal";
      modal.innerHTML = `
        <div class="modal-box max-w-4xl">
          <div id="historyModalContent"></div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button>close</button>
        </form>
      `;
      document.body.appendChild(modal);
    }

    // Update modal content
    document.getElementById("historyModalContent").innerHTML = modalContent;

    // Show modal
    modal.showModal();
  } catch (error) {
    console.error("Error fetching leave history:", error);
    showGlobalAlert("error", "Error loading leave history. Please try again.");
  }
}

// Global function to change year in leave history
window.changeLeaveHistoryYear = async function (
  employeeId,
  employeeName,
  year
) {
  await showLeaveHistory(employeeId, employeeName, parseInt(year));
};

// Confirm delete action
async function confirmDelete() {
  document.getElementById("deleteConfirmModal").close();
  showGlobalAlert(
    "info",
    "Delete functionality for leave records coming soon."
  );
}

// ============================================================================
// Leave Balance Modal
// ============================================================================

function showLeaveBalance(employeeId) {
  const employee = currentLeaveData.find(
    (emp) => emp["Employee ID"] === employeeId
  );

  if (!employee) {
    console.error("Employee not found:", employeeId);
    return;
  }

  const leaveDetails = employee["Leave Details"];
  const employeeName = `${employee["First Name"]} ${
    employee["Middle Initial"] ? employee["Middle Initial"] + " " : ""
  }${employee["Last Name"]}`;

  // Define default allocations (for percentage calculation)
  const defaultBalances = {
    "Vacation Leave": 15,
    "Sick Leave": 15,
    "Emergency Leave": 5,
    "Personal Leave": 3,
    "Maternity Leave": 105,
  };

  // Create modal content with leave balances
  const modalContent = `
    <div style="text-align: center;">
      <h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;">Leave Balances</h3>
      <p style="color: #6b7280; margin-bottom: 1.5rem;">${employeeName} (ID: ${employeeId})</p>
      <button onclick="this.closest('dialog').close()" style="position: absolute; top: 1rem; right: 1rem; font-size: 1.5rem; background: none; border: none; cursor: pointer; color: #9ca3af;">×</button>
      
      <div style="margin: 2rem 0; text-align: left;">
        ${Object.entries(leaveDetails)
          .map(([type, remaining]) => {
            const total = defaultBalances[type];
            const used = total - remaining;
            const percentage = (remaining / total) * 100;
            const barColor =
              percentage > 50
                ? "#10b981"
                : percentage > 25
                ? "#f59e0b"
                : "#ef4444";

            return `
            <div style="margin-bottom: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-weight: 600; color: #374151;">${type}</span>
                <span style="font-weight: 700; font-size: 1.125rem; color: ${barColor};">${remaining} days</span>
              </div>
              <div style="width: 100%; height: 8px; background-color: #e5e7eb; border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; background-color: ${barColor}; width: ${percentage}%; transition: width 0.3s ease;"></div>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 0.25rem;">
                <span style="font-size: 0.75rem; color: #6b7280;">Used: ${used} day(s)</span>
                <span style="font-size: 0.75rem; color: #6b7280;">Total: ${total} day(s)</span>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
      
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 0.75rem; border-radius: 4px; text-align: left;">
        <p style="font-size: 0.875rem; color: #1e40af; margin: 0;">
          <strong>Note:</strong> Leave balances are managed per employee. Use "Add Leave" to file a leave request.
        </p>
      </div>
    </div>
  `;

  // Create or get modal
  let modal = document.getElementById("leaveBalanceModal");
  if (!modal) {
    modal = document.createElement("dialog");
    modal.id = "leaveBalanceModal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-box" style="max-width: 600px;">
        <div id="modalContent"></div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    `;
    document.body.appendChild(modal);
  }

  // Update modal content
  document.getElementById("modalContent").innerHTML = modalContent;

  // Show modal
  modal.showModal();
}

// ============================================================================
// Search Functionality
// ============================================================================

function initializeSearch() {
  const searchBar = document.getElementById("searchBar");

  if (searchBar) {
    searchBar.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();

      if (searchTerm === "") {
        setGridData(currentLeaveData);
        return;
      }

      const filteredData = currentLeaveData.filter((item) => {
        return (
          item["Employee ID"]?.toLowerCase().includes(searchTerm) ||
          item["First Name"]?.toLowerCase().includes(searchTerm) ||
          item["Last Name"]?.toLowerCase().includes(searchTerm) ||
          item["Position"]?.toLowerCase().includes(searchTerm) ||
          item["Department"]?.toLowerCase().includes(searchTerm)
        );
      });

      setGridData(filteredData);
    });
  }
}

// ============================================================================
// CSV Export Functionality
// ============================================================================

// Handle CSV generation with filters
function handleGenerateCSV() {
  const department = document.getElementById("csvDepartment").value;
  const position = document.getElementById("csvPosition").value;

  // Filter data based on selections
  let filteredData = currentLeaveData.filter((employee) => {
    // Department filter
    if (department !== "all" && employee.Department !== department)
      return false;

    // Position filter
    if (position !== "all" && employee.Position !== position) return false;

    return true;
  });

  if (filteredData.length === 0) {
    showGlobalAlert("error", "No employees match the selected filters.");
    return;
  }

  generateCSVFile(filteredData);
  document.getElementById("genCSV").close();
}

// Generate and download CSV file
async function generateCSVFile(data) {
  // Define CSV headers
  const headers = [
    "Employee ID",
    "Last Name",
    "First Name",
    "Middle Initial",
    "Position",
    "Department",
    "Vacation Leave Balance",
    "Sick Leave Balance",
    "Emergency Leave Balance",
    "Personal Leave Balance",
    "Maternity Leave Balance",
    "Total Leave Balance",
  ];
  // Convert data to CSV format
  let csvContent = headers.join(",") + "\n";
  data.forEach((employee) => {
    const leaveDetails = employee["Leave Details"];
    const row = [
      employee["Employee ID"] || "",
      employee["Last Name"] || "",
      employee["First Name"] || "",
      employee["Middle Initial"] || "",
      employee["Position"] || "",
      employee["Department"] || "",
      leaveDetails["Vacation Leave"] || 0,
      leaveDetails["Sick Leave"] || 0,
      leaveDetails["Emergency Leave"] || 0,
      leaveDetails["Personal Leave"] || 0,
      leaveDetails["Maternity Leave"] || 0,
      employee["Total Leave Balance"] || 0,
    ].map((value) => {
      value = String(value);
      // Escape commas and quotes in values
      if (value.includes(",") || value.includes('"')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvContent += row.join(",") + "\n";
  });
  // Create and download the file with UTF-8 BOM
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  // Create filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `employee_leave_balances_${timestamp}.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Log to Audit Trail
  try {
    const { supabaseClient } = await import("../supabase/supabaseClient.js");
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    await supabaseClient.from("audit_trail").insert({
      user_id: user?.id,
      action: "view",
      description: `Exported leave balance data to CSV file (${data.length} employee(s))`,
      module_affected: "Leave Management",
      record_id: null,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  } catch (auditError) {
    console.error("Error logging audit trail:", auditError);
    // Don't throw error - CSV export was successful
  }

  showGlobalAlert(
    "success",
    `CSV file "${filename}" generated successfully with ${data.length} employee(s)!`
  );
}
// ============================================================================
// PDF Export Functionality
// ============================================================================

// Handle PDF generation with filters
async function handleGeneratePDF() {
  const department = document.getElementById("pdfDepartment").value;
  const position = document.getElementById("pdfPosition").value;
  // Debug: Check if jsPDF is loaded
  console.log("Checking jsPDF availability...");
  console.log("window.jspdf:", typeof window.jspdf);
  console.log("window.jsPDF:", typeof window.jsPDF);
  console.log("window.jspdf?.jsPDF:", typeof window.jspdf?.jsPDF);
  // Filter data based on selections
  let filteredData = currentLeaveData.filter((employee) => {
    // Department filter
    if (department !== "all" && employee.Department !== department)
      return false;
    // Position filter
    if (position !== "all" && employee.Position !== position) return false;
    return true;
  });
  if (filteredData.length === 0) {
    showGlobalAlert("error", "No employees match the selected filters.");
    return;
  }

  await generatePDFFile(filteredData, department, position);
  document.getElementById("genPDF").close();
}
// Generate and download PDF file
async function generatePDFFile(data, department, position) {
  try {
    // Check if jsPDF is available - try multiple access methods
    let jsPDF;

    if (window.jspdf && window.jspdf.jsPDF) {
      // UMD module loaded correctly
      jsPDF = window.jspdf.jsPDF;
    } else if (window.jsPDF) {
      // Global jsPDF available
      jsPDF = window.jsPDF;
    } else {
      throw new Error("jsPDF library not loaded. Please refresh the page.");
    }

    const doc = new jsPDF("landscape", "mm", "a4");

    // Get current date for header
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Add header
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text(
      "Employee Leave Balance Report",
      doc.internal.pageSize.getWidth() / 2,
      15,
      { align: "center" }
    );

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(
      `Generated on: ${currentDate}`,
      doc.internal.pageSize.getWidth() / 2,
      22,
      { align: "center" }
    );

    // Add filter information
    let filterText = "";
    if (department !== "all") {
      filterText += `Department: ${department}`;
    } else {
      filterText += "Department: All";
    }

    if (position !== "all") {
      filterText += ` | Position: ${position}`;
    } else {
      filterText += " | Position: All";
    }

    doc.setFontSize(9);
    doc.text(filterText, doc.internal.pageSize.getWidth() / 2, 28, {
      align: "center",
    });

    // Prepare table data
    const tableData = data.map((employee) => {
      const leaveDetails = employee["Leave Details"];
      return [
        employee["Employee ID"] || "",
        `${employee["Last Name"]}, ${employee["First Name"]} ${
          employee["Middle Initial"] || ""
        }`.trim(),
        employee["Position"] || "",
        employee["Department"] || "",
        leaveDetails["Vacation Leave"] || 0,
        leaveDetails["Sick Leave"] || 0,
        leaveDetails["Emergency Leave"] || 0,
        leaveDetails["Personal Leave"] || 0,
        leaveDetails["Maternity Leave"] || 0,
        employee["Total Leave Balance"] || 0,
      ];
    });

    // Add table using autoTable
    doc.autoTable({
      startY: 35,
      head: [
        [
          "Employee ID",
          "Name",
          "Position",
          "Department",
          "Vacation",
          "Sick",
          "Emergency",
          "Personal",
          "Maternity",
          "Total",
        ],
      ],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 22 }, // Employee ID
        1: { cellWidth: 45, halign: "left" }, // Name
        2: { cellWidth: 35, halign: "left" }, // Position
        3: { cellWidth: 40, halign: "left" }, // Department
        4: { cellWidth: 17 }, // Vacation
        5: { cellWidth: 17 }, // Sick
        6: { cellWidth: 20 }, // Emergency
        7: { cellWidth: 17 }, // Personal
        8: { cellWidth: 20 }, // Maternity
        9: { cellWidth: 17, fontStyle: "bold" }, // Total
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 35, left: 10, right: 10 },
      didDrawPage: function (data) {
        // Footer with page number
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(128);
        const pageText = `Page ${
          doc.internal.getCurrentPageInfo().pageNumber
        } of ${pageCount}`;
        doc.text(
          pageText,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      },
    });

    // Add summary section after the table
    const finalY = doc.lastAutoTable.finalY || 35;

    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("Summary:", 14, finalY + 10);

    doc.setFont(undefined, "normal");
    doc.setFontSize(9);

    // Calculate totals
    const totalEmployees = data.length;
    const totalVacationLeave = data.reduce(
      (sum, emp) => sum + (emp["Leave Details"]["Vacation Leave"] || 0),
      0
    );
    const totalSickLeave = data.reduce(
      (sum, emp) => sum + (emp["Leave Details"]["Sick Leave"] || 0),
      0
    );
    const totalEmergencyLeave = data.reduce(
      (sum, emp) => sum + (emp["Leave Details"]["Emergency Leave"] || 0),
      0
    );
    const totalPersonalLeave = data.reduce(
      (sum, emp) => sum + (emp["Leave Details"]["Personal Leave"] || 0),
      0
    );
    const totalMaternityLeave = data.reduce(
      (sum, emp) => sum + (emp["Leave Details"]["Maternity Leave"] || 0),
      0
    );
    const totalAllLeaves = data.reduce(
      (sum, emp) => sum + (emp["Total Leave Balance"] || 0),
      0
    );

    doc.text(`Total Employees: ${totalEmployees}`, 14, finalY + 16);
    doc.text(
      `Total Vacation Leave Balance: ${totalVacationLeave} days`,
      14,
      finalY + 22
    );
    doc.text(
      `Total Sick Leave Balance: ${totalSickLeave} days`,
      14,
      finalY + 28
    );
    doc.text(
      `Total Emergency Leave Balance: ${totalEmergencyLeave} days`,
      14,
      finalY + 34
    );
    doc.text(
      `Total Personal Leave Balance: ${totalPersonalLeave} days`,
      14,
      finalY + 40
    );
    doc.text(
      `Total Maternity Leave Balance: ${totalMaternityLeave} days`,
      14,
      finalY + 46
    );
    doc.text(
      `Grand Total Leave Balance: ${totalAllLeaves} days`,
      14,
      finalY + 52
    );

    // Create filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `employee_leave_balances_${timestamp}.pdf`;

    // Save the PDF
    doc.save(filename);

    // Log to Audit Trail
    try {
      const { supabaseClient } = await import("../supabase/supabaseClient.js");
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      // Build filter description
      const filters = [];
      if (department !== "all") {
        filters.push(`Department: ${department}`);
      }
      if (position !== "all") {
        filters.push(`Position: ${position}`);
      }

      const filterDescription =
        filters.length > 0 ? ` with filters: ${filters.join(", ")}` : "";

      await supabaseClient.from("audit_trail").insert({
        user_id: user?.id,
        action: "view",
        description: `Generated leave balance PDF report (${data.length} employee(s))${filterDescription}`,
        module_affected: "Leave Management",
        record_id: null,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error("Error logging audit trail:", auditError);
      // Don't throw error - PDF generation was successful
    }

    showGlobalAlert(
      "success",
      `PDF file "${filename}" generated successfully with ${data.length} employee(s)!`
    );
  } catch (error) {
    console.error("Error generating PDF:", error);
    showGlobalAlert("error", "Error generating PDF. Please try again.");
  }
}
