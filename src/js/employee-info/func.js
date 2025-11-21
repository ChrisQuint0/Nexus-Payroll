// ============================================================================
// Imports
// ============================================================================
import { setGridData, getSelectedRows, deselectAll } from "./grid.js";
import {
  initializeEmployeeData,
  fetchOfficialTimeSchedules,
  fetchDepartments,
  fetchPositions,
} from "./employee-data.js";
import { supabaseClient } from "../supabase/supabaseClient.js";
import { showGlobalAlert } from "../utils/alerts.js";

// ============================================================================
// Enhanced Confirmation Dialog
// ============================================================================

// Custom confirm function using enhanced DaisyUI modal
function showArchiveConfirm(message, title = "Confirm Action") {
  return new Promise((resolve) => {
    const confirmModal = document.getElementById("archiveConfirmModal");
    const confirmTitle = document.getElementById("archiveConfirmTitle");
    const confirmMessage = document.getElementById("archiveConfirmMessage");
    const confirmBtn = document.getElementById("archiveConfirmBtn");
    const cancelBtn = document.getElementById("archiveCancelBtn");

    confirmTitle.textContent = title;
    confirmMessage.textContent = message;

    // Remove any existing event listeners by cloning
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.replaceWith(newConfirmBtn);
    cancelBtn.replaceWith(newCancelBtn);

    // Add event listeners
    newConfirmBtn.addEventListener("click", () => {
      confirmModal.close();
      resolve(true);
    });

    newCancelBtn.addEventListener("click", () => {
      confirmModal.close();
      resolve(false);
    });

    // Also handle backdrop click
    confirmModal.addEventListener(
      "close",
      () => {
        resolve(false);
      },
      { once: true }
    );

    confirmModal.showModal();
  });
}

// ============================================================================
// Global Variables
// ============================================================================
let currentEmployeeData = [];
let currentView = "active";

// ============================================================================
// Initialization
// ============================================================================

// Main initialization on page load
document.addEventListener("DOMContentLoaded", async function () {
  await initializeData();
  initializeEventListeners();
  initializeSearch();
  initializeCSVGeneration();
  await populateFormDropdowns();
  initializeTabSwitching();
});

// Initialize data from Supabase
async function initializeData() {
  try {
    const { employees, schedules } = await initializeEmployeeData();
    currentEmployeeData = employees;
    filterAndDisplayData();
    console.log("Data initialization complete");
  } catch (error) {
    console.error("Error initializing data:", error);
    showGlobalAlert(
      "error",
      "Error loading employee data. Please refresh the page."
    );
  }
}

// Refresh all data from Supabase
async function refreshData() {
  const { employees } = await initializeEmployeeData();
  currentEmployeeData = employees;
  filterAndDisplayData();
}

// ============================================================================
// Event Listeners
// ============================================================================

// Initialize all event listeners
function initializeEventListeners() {
  // Archive button
  const archiveBtn = document.getElementById("archiveBtn");
  if (archiveBtn) {
    archiveBtn.addEventListener("click", handleArchiveSelected);
  }

  // Add new button
  const addNewBtn = document.getElementById("addNewBtn");
  if (addNewBtn) {
    addNewBtn.addEventListener("click", () => {
      document.getElementById("addEmployeeModal").showModal();
      document.getElementById("addEmployeeForm").reset();

      const employeeIdInput = document.querySelector('[name="employeeId"]');
      employeeIdInput.readOnly = false;
      employeeIdInput.style.display = "block";
      employeeIdInput.previousElementSibling.style.display = "block";

      document.querySelector("#addEmployeeModal h3").textContent =
        "Add New Employee";
      document.querySelector(
        '#addEmployeeModal button[type="submit"]'
      ).textContent = "Add Employee";
    });
  }

  // Add employee form
  const addEmployeeForm = document.getElementById("addEmployeeForm");
  if (addEmployeeForm) {
    addEmployeeForm.addEventListener("submit", handleAddEmployee);
  }

  // View more buttons (delegated event handling)
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("view-more-btn")) {
      const employeeId = e.target.getAttribute("data-employee");
      showEmployeeDetails(employeeId);
    }
  });

  initializePositionChange();
  initializeTimeCalculation();
}

