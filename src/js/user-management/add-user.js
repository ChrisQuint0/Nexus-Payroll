import { supabaseClient } from "../supabase/supabaseClient.js";
import { showGlobalAlert } from "../utils/alerts.js";
import { fetchUsers } from "./grid.js"; // Import fetchUsers to refresh grid

const modal = document.getElementById("addNewModal");
const addUserBtn = modal.querySelector("#addUserBtn");
const usernameInput = modal.querySelector("#usernameInput");
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
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !email || !password) {
    showDialogAlert("error", "Please fill out all fields.");
    return;
  }

  spinner.classList.remove("hidden");
  btnText.textContent = "Creating...";
  addUserBtn.disabled = true;

  try {
    const { data: signUpData, error: signUpError } =
      await supabaseClient.auth.signUp({ email, password });

    if (signUpError) throw signUpError;

    const userId = signUpData.user?.id;
    if (!userId) throw new Error("User creation failed — no user ID returned.");

    const { error: insertError } = await supabaseClient
      .from("users")
      .insert([{ user_id: userId, username, email }]);

    if (insertError) throw insertError;

    // Refresh the grid after adding a new user
    await fetchUsers();

    showGlobalAlert("success", "User successfully added!");

    // Clear and close modal
    usernameInput.value = "";
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
