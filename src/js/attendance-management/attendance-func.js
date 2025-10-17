// Updated attendance-func.js
import {
  gridApi,
  switchView,
  applyDataFilter,
  getCurrentData,
  getCurrentView,
} from "./attendance-grid.js";
import { generateDTR, displayDTR } from "./dtr-generator.js";

// Tab toggle functionality
const rawTimeLogsTab = document.getElementById("rawTimeLogsTab");
const attendanceSummaryTab = document.getElementById("attendanceSummaryTab");
const cutoffPeriodContainer = document.getElementById("cutoffPeriodContainer");
const generateDTRBtn = document.getElementById("generateDTRBtn");

// Raw Time Logs tab click
rawTimeLogsTab.addEventListener("click", function () {
  // Set Raw Time Logs as active
  rawTimeLogsTab.className =
    "px-5 py-2 rounded-lg text-sm font-semibold btn btn-primary";
  attendanceSummaryTab.className =
    "px-5 py-2 rounded-lg text-sm font-semibold btn btn-outline";

  // Hide cutoff period for Raw Time Logs
  cutoffPeriodContainer.classList.add("hidden");
  cutoffPeriodContainer.classList.remove("flex");

  // Show Generate DTR button for Raw Time Logs
  generateDTRBtn.classList.remove("hidden");

  // Switch grid view
  switchView("raw");

  // Apply current filters to new view
  applyCurrentFilters();
});

// Attendance Summary tab click
attendanceSummaryTab.addEventListener("click", function () {
  // Set Attendance Summary as active
  attendanceSummaryTab.className =
    "px-5 py-2 rounded-lg text-sm font-semibold btn btn-primary";
  rawTimeLogsTab.className =
    "px-5 py-2 rounded-lg text-sm font-semibold btn btn-outline";

  // Show cutoff period for Attendance Summary
  cutoffPeriodContainer.classList.remove("hidden");
  cutoffPeriodContainer.classList.add("flex");

  // Hide Generate DTR button for Attendance Summary
  generateDTRBtn.classList.add("hidden");

  // Switch grid view
  switchView("summary");

  // Apply current filters to new view
  applyCurrentFilters();
});

// Search bar functionality
document.getElementById("search").addEventListener("input", (e) => {
  applyCurrentFilters();
});

// Cutoff Period Filter (works for both views, but UI hidden for Raw Time Logs)
document.getElementById("cutoffFilter").addEventListener("change", (e) => {
  applyCurrentFilters();
});

// Filter reset button
document.getElementById("filterBtn").addEventListener("click", () => {
  // Reset all filters
  document.getElementById("search").value = "";
  document.getElementById("cutoffFilter").value = "";
  applyCurrentFilters();
});

/**
 * Apply all current filters (search + cutoff) to the grid
 */
function applyCurrentFilters() {
  const searchValue = document.getElementById("search").value.toLowerCase();
  const cutoffValue = document.getElementById("cutoffFilter").value;

  applyDataFilter(searchValue, cutoffValue);
}

/**
 * Get filtered data based on current criteria
 */
function getFilteredData() {
  return getCurrentData();
}

// Generate DTR Modal functionality
const generateDTRModal = document.getElementById("generateDTR");
const generateDTRForm = generateDTRModal?.querySelector(".btn-primary");

if (generateDTRForm) {
  generateDTRForm.addEventListener("click", function (e) {
    e.preventDefault(); // Prevent default button behavior

    const selects = generateDTRModal.querySelectorAll("select");
    const cutoffPeriod = selects[0].value;

    console.log("Generating DTR for:", { cutoffPeriod });

    // Get selected rows from filtered data
    const selectedRows = gridApi.getSelectedRows();

    if (selectedRows.length > 0) {
      console.log("Selected rows:", selectedRows);

      // Generate DTR for selected employees
      let successCount = 0;
      let errorCount = 0;

      selectedRows.forEach((row, index) => {
        try {
          const employeeId = row["Employee ID"];
          console.log(`Generating DTR for employee ${employeeId}...`);

          const dtrInfo = generateDTR(employeeId, cutoffPeriod);

          // Add slight delay between windows to prevent browser blocking
          setTimeout(() => {
            displayDTR(dtrInfo);
          }, index * 100);

          successCount++;
        } catch (error) {
          console.error("Error generating DTR:", error);
          errorCount++;
          alert(
            `Error generating DTR for Employee ${row["Employee ID"]}: ${error.message}`
          );
        }
      });

      if (successCount > 0) {
        alert(
          ` Generated DTR for ${successCount} employee(s)\nCutoff: ${cutoffPeriod}\n\n${
            errorCount > 0
              ? ` ${errorCount} failed`
              : "Check your browser for print windows."
          }`
        );
      }
    } else {
      alert(
        " Please select at least one employee to generate DTR.\n\n Use the checkboxes in the grid to select employees."
      );
    }

    // Close modal
    generateDTRModal.close();
  });
}

// Generate CSV Modal functionality
const generateCSVModal = document.getElementById("generateCSV");
const generateCSVForm = generateCSVModal?.querySelector(".btn-primary");

if (generateCSVForm) {
  generateCSVForm.addEventListener("click", function (e) {
    e.preventDefault(); // Prevent default button behavior

    const selects = generateCSVModal.querySelectorAll("select");
    const cutoffPeriod = selects[0].value;
    const department = selects[1].value;

    const currentView = getCurrentView();
    console.log("Generating CSV for:", {
      cutoffPeriod,
      department,
      view: currentView,
    });

    // Use filtered data for CSV export
    const filteredData = getFilteredData();

    if (filteredData.length > 0) {
      exportToCSV(filteredData, cutoffPeriod, department, currentView);
      alert(
        ` Generated CSV for ${filteredData.length} rows\nView: ${
          currentView === "raw" ? "Raw Time Logs" : "Attendance Summary"
        }\nCutoff: ${cutoffPeriod}\nDepartment: ${department}`
      );
    } else {
      alert("No data to export based on current filters");
    }

    // Close modal
    generateCSVModal.close();
  });
}

/**
 * Export data to CSV file
 */
function exportToCSV(data, cutoffPeriod, department, currentView) {
  if (data.length === 0) {
    alert("No data to export");
    return;
  }

  // Get column headers (exclude internal fields)
  const headers = Object.keys(data[0]).filter(
    (header) => header !== "Cutoff Period" // Exclude cutoff period from CSV export
  );

  // Create CSV content
  let csvContent = headers.join(",") + "\n";

  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header] || "";
      // Escape quotes and wrap in quotes if contains comma
      if (
        typeof value === "string" &&
        (value.includes(",") || value.includes('"'))
      ) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvContent += values.join(",") + "\n";
  });

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  const filename = `${
    currentView === "raw" ? "Time_Logs" : "Attendance_Summary"
  }_${cutoffPeriod.replace(/\s/g, "_")}_${department.replace(/\s/g, "_")}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Debug: Log when script loads
console.log(" attendance-func.js loaded successfully");
