import { supabaseAdmin } from "../supabase/adminClient.js";
import { showGlobalAlert } from "../utils/alerts.js";
import { fetchUsers } from "./grid.js";

const modal = document.getElementById("addNewModal");
const addUserBtn = modal.querySelector("#addUserBtn");
const usernameInput = modal.querySelector("#usernameInput");
const firstNameInput = modal.querySelector("#firstNameInput");
const lastNameInput = modal.querySelector("#lastNameInput");
const userTypeInput = modal.querySelector("#userTypeInput");
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

addUserBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  const username = usernameInput.value.trim();
  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const userType = userTypeInput.value;
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (
    !username ||
    !firstName ||
    !lastName ||
    !userType ||
    !email ||
    !password
  ) {
    showDialogAlert("error", "Please fill out all fields.");
    return;
  }

  spinner.classList.remove("hidden");
  btnText.textContent = "Creating...";
  addUserBtn.disabled = true;

  try {
    // Use Admin API to create user with metadata
    const { data: signUpData, error: signUpError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          username,
          first_name: firstName,
          last_name: lastName,
          user_type: userType,
          status: "active", // Default status when creating user
        },
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
    emailInput.value = "";
    passwordInput.value = "";

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
