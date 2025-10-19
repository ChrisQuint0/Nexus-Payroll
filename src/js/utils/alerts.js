/**
 * Displays a global alert message at the top of the page.
 * @param {('success'|'error')} type - The type of alert to display.
 * @param {string} message - The message content.
 */
export function showGlobalAlert(type, message) {
  const globalAlert = document.getElementById("globalAlert");
  const colorClass = type === "success" ? "alert-success" : "alert-error";
  globalAlert.innerHTML = `
    <div class="alert ${colorClass} shadow-lg animate-fade-down">
      <span class="font-medium">${message}</span>
    </div>
  `;
  setTimeout(() => (globalAlert.innerHTML = ""), 4000);
}

// Attach to window for AG-Grid cell renderer access
window.showGlobalAlert = showGlobalAlert;
