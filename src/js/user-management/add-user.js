import { supabaseAdmin } from "../supabase/adminClient.js";
import { supabaseClient } from "../supabase/supabaseClient.js";
import { showGlobalAlert } from "../utils/alerts.js";
import { fetchUsers } from "./grid.js";

const modal = document.getElementById("addNewModal");
const addUserBtn = modal.querySelector("#addUserBtn");
const usernameInput = modal.querySelector("#usernameInput");
const firstNameInput = modal.querySelector("#firstNameInput");
const lastNameInput = modal.querySelector("#lastNameInput");
const userTypeInput = modal.querySelector("#userTypeInput");
const employeeIdContainer = modal.querySelector("#employeeIdContainer");
const employeeIdInput = modal.querySelector("#employeeIdInput");
const employeeIdBr = modal.querySelector("#employeeIdBr");
const emailInput = modal.querySelector("#emailInput");
const passwordInput = modal.querySelector("#passwordInput");
const spinner = modal.querySelector("#loadingSpinner");
const btnText = modal.querySelector("#btnText");
const dialogAlert = document.getElementById("dialogAlert");

function showDialogAlert(type, message) {
  const colorClass = type === "success" ? "alert-success" : "alert-error";
  dialogAlert.innerHTML = `
    <div class="alert ${colorClass} shadow-lg animate-fade-down">
      <span class="font-medium">${message}</span>
    </div>
  `;
  setTimeout(() => (dialogAlert.innerHTML = ""), 4000);
}

// Show/hide Employee ID field based on user type selection
userTypeInput.addEventListener("change", (e) => {
  const isEmployee = e.target.value === "Employee";

  if (isEmployee) {
    employeeIdContainer.classList.remove("hidden");
    employeeIdBr.classList.remove("hidden");
    employeeIdInput.required = true;
  } else {
    employeeIdContainer.classList.add("hidden");
    employeeIdBr.classList.add("hidden");
    employeeIdInput.required = false;
    employeeIdInput.value = ""; // Clear the value when hidden
  }
});

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
  const startDate = formData.get("startDate");

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

    // Calculate leave end date
    const leaveStart = new Date(startDate);
    const leaveEnd = new Date(leaveStart);
    leaveEnd.setDate(leaveEnd.getDate() + duration - 1);

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
      .select();

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

    // Log to Audit Trail
    try {
      console.log("Starting audit trail logging for leave addition...");

      const { data: authData, error: authError } =
        await supabaseClient.auth.getUser();

      if (authError) {
        console.error("Error getting current user for audit:", authError);
        throw authError;
      }

      if (!authData?.user) {
        console.error("No authenticated user found for audit logging");
        throw new Error("No authenticated user");
      }

      console.log("Current user ID:", authData.user.id);

      // Build description with all relevant details
      const employeeName =
        employee["Employee Name"] || `Employee ID: ${employeeId}`;
      const paidStatus =
        isPaid === true ? "Paid" : isPaid === false ? "Unpaid" : "N/A";
      const description = `Added leave record: ${employeeName} - ${leaveType} (${duration} day(s), ${paidStatus}) from ${startDate}. Balance updated: ${currentBalance} → ${newBalance}`;

      console.log("Inserting audit trail with description:", description);

      const { data: auditData, error: auditInsertError } = await supabaseClient
        .from("audit_trail")
        .insert({
          user_id: authData.user.id,
          action: "create",
          description: description,
          module_affected: "Leave Management",
          record_id: leaveData && leaveData[0] ? leaveData[0].leave_id : null,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        });

      if (auditInsertError) {
        console.error("Error inserting audit trail:", auditInsertError);
        throw auditInsertError;
      }

      console.log("Audit trail logged successfully:", auditData);
    } catch (auditError) {
      console.error("Full audit trail error:", auditError);
      // Don't throw error - leave addition was successful
    }

    showGlobalAlert(
      "success",
      `Leave request added successfully! ${duration} day(s) deducted from ${leaveType}.`
    );

    // Close modal and refresh data from database
    document.getElementById("addLeaveModal").close();
    form.reset();
    delete form.dataset.employeeId;
    delete form.dataset.leaveTrackingId;
    await refreshData();
  } catch (error) {
    console.error("Error adding leave record:", error);
    showGlobalAlert("error", "Error adding leave record. Please try again.");
  }
}

addUserBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  const username = usernameInput.value.trim();
  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const userType = userTypeInput.value;
  const employeeId = employeeIdInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  // Validation
  if (
    !username ||
    !firstName ||
    !lastName ||
    !userType ||
    !email ||
    !password
  ) {
    showDialogAlert("error", "Please fill out all required fields.");
    return;
  }

  // Check if Employee type requires Employee ID
  if (userType === "Employee" && !employeeId) {
    showDialogAlert("error", "Employee ID is required for Employee accounts.");
    return;
  }

  // Validate Employee ID is a positive number
  if (
    userType === "Employee" &&
    (isNaN(employeeId) || parseInt(employeeId) <= 0)
  ) {
    showDialogAlert("error", "Employee ID must be a valid positive number.");
    return;
  }

  spinner.classList.remove("hidden");
  btnText.textContent = "Creating...";
  addUserBtn.disabled = true;

  try {
    await createNewUser({
      username,
      firstName,
      lastName,
      userType,
      employeeId,
      email,
      password,
    });

    showGlobalAlert("success", "User successfully added!");

    // Clear and close modal
    usernameInput.value = "";
    firstNameInput.value = "";
    lastNameInput.value = "";
    userTypeInput.value = "";
    employeeIdInput.value = "";
    emailInput.value = "";
    passwordInput.value = "";

    // Hide employee ID field
    employeeIdContainer.classList.add("hidden");
    employeeIdBr.classList.add("hidden");

    setTimeout(() => modal.close(), 1500);
  } catch (error) {
    console.error("Error adding user:", error);
    showDialogAlert("error", error.message);
  } finally {
    spinner.classList.add("hidden");
    btnText.textContent = "Add User";
    addUserBtn.disabled = false;
  }
});