// Handle selection change for archive button
window.handleSelectionChange = function () {
  const selectedRows = getSelectedRows();
  const archiveBtn = document.getElementById("archiveBtn");
  if (archiveBtn) {
    archiveBtn.disabled = selectedRows.length === 0;
  }
};

// Reset form when modal is closed
document
  .getElementById("addEmployeeModal")
  .addEventListener("close", function () {
    const form = document.getElementById("addEmployeeForm");
    form.reset();
    delete form.dataset.editingEmployeeId;

    const employeeIdInput = form.querySelector('[name="employeeId"]');
    employeeIdInput.readOnly = false;
    employeeIdInput.style.display = "block";
    employeeIdInput.previousElementSibling.style.display = "block";

    document.querySelector("#addEmployeeModal h3").textContent =
      "Add New Employee";
    document.querySelector(
      '#addEmployeeModal button[type="submit"]'
    ).textContent = "Add Employee";
  });

// Initialize position change events
function initializePositionChange() {
  const positionSelect = document.querySelector('select[name="position"]');
  const rateInput = document.querySelector('input[name="rate"]');

  if (positionSelect && rateInput) {
    positionSelect.addEventListener("change", function () {
      const selectedOption = this.options[this.selectedIndex];
      const salary = selectedOption.getAttribute("data-salary");

      if (salary) {
        const numValue = parseFloat(salary);
        rateInput.value = '₱' + numValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else {
        rateInput.value = "";
      }
    });
  }
}

// Initialize time calculation (auto-calculate end time)
function initializeTimeCalculation() {
  const startTimeInput = document.getElementById("startTime");
  const endTimeInput = document.getElementById("endTime");

  if (startTimeInput && endTimeInput) {
    startTimeInput.addEventListener("change", function () {
      const startTime = this.value;
      if (startTime) {
        const endTime = calculateEndTime(startTime);
        endTimeInput.value = endTime;
      }
    });
  }
}

// Calculate end time (9 hours after start time)
function calculateEndTime(startTime) {
  const [hours, minutes] = startTime.split(":").map(Number);

  // Add 9 hours (8 work hours + 1 break hour)
  let endHours = hours + 9;
  let endMinutes = minutes;

  // Handle day overflow (if end time goes past midnight)
  if (endHours >= 24) {
    endHours = endHours - 24;
  }

  // Format as HH:MM
  const formattedHours = endHours.toString().padStart(2, "0");
  const formattedMinutes = endMinutes.toString().padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}`;
}

// ============================================================================
// Tab Management
// ============================================================================

// Initialize tab switching
function initializeTabSwitching() {
  const activeTab = document.getElementById("activeEmployeesTab");
  const inactiveTab = document.getElementById("inactiveEmployeesTab");

  if (activeTab) {
    activeTab.addEventListener("click", () => switchTab("active"));
  }

  if (inactiveTab) {
    inactiveTab.addEventListener("click", () => switchTab("inactive"));
  }

  switchTab("active");
}

// Switch between Active and Inactive tabs
function switchTab(tab) {
  currentView = tab;

  // Update tab styles
  const activeTab = document.getElementById("activeEmployeesTab");
  const inactiveTab = document.getElementById("inactiveEmployeesTab");

  if (activeTab && inactiveTab) {
    if (tab === "active") {
      activeTab.classList.remove("btn-outline");
      activeTab.classList.add("btn-primary");
      inactiveTab.classList.remove("btn-primary");
      inactiveTab.classList.add("btn-outline");
    } else {
      inactiveTab.classList.remove("btn-outline");
      inactiveTab.classList.add("btn-primary");
      activeTab.classList.remove("btn-primary");
      activeTab.classList.add("btn-outline");
    }
  }

  // Update button text based on current view
  const archiveBtn = document.getElementById("archiveBtn");
  if (archiveBtn) {
    archiveBtn.textContent = tab === "active" ? "Archive" : "Restore";
  }

  filterAndDisplayData();
  deselectAll();
  handleSelectionChange();
}

// ============================================================================
// Data Filtering and Display
// ============================================================================

// Filter and display data based on current view
function filterAndDisplayData() {
  const filteredData = currentEmployeeData.filter((employee) => {
    if (currentView === "active") {
      return !employee.Status || employee.Status.toLowerCase() === "active";
    } else {
      return employee.Status && employee.Status.toLowerCase() === "inactive";
    }
  });

  setGridData(filteredData);
}

// ============================================================================
// Search Functionality
// ============================================================================

// Initialize search functionality
function initializeSearch() {
  const searchBar = document.getElementById("searchBar");
  if (searchBar) {
    searchBar.addEventListener("input", function (e) {
      const searchTerm = e.target.value.toLowerCase();

      if (searchTerm === "") {
        filterAndDisplayData();
        return;
      }

      const filteredData = currentEmployeeData.filter((employee) => {
        const statusMatch =
          currentView === "active"
            ? employee.Status && employee.Status.toLowerCase() === "active"
            : employee.Status && employee.Status.toLowerCase() === "inactive";

        const searchMatch = Object.values(employee).some(
          (value) =>
            value && value.toString().toLowerCase().includes(searchTerm)
        );

        return statusMatch && searchMatch;
      });

      setGridData(filteredData);
    });
  }
}

// ============================================================================
// Archive/Restore Functionality
// ============================================================================

// Archive/Restore selected employees
async function handleArchiveSelected() {
  const selectedRows = getSelectedRows();
  if (selectedRows.length === 0) return;

  const action = currentView === "active" ? "archive" : "restore";
  const actionText = currentView === "active" ? "Archive" : "Restore";
  const newStatusId = action === "archive" ? 2 : 1;

  const confirmed = await showArchiveConfirm(
    `Are you sure you want to ${actionText.toLowerCase()} ${
      selectedRows.length
    } employee(s)? This action can be reversed later.`,
    `${actionText} Employees`
  );

  if (confirmed) {
    try {
      const selectedIds = selectedRows.map((row) =>
        parseInt(row["Employee ID"])
      );

      const { error } = await supabaseClient
        .from("employees")
        .update({ status_id: newStatusId })
        .in("emp_id", selectedIds);

      if (error) throw error;

      await refreshData();

      const archiveBtn = document.getElementById("archiveBtn");
      if (archiveBtn) {
        archiveBtn.disabled = true;
      }

      showGlobalAlert(
        "success",
        `${
          selectedRows.length
        } employee(s) ${actionText.toLowerCase()}d successfully!`
      );
    } catch (error) {
      console.error("Error updating employee status:", error);
      showGlobalAlert(
        "error",
        "Error updating employee status. Please try again."
      );
    }
  }
}

// ============================================================================
// Dropdown Population
// ============================================================================

// Populate form dropdowns
async function populateFormDropdowns() {
  try {
    const [departments, positions, officialTimes] = await Promise.all([
      fetchDepartments(),
      fetchPositions(),
      fetchOfficialTimeSchedules(),
    ]);

    // Populate department dropdown
    const deptSelect = document.querySelector('select[name="department"]');
    if (deptSelect) {
      deptSelect.innerHTML = '<option value="">Select Department</option>';
      departments.forEach((dept) => {
        const option = document.createElement("option");
        option.value = dept.department_name;
        option.textContent = dept.department_name;
        deptSelect.appendChild(option);
      });
    }

    // Populate position dropdown
    const posSelect = document.querySelector('select[name="position"]');
    if (posSelect) {
      posSelect.innerHTML = '<option value="">Select Position</option>';
      positions.forEach((pos) => {
        const option = document.createElement("option");
        option.value = pos.position_name;
        option.textContent = pos.position_name;
        option.setAttribute("data-salary", pos.base_salary);
        posSelect.appendChild(option);
      });
    }

    // Populate official time dropdown - display time range instead of name
    const officialTimeSelect = document.getElementById("officialTimeSelect");
    if (officialTimeSelect) {
      officialTimeSelect.innerHTML =
        '<option value="">Select Official Time</option>';
      officialTimes.forEach((time) => {
        const option = document.createElement("option");
        option.value = time.official_time_id;
        // Display the actual time range, not the schedule name
        option.textContent = `${time.start_time} - ${time.end_time}`;
        option.setAttribute("data-start", time.start_time);
        option.setAttribute("data-end", time.end_time);
        officialTimeSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error populating form dropdowns:", error);
  }
}

// ============================================================================
// Employee Details Modal
// ============================================================================

// Show employee details in modal
function showEmployeeDetails(employeeId) {
  const employee = currentEmployeeData.find(
    (emp) => emp["Employee ID"] === employeeId
  );
  if (!employee) return;

  console.log("Employee Status:", employee.Status);

  const statusColor =
    employee.Status && employee.Status.toLowerCase() === "active"
      ? "#16a34a"
      : "#dc2626";

  const statusText = employee.Status
    ? employee.Status.charAt(0).toUpperCase() +
      employee.Status.slice(1).toLowerCase()
    : "Active";

  const detailsContainer = document.getElementById("employeeDetails");
  detailsContainer.innerHTML = `
    <!-- Employee Header Card -->
    <div class="shadow-xl/20 rounded-box p-8 mb-6">
      <div class="flex items-start justify-between">
        <div>
          <h3 class="text-2xl font-bold mb-2">
            ${employee["First Name"]} ${
    employee["Middle Initial"] ? employee["Middle Initial"] + "." : ""
  } ${employee["Last Name"]}
          </h3>
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium">ID: ${
              employee["Employee ID"]
            }</span>
            <span class="opacity-50">•</span>
            <span class="font-semibold" style="color: ${statusColor};">
              ${statusText}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Personal Information Card -->
      <div class="shadow-xl/20 rounded-box p-8">
        <h4 class="text-xl font-semibold mb-4">Personal Information</h4>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-3 border-b border-base-300">
            <span class="opacity-70 text-sm">Contact:</span>
            <span class="font-medium">${
              employee.Contact || "N/A"
            }</span>
          </div>
          <div class="flex justify-between items-start py-3 border-b border-base-300">
            <span class="opacity-70 text-sm">Address:</span>
            <span class="font-medium text-right max-w-xs">${
              employee.Address || "N/A"
            }</span>
          </div>
        </div>
      </div>
      
      <!-- Role Information Card -->
      <div class="shadow-xl/20 rounded-box p-8">
        <h4 class="text-xl font-semibold mb-4">Role Information</h4>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-3 border-b border-base-300">
            <span class="opacity-70 text-sm">Position:</span>
            <span class="font-medium">${employee.Position}</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-base-300">
            <span class="opacity-70 text-sm">Department:</span>
            <span class="font-medium">${
              employee.Department
            }</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-base-300">
            <span class="opacity-70 text-sm">Date Hired:</span>
            <span class="font-medium">${
              employee.DateHired
                ? new Date(employee.DateHired).toLocaleDateString()
                : "N/A"
            }</span>
          </div>
        </div>
      </div>
      
      <!-- Schedule Information Card -->
      <div class="shadow-xl/20 rounded-box p-8">
        <h4 class="text-xl font-semibold mb-4">Schedule</h4>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-3 border-b border-base-300">
            <span class="opacity-70 text-sm">Official Time:</span>
            <span class="font-medium">${
              employee.ScheduleName || "N/A"
            }</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-base-300">
            <span class="opacity-70 text-sm">Start Time:</span>
            <span class="font-medium">${
              employee.StartTime ? formatTime(employee.StartTime) : "N/A"
            }</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-base-300">
            <span class="opacity-70 text-sm">End Time:</span>
            <span class="font-medium">${
              employee.EndTime ? formatTime(employee.EndTime) : "N/A"
            }</span>
          </div>
        </div>
      </div>
      
      <!-- Government IDs Card -->
      <div class="shadow-xl/20 rounded-box p-8 md:col-span-2">
        <h4 class="text-xl font-semibold mb-4">Government IDs</h4>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-3 border-b border-base-300">
            <span class="opacity-70 text-sm">SSS ID:</span>
            <span class="font-medium">${
              employee.SSSID || "N/A"
            }</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-base-300">
            <span class="opacity-70 text-sm">PhilHealth ID:</span>
            <span class="font-medium">${
              employee.PhilhealthID || "N/A"
            }</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-base-300">
            <span class="opacity-70 text-sm">Pag-IBIG ID:</span>
            <span class="font-medium">${
              employee.PagIBIGID || "N/A"
            }</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-base-300">
            <span class="opacity-70 text-sm">TIN ID:</span>
            <span class="font-medium">${
              employee.TINID || "N/A"
            }</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Salary Information Card - Standalone -->
    <div class="shadow-xl/20 rounded-box p-8 mt-6">
      <h4 class="text-xl font-semibold mb-4">Salary Information</h4>
      <div class="flex justify-between items-center py-3">
        <span class="opacity-70 text-sm">Base Rate:</span>
        <span class="text-2xl font-bold">₱${parseInt(
          employee.Rate
        ).toLocaleString()}</span>
      </div>
    </div>
    
    <div class="flex justify-end gap-3 mt-6 pt-4">
      <button class="btn btn-primary" onclick="editEmployee('${
        employee["Employee ID"]
      }')">
        Edit Employee
      </button>
    </div>
  `;

  document.getElementById("viewMoreModal").showModal();
}

// Format time from HH:MM:SS to HH:MM AM/PM
function formatTime(timeString) {
  if (!timeString) return "N/A";

  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 || 12;

  return `${formattedHour}:${minutes} ${ampm}`;
}

// ============================================================================
// Employee Form Management
// ============================================================================

// Edit employee - opens the same form as Add New but pre-filled
window.editEmployee = function (employeeId) {
  const employee = currentEmployeeData.find(
    (emp) => emp["Employee ID"] === employeeId
  );
  if (!employee) return;

  document.getElementById("viewMoreModal").close();

  const form = document.getElementById("addEmployeeForm");
  form.reset();

  // Pre-fill all fields
  form.querySelector('[name="employeeId"]').value = employee["Employee ID"];
  form.querySelector('[name="firstName"]').value = employee["First Name"] || "";
  form.querySelector('[name="lastName"]').value = employee["Last Name"] || "";
  form.querySelector('[name="middleInitial"]').value =
    employee["Middle Initial"] || "";
  form.querySelector('[name="contact"]').value = employee.Contact || "";
  form.querySelector('[name="address"]').value = employee.Address || "";

  // Set position and department dropdowns
  const positionSelect = form.querySelector('[name="position"]');
  if (positionSelect) {
    positionSelect.value = employee.Position;
    positionSelect.dispatchEvent(new Event("change"));
  }

  const departmentSelect = form.querySelector('[name="department"]');
  if (departmentSelect) {
    departmentSelect.value = employee.Department;
  }

  form.querySelector('[name="dateHired"]').value = employee.DateHired || "";
  form.querySelector('[name="rate"]').value = employee.Rate;
  form.querySelector('[name="sssId"]').value = employee.SSSID || "";
  form.querySelector('[name="philhealthId"]').value =
    employee.PhilhealthID || "";
  form.querySelector('[name="pagibigId"]').value = employee.PagIBIGID || "";
  form.querySelector('[name="tinId"]').value = employee.TINID || "";

  // Set official time dropdown
  const officialTimeSelect = document.getElementById("officialTimeSelect");
  if (officialTimeSelect && employee.OfficialTimeID) {
    officialTimeSelect.value = employee.OfficialTimeID;
  }

  // Make Employee ID read-only during edit
  const employeeIdInput = form.querySelector('[name="employeeId"]');
  employeeIdInput.readOnly = true;
  employeeIdInput.style.display = "block";
  employeeIdInput.previousElementSibling.style.display = "block";

  // Change modal title and button text
  document.querySelector("#addEmployeeModal h3").textContent = "Edit Employee";
  document.querySelector(
    '#addEmployeeModal button[type="submit"]'
  ).textContent = "Update Employee";

  // Store the employee ID for update handling
  form.dataset.editingEmployeeId = employeeId;

  document.getElementById("addEmployeeModal").showModal();
};

// Handle form submission for both Add and Edit
async function handleAddEmployee(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const isEditing = e.target.dataset.editingEmployeeId;
  const officialTimeId = formData.get("officialTime");

  try {
    if (isEditing) {
      await updateEmployeeInSupabase(formData, isEditing, officialTimeId);
    } else {
      await addEmployeeToSupabase(formData, officialTimeId);
    }

    await refreshData();

    e.target.reset();
    document.getElementById("addEmployeeModal").close();

    // Clean up editing state
    delete e.target.dataset.editingEmployeeId;
    const employeeIdInput = e.target.querySelector('[name="employeeId"]');
    employeeIdInput.readOnly = false;
    employeeIdInput.style.display = "block";
    employeeIdInput.previousElementSibling.style.display = "block";

    document.querySelector("#addEmployeeModal h3").textContent =
      "Add New Employee";
    document.querySelector(
      '#addEmployeeModal button[type="submit"]'
    ).textContent = "Add Employee";

    showGlobalAlert(
      "success",
      `Employee ${isEditing ? "updated" : "added"} successfully!`
    );
  } catch (error) {
    console.error("Error saving employee:", error);
    showGlobalAlert("error", "Error saving employee data. Please try again.");
  }
}

// ============================================================================
// Supabase Operations
// ============================================================================

// Add employee to Supabase
async function addEmployeeToSupabase(formData, officialTimeId) {
  // First create gov_info record
  const { data: govInfo, error: govError } = await supabaseClient
    .from("gov_info")
    .insert({
      sss_number: formData.get("sssId") || null,
      philhealth_number: formData.get("philhealthId") || null,
      pagibig_number: formData.get("pagibigId") || null,
      tin_number: formData.get("tinId") || null,
    })
    .select()
    .single();

  if (govError) throw govError;

  // Get department ID
  const { data: department, error: deptError } = await supabaseClient
    .from("departments")
    .select("department_id")
    .eq("department_name", formData.get("department"))
    .single();

  if (deptError) throw deptError;

  // Get position ID
  const { data: position, error: posError } = await supabaseClient
    .from("positions")
    .select("position_id")
    .eq("position_name", formData.get("position"))
    .single();

  if (posError) throw posError;

  // Then create employee record
  const { error: empError } = await supabaseClient.from("employees").insert({
    first_name: formData.get("firstName"),
    last_name: formData.get("lastName"),
    middle_name: formData.get("middleInitial") || null,
    phone_number: formData.get("contact") || null,
    address: formData.get("address") || null,
    date_hired: formData.get("dateHired"),
    department_id: department.department_id,
    position_id: position.position_id,
    gov_info_id: govInfo.gov_info_id,
    official_time_id: parseInt(officialTimeId),
    status_id: 1,
  });

  if (empError) throw empError;
}

// Update employee in Supabase
// Added "trigger" within this function, to insert into the employee_position_logs table if the employee's position has changed. 11/10/2025
async function updateEmployeeInSupabase(formData, employeeId, officialTimeId) {
  // Get current employee data to find gov_info_id and current position_id
  const { data: employee, error: empFetchError } = await supabaseClient
    .from("employees")
    .select("gov_info_id, position_id")
    .eq("emp_id", parseInt(employeeId))
    .single();
  if (empFetchError) throw empFetchError;

  // Update gov_info
  const { error: govError } = await supabaseClient
    .from("gov_info")
    .update({
      sss_number: formData.get("sssId") || null,
      philhealth_number: formData.get("philhealthId") || null,
      pagibig_number: formData.get("pagibigId") || null,
      tin_number: formData.get("tinId") || null,
    })
    .eq("gov_info_id", employee.gov_info_id);
  if (govError) throw govError;

  // Get department ID
  const { data: department, error: deptError } = await supabaseClient
    .from("departments")
    .select("department_id")
    .eq("department_name", formData.get("department"))
    .single();
  if (deptError) throw deptError;

  // Get position ID and position rank
  const { data: position, error: posError } = await supabaseClient
    .from("positions")
    .select("position_id, pos_rank")
    .eq("position_name", formData.get("position"))
    .single();
  if (posError) throw posError;

  // Check if position has changed
  if (employee.position_id !== position.position_id) {
    // Get the previous position rank
    const { data: previousPosition, error: prevPosError } = await supabaseClient
      .from("positions")
      .select("pos_rank")
      .eq("position_id", employee.position_id)
      .single();
    if (prevPosError) throw prevPosError;

    // Insert log into employee_position_logs
    const { error: logError } = await supabaseClient
      .from("employee_position_logs")
      .insert({
        emp_id: parseInt(employeeId),
        time_changed: new Date().toISOString(),
        previous_pos_rank: previousPosition.pos_rank,
        new_pos_rank: position.pos_rank,
      });
    if (logError) throw logError;

    console.log(
      `Position change logged for employee ${employeeId}: ${previousPosition.pos_rank} -> ${position.pos_rank}`
    );
  }

  // Update employee
  const { error: empError } = await supabaseClient
    .from("employees")
    .update({
      first_name: formData.get("firstName"),
      last_name: formData.get("lastName"),
      middle_name: formData.get("middleInitial") || null,
      phone_number: formData.get("contact") || null,
      address: formData.get("address") || null,
      date_hired: formData.get("dateHired"),
      department_id: department.department_id,
      position_id: position.position_id,
      official_time_id: parseInt(officialTimeId),
    })
    .eq("emp_id", parseInt(employeeId));
  if (empError) throw empError;
}

// ============================================================================
// CSV Export Functionality
// ============================================================================

// Initialize CSV generation functionality
function initializeCSVGeneration() {
  const generateCsvBtn = document.getElementById("generateCsvBtn");
  if (generateCsvBtn) {
    generateCsvBtn.addEventListener("click", handleGenerateCSV);
  }
}

// Handle CSV generation with filters
function handleGenerateCSV() {
  const department = document.getElementById("csvDepartment").value;
  const position = document.getElementById("csvPosition").value;
  const rateRange = document.getElementById("csvRateRange").value;

  // Filter data based on selections
  let filteredData = currentEmployeeData.filter((employee) => {
    // Status filter - only include active employees for CSV
    if (!employee.Status || employee.Status.toLowerCase() !== "active")
      return false;

    // Department filter
    if (department !== "all" && employee.Department !== department)
      return false;

    // Position filter
    if (position !== "all" && employee.Position !== position) return false;

    // Rate Range filter
    if (rateRange !== "all") {
      const rate = parseInt(employee.Rate);
      switch (rateRange) {
        case "0-50000":
          if (rate > 50000) return false;
          break;
        case "50001-80000":
          if (rate < 50001 || rate > 80000) return false;
          break;
        case "80001-100000":
          if (rate < 80001 || rate > 100000) return false;
          break;
        case "100001+":
          if (rate < 100001) return false;
          break;
      }
    }

    return true;
  });

  if (filteredData.length === 0) {
    showGlobalAlert("error", "No active employees match the selected filters.");
    return;
  }

  generateCSVFile(filteredData);
  document.getElementById("genCSV").close();
}

// Generate and download CSV file
function generateCSVFile(data) {
  console.log("Generating CSV from data:", data);

  // Define CSV headers
  const headers = [
    "Employee ID",
    "First Name",
    "Last Name",
    "Middle Initial",
    "Position",
    "Department",
    "Rate",
    "SSSID",
    "PhilhealthID",
    "PagIBIGID",
    "TINID",
    "DateHired",
    "Contact",
    "Address",
    "OfficialTimeID",
    "ScheduleName",
    "StartTime",
    "EndTime",
    "Status",
  ];

  // Convert data to CSV format
  let csvContent = headers.join(",") + "\n";

  data.forEach((employee) => {
    const row = headers.map((header) => {
      let value = employee[header] || "";
      console.log(`Field: ${header}, Value:`, value);

      // Convert to string and handle empty values
      value = String(value);

      // Escape commas and quotes in values
      if (value.includes(",") || value.includes('"')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvContent += row.join(",") + "\n";
  });

  console.log("Final CSV content:", csvContent);

  // Create and download the file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  // Create filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `employee_data_${timestamp}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showGlobalAlert(
    "success",
    `CSV file "${filename}" generated successfully with ${data.length} employee(s)!`
  );
}
