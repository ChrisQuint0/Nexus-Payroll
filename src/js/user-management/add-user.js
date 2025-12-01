import { supabaseAdmin } from "../supabase/adminClient.js";
import { supabaseClient } from "../supabase/supabaseClient.js";
import { showGlobalAlert } from "../utils/alerts.js";
import { fetchUsers } from "./grid.js"; // *** Import fetchUsers to refresh the grid ***

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

/**
 * Creates a new user in Supabase Auth using the Admin client
 * and populates the necessary user metadata for the AG Grid.
 * @param {object} userData
 * @returns {Promise<string>} The new user's ID.
 */
async function createNewUser({
  username,
  firstName,
  lastName,
  userType,
  employeeId,
  email,
  password,
}) {
  let authUserId = null;

  try {
    // Prepare metadata for both Auth and AG Grid (which reads from metadata)
    const userMetadata = {
      username: username,
      first_name: firstName,
      last_name: lastName,
      user_type: userType,
      status: "active", // Default status for new users
      // Only include employee_id if the user type is Employee
      ...(userType === "Employee" && { employee_id: parseInt(employeeId) }),
    };

    // 1. Create user in Supabase Auth via Admin Client
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: userMetadata,
    });

    if (authError) throw new Error(authError.message || "Unknown Auth Error");

    if (!authUser)
      throw new Error("User creation failed, no user object returned.");

    authUserId = authUser.id;

    // 2. Log to Audit Trail
    try {
      const { data: currentUserData, error: authError } =
        await supabaseClient.auth.getUser();

      if (authError) {
        console.warn(
          "Could not get current user for audit logging, proceeding without user_id.",
          authError
        );
      }

      const loggedInUserId = currentUserData?.user?.id || null;
      const employeePart =
        userType === "Employee" ? ` (EID: ${employeeId})` : "";
      const description = `Created new user: ${firstName} ${lastName} (${email}, Type: ${userType}${employeePart}). New Auth ID: ${authUserId}`;

      await supabaseClient.from("audit_trail").insert({
        user_id: loggedInUserId,
        action: "create",
        description: description,
        module_affected: "User Management",
        record_id: authUserId,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error("Error logging user creation to audit trail:", auditError);
      // Non-critical error, do not throw.
    }

    // 3. Refresh the AG Grid data to show the new user
    await fetchUsers();

    return authUserId;
  } catch (error) {
    // If an auth user was created but something else failed (unlikely here, but good practice)
    // and we had a user ID, we should try to clean up the partially created user.
    if (authUserId) {
      console.warn(
        `Rolling back partially created user with ID: ${authUserId}`
      );
      await supabaseAdmin.auth.admin
        .deleteUser(authUserId)
        .catch((e) => console.error("Rollback failed:", e));
    }

    // Re-throw the original error message to be handled by the click listener
    throw new Error(`Failed to add user: ${error.message}`);
  }
}

// NOTE: The handleAddLeave function is not needed here as it relates to leave management,
// not user management. I am removing it to clean up the file for the user management context.

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
