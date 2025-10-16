import { gridApi } from "./grid.js";

//Opens the modal for other computation
document.addEventListener("click", (e) => {
  if (e.target && e.target.classList.contains("view-more-btn")) {
    const employeeId = e.target.getAttribute("data-employee");

    // Open the modal
    otherComputation.showModal();
  }
});

// Search bar functionality
document.getElementById("searchBar").addEventListener("input", (e) => {
  const value = e.target.value;
  gridApi.setGridOption("quickFilterText", value);
});

// Cutoff Period Filter
document.getElementById("cutoffSelect").addEventListener("change", (e) => {
  const value = e.target.value;

  if (value === "All") {
    // Clear filter if "All Cutoffs" selected
    gridApi.setColumnFilterModel("Cutoff Period", null);
  } else {
    // Apply filter to the "Cutoff Period" column
    gridApi.setColumnFilterModel("Cutoff Period", {
      filterType: "text",
      type: "contains",
      filter: value,
    });
  }

  // Refresh grid to apply the change
  gridApi.onFilterChanged();
});
