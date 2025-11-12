import { supabaseAdmin } from "../supabase/adminClient.js";
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
    // Check if Employee ID already exists (only for Employee type)
    if (userType === "Employee") {
      const { data: existingUsers, error: checkError } =
        await supabaseAdmin.auth.admin.listUsers();

      if (checkError) throw checkError;

      const employeeIdExists = existingUsers.users.some(
        (user) => user.user_metadata?.employee_id === employeeId
      );

      if (employeeIdExists) {
        showDialogAlert(
          "error",
          "Employee ID already exists. Please use a unique ID."
        );
        return;
      }
    }

    // Prepare user metadata
    const userMetadata = {
      username,
      first_name: firstName,
      last_name: lastName,
      user_type: userType,
      status: "active",
    };

    // Add employee_id only if user type is Employee
    if (userType === "Employee") {
      userMetadata.employee_id = employeeId;
    }

    // Use Admin API to create user with metadata
    const { data: signUpData, error: signUpError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: userMetadata,
      });

    if (signUpError) throw signUpError;
    if (!signUpData.user) throw new Error("User creation failed.");

    // Refresh the grid after adding a new user
    await fetchUsers();

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
