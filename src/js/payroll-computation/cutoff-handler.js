import { supabaseClient } from "../supabase/supabaseClient.js";
import { gridApi } from "./grid.js";

// Fetch all cutoffs from the database
export async function fetchCutoffs() {
  try {
    const { data, error } = await supabaseClient
      .from("cutoffs")
      .select("*")
      .order("cutoff_start_date", { ascending: false });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error fetching cutoffs:", error);
    return [];
  }
}

// Populate the cutoff dropdown
export async function populateCutoffDropdown() {
  const cutoffSelect = document.getElementById("cutoffSelect");

  if (!cutoffSelect) {
    console.error("Cutoff select element not found");
    return;
  }

  // Fetch cutoffs from database
  const cutoffs = await fetchCutoffs();

  // Clear existing options
  cutoffSelect.innerHTML = '<option value="all">All Cutoff</option>';

  // Add cutoffs to dropdown
  cutoffs.forEach((cutoff) => {
    const option = document.createElement("option");
    option.value = cutoff.cutoff_id;
    option.textContent = `${cutoff.cutoff_start_date} to ${cutoff.cutoff_end_date}`;
    cutoffSelect.appendChild(option);
  });
}

// Handle cutoff filter change - Filter by Cutoff ID
export function setupCutoffFilter() {
  const cutoffSelect = document.getElementById("cutoffSelect");

  cutoffSelect.addEventListener("change", (e) => {
    const selectedValue = e.target.value;

    console.log("Selected cutoff ID:", selectedValue);

    if (selectedValue === "all") {
      // Clear all filters
      gridApi.setFilterModel(null);
      console.log("Filter cleared - showing all records");
    } else {
      // Filter by the Cutoff ID column
      const cutoffId = parseInt(selectedValue, 10);

      console.log("Filtering by cutoff ID:", cutoffId);

      // Debug: Check what cutoff IDs are available
      let foundIds = new Set();
      gridApi.forEachNode((node) => {
        foundIds.add(node.data["Cutoff ID"]);
      });
      console.log("Available cutoff IDs in grid:", Array.from(foundIds));

      // Apply filter to Cutoff ID column
      gridApi.setFilterModel({
        "Cutoff ID": {
          filterType: "number",
          type: "equals",
          filter: cutoffId,
        },
      });

      // Log how many rows match after filtering
      let matchCount = 0;
      gridApi.forEachNodeAfterFilter((node) => {
        matchCount++;
      });
      console.log("Rows after filter:", matchCount);
    }
  });
}
