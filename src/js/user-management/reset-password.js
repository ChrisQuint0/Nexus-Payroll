import { supabaseAdmin } from "../supabase/adminClient.js";
import { showGlobalAlert } from "../utils/alerts.js";
import { fetchUsers } from "./grid.js";

const resetModal = document.getElementById("resetModal");
const resetPassBtn = resetModal.querySelector("#resetPassBtn");
const newPassInput = resetModal.querySelector("#newPass");
const confirmPassInput = resetModal.querySelector("#confirmPass");
const resetDialogAlert = document.getElementById("dialogResetAlert");
const spinner = resetModal.querySelector("#loadingSpinnerReset");
const btnText = resetModal.querySelector("#btnTextReset");

let currentUserId = null;

/**
 * Opens the reset password modal for a specific user.
 * @param {string} userId - The ID of the user to reset the password for.
 */
window.openResetModal = (userId) => {
  currentUserId = userId;
  newPassInput.value = "";
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
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(currentUserId, {
        password: newPass,
      });

    if (updateError) throw updateError;

    await fetchUsers();

    showGlobalAlert("success", "Password successfully reset!");
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
