import { gridApi } from "./grid.js";

// Handle "View More" button clicks
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("view-more-btn")) {
    const employeeId = e.target.dataset.employee;
    showEmployeeDetails(employeeId);
  }
});

function showEmployeeDetails(employeeId) {
  let foundNode = null;

  // Convert to number for comparison
  const searchId = parseInt(employeeId, 10);

  // Search through ALL nodes
  gridApi.forEachNode((node) => {
    if (parseInt(node.data["Employee ID"], 10) === searchId) {
      foundNode = node;
    }
  });

  if (!foundNode) {
    console.error("Employee not found:", employeeId, "Parsed:", searchId);
    return;
  }

  const data = foundNode.data._rawData;

  // Get the modal
  const modal = document.getElementById("otherComputation");

  // Get all input fields in the modal
  const inputs = modal.querySelectorAll("input[readonly]");

  // Map of labels to data values
  const fieldMapping = {
    "Regular Pay": data.regular_pay,
    Overtime: data.overtime_pay,
    "Leave Pay": data.leave_pay_amount,
    "Working Hours": data.working_hours,
    Absences: data.absences_deduction,
    Tardiness: data.tardiness_deduction,
    Undertime: data.undertime_deduction,
    SSS: data.sss_deduction,
    Philhealth: data.philhealth_deduction,
    "Pag-IBIG": data.pagibig_deduction,
    "Withholding Tax": data.withholding_tax,
  };

  // Populate each input field
  inputs.forEach((input) => {
    const parentDiv = input.closest(".flex");
    if (parentDiv) {
      const labelText = parentDiv.textContent.trim();

      for (const [label, value] of Object.entries(fieldMapping)) {
        if (labelText.includes(label)) {
          if (label === "Working Hours") {
            input.value = value || "0";
          } else {
            input.value = value ? `₱${parseFloat(value).toFixed(2)}` : "₱0.00";
          }
          break;
        }
      }
    }
  });

  modal.showModal();
}

// Search functionality
document.getElementById("searchBar").addEventListener("input", (e) => {
  gridApi.setGridOption("quickFilterText", e.target.value);
});
