import { supabaseAdmin } from "../supabase/adminClient.js";
import { showGlobalAlert } from "../utils/alerts.js";
import { fetchUsers } from "./grid.js"; // Import fetchUsers to refresh grid

const resetModal = document.getElementById("resetModal");
const resetPassBtn = resetModal.querySelector("#resetPassBtn");
const newPassInput = resetModal.querySelector("#newPass");
const confirmPassInput = resetModal.querySelector("#confirmPass");
const resetDialogAlert = document.getElementById("dialogResetAlert");
const spinner = resetModal.querySelector("#loadingSpinnerReset");
const btnText = resetModal.querySelector("#btnTextReset");

let currentUserEmail = null;

/**
 * Opens the reset password modal for a specific user.
 * @param {string} email - The email of the user to reset the password for.
 */
window.openResetModal = (email) => {
  currentUserEmail = email;
  newPassInput.value = ""; // Clear inputs on open
  confirmPassInput.value = "";
  resetDialogAlert.innerHTML = "";
  resetModal.showModal();
};

function showDialogAlert(type, message) {
  const colorClass = type === "success" ? "alert-success" : "alert-error";
  resetDialogAlert.innerHTML = `
    <div class="alert ${colorClass} shadow-lg animate-fade-down">
      <span class="font-medium">${message}</span>
    </div>
  `;
  setTimeout(() => (resetDialogAlert.innerHTML = ""), 4000);
}

resetPassBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  const newPass = newPassInput.value.trim();
  const confirmPass = confirmPassInput.value.trim();

  if (!newPass || !confirmPass) {
    showDialogAlert("error", "Please fill in both fields.");
    return;
  }
  if (newPass !== confirmPass) {
    showDialogAlert("error", "Passwords do not match.");
    return;
  }

  spinner.classList.remove("hidden");
  btnText.textContent = "Resetting...";
  resetPassBtn.disabled = true;

  try {
    // 1. Find user by email to get the user ID for Admin API
    const { data: listData, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const user = listData.users.find((u) => u.email === currentUserEmail);
    if (!user) throw new Error("User not found in auth system.");

    // 2. Update password
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: newPass,
      });

    if (updateError) throw updateError;

    // 3. Update the 'updated_at' column in your 'users' table
    const { error: timeUpdateError } = await supabaseAdmin
      .from("users")
      .update({ updated_at: new Date().toISOString() })
      .eq("email", currentUserEmail);

    if (timeUpdateError) throw timeUpdateError;

    // Refresh the grid to show the updated time
    await fetchUsers();

    showGlobalAlert(
      "success",
      `Password successfully reset for ${currentUserEmail}!`
    );
    setTimeout(() => resetModal.close(), 1500);
  } catch (err) {
    console.error("Error resetting password:", err);
    showDialogAlert("error", err.message);
  } finally {
    spinner.classList.add("hidden");
    btnText.textContent = "Reset Password";
    resetPassBtn.disabled = false;
  }
});
