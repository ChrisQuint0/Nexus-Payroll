import { showGlobalAlert } from "../utils/alerts.js";

document.addEventListener("DOMContentLoaded", () => {
  const downloadCSVBtn = document.getElementById("downloadCSVBtn");
  const csvSpinner = document.getElementById("csvSpinner");
  const csvBtnText = document.getElementById("csvBtnText");
  const csvAlert = document.getElementById("csvAlert");
  const genCSVModal = document.getElementById("genCSV");

  function showCSVAlert(type, message) {
    const colorClass = type === "success" ? "alert-success" : "alert-error";
    csvAlert.innerHTML = `
        <div class="alert ${colorClass} shadow-lg animate-fade-down">
          <span class="font-medium">${message}</span>
        </div>
      `;
    setTimeout(() => (csvAlert.innerHTML = ""), 4000);
  }

  function escapeCSVValue(value) {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  downloadCSVBtn.addEventListener("click", () => {
    try {
      if (!window.gridApi) {
        showCSVAlert("error", "Grid not initialized. Cannot export.");
        return;
      }

      csvSpinner.classList.remove("hidden");
      csvBtnText.textContent = "Generating...";
      downloadCSVBtn.disabled = true;

      const rowData = [];
      window.gridApi.forEachNode((node) => rowData.push(node.data));

      if (rowData.length === 0) {
        showCSVAlert("error", "No data to export");
        return;
      }

      const headers = [
        "Status",
        "Username",
        "First Name",
        "Last Name",
        "User Type",
        "Email",
        "Created At",
        "Last Sign In",
      ];
      const csvRows = [headers.join(",")];

      rowData.forEach((row) => {
        const values = [
          escapeCSVValue(row.status),
          escapeCSVValue(row.username),
          escapeCSVValue(row.first_name),
          escapeCSVValue(row.last_name),
          escapeCSVValue(row.user_type),
          escapeCSVValue(row.email),
          escapeCSVValue(row.created_at),
          escapeCSVValue(row.last_sign_in),
        ];
        csvRows.push(values.join(","));
      });

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      link.setAttribute("href", url);
      link.setAttribute("download", `users_export_${timestamp}.csv`);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showGlobalAlert("success", "CSV file downloaded successfully!");
      setTimeout(() => genCSVModal.close(), 1000);
    } catch (error) {
      console.error("Error generating CSV:", error);
      showCSVAlert("error", "Failed to generate CSV");
    } finally {
      csvSpinner.classList.add("hidden");
      csvBtnText.textContent = "Download CSV";
      downloadCSVBtn.disabled = false;
    }
  });
});
