// Settings with Supabase Integration
// Get Supabase client
import { supabaseClient } from "../supabase/supabaseClient.js";
const supabase = supabaseClient;

// Grid APIs
let departmentsGridApi = null;
let positionsGridApi = null;
let officialTimeGridApi = null;
let cutoffGridApi = null;

// Theme management
const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
const themeClass = isDarkMode ? "ag-theme-quartz-dark" : "ag-theme-quartz";

// Apply theme to grid div
function applyTheme(gridDiv) {
  if (!gridDiv) return;
  gridDiv.classList.add(themeClass);
}

// Listen for theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    const grids = [
      "departmentsGrid",
      "positionsGrid",
      "officialTimeGrid",
      "cutoffGrid",
    ];
    grids.forEach((gridId) => {
      const gridDiv = document.getElementById(gridId);
      if (gridDiv) {
        gridDiv.classList.toggle("ag-theme-quartz-dark", e.matches);
        gridDiv.classList.toggle("ag-theme-quartz", !e.matches);
      }
    });
  });

// ========== NOTIFICATION HELPER ==========
function showNotification(message, type = "info") {
  const alertTypes = {
    success: "alert-success",
    error: "alert-error",
    warning: "alert-warning",
    info: "alert-info",
  };

  const toast = document.createElement("div");
  toast.className = `alert ${
    alertTypes[type] || "alert-info"
  } shadow-lg fixed top-4 right-4 w-auto max-w-md z-50`;
  toast.innerHTML = `<div><span>${message}</span></div>`;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Expose showNotification globally
window.showNotification = showNotification;

// ========== TAB SWITCHING ==========
function setupTabs() {
  const tabs = document.querySelectorAll('[role="tab"]');
  const tabContents = document.querySelectorAll('[id^="tab-content-"]');

  const firstTab = tabs[0];
  const firstTabContent = document.getElementById("tab-content-departments");

  if (firstTab && firstTabContent) {
    firstTab.classList.add("tab-active");
    firstTabContent.classList.remove("hidden", "opacity-0");
    firstTabContent.classList.add("opacity-100");
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      const targetTab = tab.getAttribute("data-tab");

      tabs.forEach((t) => t.classList.remove("tab-active"));
      tabContents.forEach((content) => {
        content.classList.add("hidden", "opacity-0");
        content.classList.remove("opacity-100");
      });

      tab.classList.add("tab-active");
      const targetContent = document.getElementById(`tab-content-${targetTab}`);
      if (targetContent) {
        targetContent.classList.remove("hidden", "opacity-0");
        targetContent.classList.add("opacity-100");
      }

      setTimeout(() => {
        let gridApi = null;
        switch (targetTab) {
          case "departments":
            gridApi = departmentsGridApi;
            break;
          case "positions":
            gridApi = positionsGridApi;
            break;
          case "schedules":
            gridApi = officialTimeGridApi;
            break;
          case "cutoff":
            gridApi = cutoffGridApi;
            break;
        }
        if (gridApi && typeof gridApi.sizeColumnsToFit === "function") {
          gridApi.sizeColumnsToFit();
        }
      }, 150);
    });
  });
}

// ========== DEDUCTIONS ==========
async function loadDeductionRates() {
  try {
    const { data, error } = await supabase
      .from("deduction_percentages")
      .select("*");

    if (error) throw error;

    console.log("Deduction rates loaded:", data);

    // Display current rates
    const sssRate = data?.find((d) => d.deduction_name === "SSS_RATE");
    const philhealthRate = data?.find(
      (d) => d.deduction_name === "PHILHEALTH_RATE"
    );
    const pagibigRate = data?.find((d) => d.deduction_name === "PAGIBIG_RATE");

    if (sssRate) {
      document.getElementById("currentSSSRate").textContent =
        (sssRate.percentage * 100).toFixed(2) + "%";
    }
    if (philhealthRate) {
      document.getElementById("currentPhilHealthRate").textContent =
        (philhealthRate.percentage * 100).toFixed(2) + "%";
    }
    if (pagibigRate) {
      document.getElementById("currentPagIBIGRate").textContent =
        (pagibigRate.percentage * 100).toFixed(2) + "%";
    }
  } catch (error) {
    console.error("Error loading deduction rates:", error);
    showNotification(
      "Failed to load deduction rates: " + error.message,
      "error"
    );
  }
}

// Expose loadDeductionRates globally
window.loadDeductionRates = loadDeductionRates;

// main.js

/**
 * Fetches the current deduction rates from the 'deduction_percentages' table,
 * converts them to percentages (x100), and populates the modal inputs.
 */
async function loadDeductionRatesIntoModal() {
  const { data, error } = await supabase
    .from("deduction_percentages")
    // Only fetch the name and percentage for the rates we care about
    .select("deduction_name, percentage")
    .in("deduction_name", ["SSS_RATE", "PHILHEALTH_RATE", "PAGIBIG_RATE"]);

  if (error) {
    console.error("Supabase fetch error:", error);
    showNotification(
      "Failed to load deduction rates for editing: " + error.message,
      "error"
    );
    return;
  }

  // Create a map for easy lookup
  const ratesMap = data.reduce((acc, item) => {
    // Convert decimal (e.g., 0.05) to percentage (e.g., 5.00) for display
    acc[item.deduction_name] = parseFloat(item.percentage) * 100;
    return acc;
  }, {});

  // Populate the form inputs
  document.getElementById("philhealthInput").value =
    ratesMap.PHILHEALTH_RATE || 0;
  document.getElementById("sssInput").value = ratesMap.SSS_RATE || 0;
  document.getElementById("pagibigInput").value = ratesMap.PAGIBIG_RATE || 0;
}

// Ensure the function is exposed globally for the HTML hook
window.loadDeductionRatesIntoModal = loadDeductionRatesIntoModal;

// main.js - DEDUCTIONS MODAL SUBMISSION HANDLER

// 1. Get the form element (Confirmed ID from settings.html)
const deductionsForm = document.getElementById("deductionsForm");

if (deductionsForm) {
  deductionsForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevents the form from closing immediately

    // 2. Get and validate values as percentages (e.g., 5.00 for 5%)
    const philhealthPct = parseFloat(
      document.getElementById("philhealthInput").value
    );
    const sssPct = parseFloat(document.getElementById("sssInput").value);
    const pagibigPct = parseFloat(
      document.getElementById("pagibigInput").value
    );

    if (isNaN(philhealthPct) || isNaN(sssPct) || isNaN(pagibigPct)) {
      alert("Please enter valid numbers for all rates.");
      return;
    }

    // 3. Prepare the updates (convert percentage back to decimal rate required by DB)
    const updates = [
      { name: "PHILHEALTH_RATE", percentage: philhealthPct / 100 },
      { name: "SSS_RATE", percentage: sssPct / 100 },
      { name: "PAGIBIG_RATE", percentage: pagibigPct / 100 },
    ];

    // 4. Perform multiple Supabase Updates (one for each deduction row)
    let updateErrors = [];
    for (const update of updates) {
      const { error } = await supabase
        .from("deduction_percentages") // Correct Table Name
        .update({ percentage: update.percentage })
        .eq("deduction_name", update.name); // Match by deduction name

      if (error) {
        updateErrors.push(`Failed to update ${update.name}: ${error.message}`);
      }
    }

    // 5. Handle the result
    if (updateErrors.length > 0) {
      console.error("Supabase update errors:", updateErrors);
      alert("Some rates failed to update. Check console for details.");
    } else {
      // Show success and close the modal
      alert("✅ Deduction rates updated successfully!");
      document.getElementById("deductionsModal").close();

      // Reload the data displayed on the main settings page
      if (typeof loadDeductionRates === "function") {
        loadDeductionRates();
      }
    }
  });
}

// ========== DEPARTMENTS ==========
function initializeDepartmentsGrid() {
  const gridDiv = document.getElementById("departmentsGrid");
  if (!gridDiv) {
    console.error("Departments grid div not found");
    return false;
  }

  applyTheme(gridDiv);

  const columnDefs = [
    {
      headerName: "ID",
      field: "department_id",
      width: 100,
      sortable: true,
      filter: true,
      editable: false,
    },
    {
      headerName: "Department Name",
      field: "department_name",
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: true,
      editable: true,
    },
    {
      headerName: "Actions",
      field: "actions",
      width: 140,
      pinned: "right",
      lockPosition: true,
      suppressMovable: true,
      editable: false,
      cellStyle: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px",
      },
      cellRenderer: (params) => {
        const btn = document.createElement("button");
        btn.className =
          "px-8 py-2 font-medium text-white transition-colors btn btn-error btn-sm";
        btn.textContent = "Delete";
        btn.onclick = () => deleteDepartment(params.data.department_id);
        return btn;
      },
    },
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: [],
    domLayout: "normal",
    defaultColDef: {
      resizable: true,
      filter: true,
      sortable: true,
    },
    pagination: true,
    paginationPageSize: 10,
    paginationPageSizeSelector: [10, 20, 50],
    rowHeight: 50,
    headerHeight: 50,
    onCellValueChanged: async (event) => {
      if (event.colDef.field === "department_name") {
        await updateDepartment(event.data.department_id, event.newValue);
      }
    },
  };

  try {
    const api = agGrid.createGrid(gridDiv, gridOptions);
    departmentsGridApi = api || gridOptions.api || null;
    console.log("Departments grid initialized:", !!departmentsGridApi);

    loadDepartments();
    return true;
  } catch (error) {
    console.error("Error initializing departments grid:", error);
    return false;
  }
}

async function loadDepartments() {
  try {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("department_id", { ascending: true });

    if (error) throw error;

    console.log("Departments loaded:", data);

    if (departmentsGridApi) {
      if (typeof departmentsGridApi.setGridOption === "function") {
        departmentsGridApi.setGridOption("rowData", data || []);
      } else if (typeof departmentsGridApi.setRowData === "function") {
        departmentsGridApi.setRowData(data || []);
      }

      setTimeout(() => {
        if (departmentsGridApi.sizeColumnsToFit) {
          departmentsGridApi.sizeColumnsToFit();
        }
      }, 100);

      const countElement = document.getElementById("departmentsCount");
      if (countElement) {
        countElement.textContent = data?.length || 0;
      }
    }
  } catch (error) {
    console.error("Error loading departments:", error);
    showNotification("Failed to load departments: " + error.message, "error");
  }
}

async function updateDepartment(id, newName) {
  try {
    // Get old department name before updating
    const { data: oldDepartment, error: fetchError } = await supabase
      .from("departments")
      .select("department_name")
      .eq("department_id", id)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from("departments")
      .update({ department_name: newName })
      .eq("department_id", id);

    if (error) throw error;

    // Log to Audit Trail
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("audit_trail").insert({
        user_id: user?.id,
        action: "edit",
        description: `Updated department name from "${oldDepartment?.department_name}" to "${newName}"`,
        module_affected: "Settings",
        record_id: id,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error("Error logging audit trail:", auditError);
      // Don't throw error - department was updated successfully
    }

    showNotification("Department updated successfully!", "success");
  } catch (error) {
    console.error("Error updating department:", error);
    showNotification("Failed to update department: " + error.message, "error");
    await loadDepartments(); // Reload to revert changes
  }
}

async function deleteDepartment(id) {
  if (!confirm("Are you sure you want to delete this department?")) return;
  try {
    // Get department name before deleting
    const { data: department, error: fetchError } = await supabase
      .from("departments")
      .select("department_name")
      .eq("department_id", id)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from("departments")
      .delete()
      .eq("department_id", id);

    if (error) throw error;

    // Log to Audit Trail
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("audit_trail").insert({
        user_id: user?.id,
        action: "delete",
        description: `Deleted department: ${
          department?.department_name || `ID ${id}`
        }`,
        module_affected: "Settings",
        record_id: id,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error("Error logging audit trail:", auditError);
      // Don't throw error - department was deleted successfully
    }

    showNotification("Department deleted successfully!", "success");
    await loadDepartments();
  } catch (error) {
    console.error("Error deleting department:", error);
    showNotification("Failed to delete department: " + error.message, "error");
  }
}

// ========== POSITIONS ==========
// Load departments into dropdown for position modal
window.loadDepartmentsIntoDropdown = async function () {
  try {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("department_name", { ascending: true });

    if (error) throw error;

    const select = document.getElementById("positionDepartment");
    select.innerHTML =
      '<option value="" disabled selected>Select department</option>';

    data.forEach((dept) => {
      const option = document.createElement("option");
      option.value = dept.department_id;
      option.textContent = dept.department_name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading departments:", error);
    showNotification("Failed to load departments: " + error.message, "error");
  }
};

function initializePositionsGrid() {
  const gridDiv = document.getElementById("positionsGrid");
  if (!gridDiv) {
    console.error("Positions grid div not found");
    return false;
  }

  applyTheme(gridDiv);

  const columnDefs = [
    {
      headerName: "ID",
      field: "position_id",
      width: 80,
      sortable: true,
      filter: true,
      editable: false,
    },
    {
      headerName: "Position",
      field: "position_name",
      flex: 1,
      minWidth: 180,
      sortable: true,
      filter: true,
      editable: true,
    },
    {
      headerName: "Department",
      field: "department_name",
      width: 180,
      sortable: true,
      filter: true,
      editable: false,
      valueGetter: (params) => {
        return params.data.departments?.department_name || "N/A";
      },
    },
    {
      headerName: "Rank",
      field: "pos_rank",
      width: 100,
      sortable: true,
      filter: true,
      editable: true,
      cellEditor: "agNumberCellEditor",
      cellEditorParams: {
        min: 1,
        precision: 0,
      },
    },
    {
      headerName: "Base Salary",
      field: "base_salary",
      width: 150,
      sortable: true,
      filter: true,
      editable: true,
      cellEditor: "agNumberCellEditor",
      cellEditorParams: {
        min: 0,
        precision: 2,
      },
      valueFormatter: (params) => {
        const value = params.value || 0;
        return (
          "₱" +
          Number(value).toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        );
      },
    },
    {
      headerName: "Actions",
      field: "actions",
      width: 140,
      pinned: "right",
      lockPosition: true,
      suppressMovable: true,
      editable: false,
      cellStyle: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px",
      },
      cellRenderer: (params) => {
        const deleteBtn = document.createElement("button");
        deleteBtn.className =
          "px-8 py-2 font-medium text-white transition-colors btn btn-error btn-sm";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () =>
          deletePosition(params.data.position_id)
        );
        return deleteBtn;
      },
    },
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: [],
    domLayout: "normal",
    defaultColDef: {
      resizable: true,
      filter: true,
      sortable: true,
    },
    pagination: true,
    paginationPageSize: 10,
    paginationPageSizeSelector: [10, 20, 50],
    rowHeight: 50,
    headerHeight: 50,
    onCellValueChanged: async (event) => {
      const field = event.colDef.field;
      if (
        field === "position_name" ||
        field === "pos_rank" ||
        field === "base_salary"
      ) {
        await updatePosition(event.data.position_id, field, event.newValue);
      }
    },
  };

  try {
    const api = agGrid.createGrid(gridDiv, gridOptions);
    positionsGridApi = api || gridOptions.api || null;
    console.log("Positions grid initialized:", !!positionsGridApi);

    loadPositions();
    return true;
  } catch (error) {
    console.error("Error initializing positions grid:", error);
    return false;
  }
}

async function loadPositions() {
  try {
    const { data, error } = await supabase
      .from("positions")
      .select("*, departments(department_name)")
      .order("pos_rank", { ascending: false });

    if (error) throw error;

    console.log("Positions loaded:", data);

    if (positionsGridApi) {
      if (typeof positionsGridApi.setGridOption === "function") {
        positionsGridApi.setGridOption("rowData", data || []);
      } else if (typeof positionsGridApi.setRowData === "function") {
        positionsGridApi.setRowData(data || []);
      }

      setTimeout(() => {
        if (positionsGridApi.sizeColumnsToFit) {
          positionsGridApi.sizeColumnsToFit();
        }
      }, 100);

      const countElement = document.getElementById("positionsCount");
      if (countElement) {
        countElement.textContent = data?.length || 0;
      }
    }
  } catch (error) {
    console.error("Error loading positions:", error);
    showNotification("Failed to load positions: " + error.message, "error");
  }
}

async function updatePosition(id, field, newValue) {
  try {
    // Get old position data before updating
    const { data: oldPosition, error: fetchError } = await supabase
      .from("positions")
      .select("position_name, pos_rank")
      .eq("position_id", id)
      .single();

    if (fetchError) throw fetchError;

    // Check if rank already exists for another position
    if (field === "pos_rank") {
      const { data: existing, error: checkError } = await supabase
        .from("positions")
        .select("position_id")
        .eq("pos_rank", newValue)
        .neq("position_id", id);
      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        showNotification(
          "Rank " + newValue + " is already assigned to another position!",
          "error"
        );
        await loadPositions(); // Reload to revert changes
        return;
      }
    }

    const updateData = {};
    updateData[field] = newValue;
    const { error } = await supabase
      .from("positions")
      .update(updateData)
      .eq("position_id", id);
    if (error) throw error;

    // Log to Audit Trail
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Build description based on field changed
      let description = "";
      const positionName = oldPosition?.position_name || `Position ID ${id}`;

      if (field === "position_name") {
        description = `Updated position name from "${oldPosition?.position_name}" to "${newValue}"`;
      } else if (field === "pos_rank") {
        description = `Updated position rank for "${positionName}" from ${oldPosition?.pos_rank} to ${newValue}`;
      } else {
        description = `Updated ${field} for position "${positionName}" to "${newValue}"`;
      }

      await supabase.from("audit_trail").insert({
        user_id: user?.id,
        action: "edit",
        description: description,
        module_affected: "Settings",
        record_id: id,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error("Error logging audit trail:", auditError);
      // Don't throw error - position was updated successfully
    }

    showNotification("Position updated successfully!", "success");
    await loadPositions(); // Reload to show updated data
  } catch (error) {
    console.error("Error updating position:", error);
    showNotification("Failed to update position: " + error.message, "error");
    await loadPositions(); // Reload to revert changes
  }
}

async function deletePosition(id) {
  if (!confirm("Are you sure you want to delete this position?")) return;
  try {
    // Get position data before deleting
    const { data: position, error: fetchError } = await supabase
      .from("positions")
      .select("position_name, pos_rank")
      .eq("position_id", id)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from("positions")
      .delete()
      .eq("position_id", id);

    if (error) throw error;

    // Log to Audit Trail
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("audit_trail").insert({
        user_id: user?.id,
        action: "delete",
        description: `Deleted position: ${
          position?.position_name || `ID ${id}`
        } (Rank: ${position?.pos_rank || "N/A"})`,
        module_affected: "Settings",
        record_id: id,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error("Error logging audit trail:", auditError);
      // Don't throw error - position was deleted successfully
    }

    showNotification("Position deleted successfully!", "success");
    await loadPositions();
  } catch (error) {
    console.error("Error deleting position:", error);
    showNotification("Failed to delete position: " + error.message, "error");
  }
}

// ========== SCHEDULES ==========
function initializeOfficialTimeGrid() {
  const gridDiv = document.getElementById("officialTimeGrid");
  if (!gridDiv) {
    console.error("Official time grid div not found");
    return false;
  }

  applyTheme(gridDiv);

  const columnDefs = [
    {
      headerName: "ID",
      field: "official_time_id",
      width: 100,
      sortable: true,
      filter: true,
      editable: false,
    },
    {
      headerName: "Schedule Name",
      field: "schedule_name",
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: true,
      editable: true,
    },
    {
      headerName: "Start Time",
      field: "start_time",
      width: 120,
      sortable: true,
      filter: true,
      editable: true,
    },
    {
      headerName: "End Time",
      field: "end_time",
      width: 120,
      sortable: true,
      filter: true,
      editable: true,
    },
    {
      headerName: "Actions",
      field: "actions",
      width: 140,
      pinned: "right",
      lockPosition: true,
      suppressMovable: true,
      editable: false,
      cellStyle: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px",
      },
      cellRenderer: (params) => {
        const deleteBtn = document.createElement("button");
        deleteBtn.className =
          "px-8 py-2 font-medium text-white transition-colors btn btn-error btn-sm";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () =>
          deleteSchedule(params.data.official_time_id)
        );
        return deleteBtn;
      },
    },
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: [],
    domLayout: "normal",
    defaultColDef: {
      resizable: true,
      filter: true,
      sortable: true,
    },
    pagination: true,
    paginationPageSize: 10,
    paginationPageSizeSelector: [10, 20, 50],
    rowHeight: 50,
    headerHeight: 50,
    onCellValueChanged: async (event) => {
      const field = event.colDef.field;
      if (
        field === "schedule_name" ||
        field === "start_time" ||
        field === "end_time"
      ) {
        await updateSchedule(
          event.data.official_time_id,
          field,
          event.newValue
        );
      }
    },
  };

  try {
    const api = agGrid.createGrid(gridDiv, gridOptions);
    officialTimeGridApi = api || gridOptions.api || null;
    console.log("Schedules grid initialized:", !!officialTimeGridApi);

    loadOfficialTime();
    return true;
  } catch (error) {
    console.error("Error initializing schedules grid:", error);
    return false;
  }
}

async function loadOfficialTime() {
  try {
    const { data, error } = await supabase
      .from("official_time")
      .select("*")
      .order("official_time_id", { ascending: true });

    if (error) throw error;

    console.log("Schedules loaded:", data);

    if (officialTimeGridApi) {
      if (typeof officialTimeGridApi.setGridOption === "function") {
        officialTimeGridApi.setGridOption("rowData", data || []);
      } else if (typeof officialTimeGridApi.setRowData === "function") {
        officialTimeGridApi.setRowData(data || []);
      }

      setTimeout(() => {
        if (officialTimeGridApi.sizeColumnsToFit) {
          officialTimeGridApi.sizeColumnsToFit();
        }
      }, 100);

      const countElement = document.getElementById("schedulesCount");
      if (countElement) {
        countElement.textContent = data?.length || 0;
      }
    }
  } catch (error) {
    console.error("Error loading schedules:", error);
    showNotification("Failed to load schedules: " + error.message, "error");
  }
}

async function updateSchedule(id, field, newValue) {
  try {
    // Get old schedule data before updating
    const { data: oldSchedule, error: fetchError } = await supabase
      .from("official_time")
      .select("schedule_name, start_time, end_time")
      .eq("official_time_id", id)
      .single();

    if (fetchError) throw fetchError;

    const updateData = {};
    updateData[field] = newValue;
    const { error } = await supabase
      .from("official_time")
      .update(updateData)
      .eq("official_time_id", id);
    if (error) throw error;

    // Log to Audit Trail
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Build description based on field changed
      let description = "";
      const scheduleName = oldSchedule?.schedule_name || `Schedule ID ${id}`;
      const oldValue = oldSchedule?.[field];

      if (field === "schedule_name") {
        description = `Updated schedule name from "${oldValue}" to "${newValue}"`;
      } else if (field === "start_time") {
        description = `Updated start time for "${scheduleName}" from ${oldValue} to ${newValue}`;
      } else if (field === "end_time") {
        description = `Updated end time for "${scheduleName}" from ${oldValue} to ${newValue}`;
      } else {
        description = `Updated ${field} for schedule "${scheduleName}" from "${oldValue}" to "${newValue}"`;
      }

      await supabase.from("audit_trail").insert({
        user_id: user?.id,
        action: "edit",
        description: description,
        module_affected: "Settings",
        record_id: id,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error("Error logging audit trail:", auditError);
      // Don't throw error - schedule was updated successfully
    }

    showNotification("Schedule updated successfully!", "success");
  } catch (error) {
    console.error("Error updating schedule:", error);
    showNotification("Failed to update schedule: " + error.message, "error");
    await loadOfficialTime(); // Reload to revert changes
  }
}

async function deleteSchedule(id) {
  if (!confirm("Are you sure you want to delete this schedule?")) return;
  try {
    // Get schedule data before deleting
    const { data: schedule, error: fetchError } = await supabase
      .from("official_time")
      .select("schedule_name, start_time, end_time")
      .eq("official_time_id", id)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from("official_time")
      .delete()
      .eq("official_time_id", id);

    if (error) throw error;

    // Log to Audit Trail
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("audit_trail").insert({
        user_id: user?.id,
        action: "delete",
        description: `Deleted schedule: ${
          schedule?.schedule_name || `ID ${id}`
        } (${schedule?.start_time || "N/A"} - ${schedule?.end_time || "N/A"})`,
        module_affected: "Settings",
        record_id: id,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error("Error logging audit trail:", auditError);
      // Don't throw error - schedule was deleted successfully
    }

    showNotification("Schedule deleted successfully!", "success");
    await loadOfficialTime();
  } catch (error) {
    console.error("Error deleting schedule:", error);
    showNotification("Failed to delete schedule: " + error.message, "error");
  }
}

// ========== CUTOFF ==========
function initializeCutoffGrid() {
  const gridDiv = document.getElementById("cutoffGrid");
  if (!gridDiv) {
    console.error("Cutoff grid div not found");
    return false;
  }

  applyTheme(gridDiv);

  const columnDefs = [
    {
      headerName: "ID",
      field: "cutoff_id",
      width: 100,
      sortable: true,
      filter: true,
      editable: false,
    },
    {
      headerName: "Start Date",
      field: "cutoff_start_date",
      flex: 1,
      minWidth: 150,
      sortable: true,
      filter: true,
      editable: true,
      cellEditor: "agDateStringCellEditor",
      valueFormatter: (params) => {
        if (!params.value) return "";
        return new Date(params.value).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      },
    },
    {
      headerName: "End Date",
      field: "cutoff_end_date",
      flex: 1,
      minWidth: 150,
      sortable: true,
      filter: true,
      editable: true,
      cellEditor: "agDateStringCellEditor",
      valueFormatter: (params) => {
        if (!params.value) return "";
        return new Date(params.value).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      },
    },
    {
      headerName: "Actions",
      field: "actions",
      width: 140,
      pinned: "right",
      lockPosition: true,
      suppressMovable: true,
      editable: false,
      cellStyle: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px",
      },
      cellRenderer: (params) => {
        const deleteBtn = document.createElement("button");
        deleteBtn.className =
          "px-8 py-2 font-medium text-white transition-colors btn btn-error btn-sm";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () =>
          deleteCutoff(params.data.cutoff_id)
        );
        return deleteBtn;
      },
    },
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: [],
    domLayout: "normal",
    defaultColDef: {
      resizable: true,
      filter: true,
      sortable: true,
    },
    pagination: true,
    paginationPageSize: 10,
    paginationPageSizeSelector: [10, 20, 50],
    rowHeight: 50,
    headerHeight: 50,
    onCellValueChanged: async (event) => {
      const field = event.colDef.field;
      if (field === "cutoff_start_date" || field === "cutoff_end_date") {
        await updateCutoff(event.data.cutoff_id, field, event.newValue);
      }
    },
  };

  try {
    const api = agGrid.createGrid(gridDiv, gridOptions);
    cutoffGridApi = api || gridOptions.api || null;
    console.log("Cutoff grid initialized:", !!cutoffGridApi);

    loadCutoffPeriods();
    return true;
  } catch (error) {
    console.error("Error initializing cutoff grid:", error);
    return false;
  }
}

async function loadCutoffPeriods() {
  try {
    const { data, error } = await supabase
      .from("cutoffs")
      .select("*")
      .order("cutoff_start_date", { ascending: false });

    if (error) throw error;

    console.log("Cutoff periods loaded:", data);

    if (cutoffGridApi) {
      if (typeof cutoffGridApi.setGridOption === "function") {
        cutoffGridApi.setGridOption("rowData", data || []);
      } else if (typeof cutoffGridApi.setRowData === "function") {
        cutoffGridApi.setRowData(data || []);
      }

      setTimeout(() => {
        if (cutoffGridApi.sizeColumnsToFit) {
          cutoffGridApi.sizeColumnsToFit();
        }
      }, 100);

      const countElement = document.getElementById("cutoffCount");
      if (countElement) {
        countElement.textContent = data?.length || 0;
      }
    }
  } catch (error) {
    console.error("Error loading cutoff periods:", error);
    showNotification(
      "Failed to load cutoff periods: " + error.message,
      "error"
    );
  }
}

async function updateCutoff(id, field, newValue) {
  try {
    // Get old cutoff data before updating
    const { data: oldCutoff, error: fetchError } = await supabase
      .from("cutoffs")
      .select("cutoff_start_date, cutoff_end_date")
      .eq("cutoff_id", id)
      .single();

    if (fetchError) throw fetchError;

    const updateData = {};
    updateData[field] = newValue;
    const { error } = await supabase
      .from("cutoffs")
      .update(updateData)
      .eq("cutoff_id", id);
    if (error) throw error;

    // Log to Audit Trail
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Build description based on field changed
      let description = "";
      const cutoffPeriod = `${oldCutoff?.cutoff_start_date} to ${oldCutoff?.cutoff_end_date}`;
      const oldValue = oldCutoff?.[field];

      if (field === "cutoff_start_date") {
        description = `Updated cutoff start date from ${oldValue} to ${newValue} (Period: ${cutoffPeriod})`;
      } else if (field === "cutoff_end_date") {
        description = `Updated cutoff end date from ${oldValue} to ${newValue} (Period: ${cutoffPeriod})`;
      } else {
        description = `Updated ${field} for cutoff period "${cutoffPeriod}" from "${oldValue}" to "${newValue}"`;
      }

      await supabase.from("audit_trail").insert({
        user_id: user?.id,
        action: "edit",
        description: description,
        module_affected: "Settings",
        record_id: id,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error("Error logging audit trail:", auditError);
      // Don't throw error - cutoff was updated successfully
    }

    showNotification("Cutoff period updated successfully!", "success");
  } catch (error) {
    console.error("Error updating cutoff period:", error);
    showNotification(
      "Failed to update cutoff period: " + error.message,
      "error"
    );
    await loadCutoffPeriods(); // Reload to revert changes
  }
}

async function deleteCutoff(id) {
  if (!confirm("Are you sure you want to delete this cutoff period?")) return;
  try {
    // Get cutoff data before deleting
    const { data: cutoff, error: fetchError } = await supabase
      .from("cutoffs")
      .select("cutoff_start_date, cutoff_end_date")
      .eq("cutoff_id", id)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from("cutoffs")
      .delete()
      .eq("cutoff_id", id);

    if (error) throw error;

    // Log to Audit Trail
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const cutoffPeriod = cutoff
        ? `${cutoff.cutoff_start_date} to ${cutoff.cutoff_end_date}`
        : `ID ${id}`;

      await supabase.from("audit_trail").insert({
        user_id: user?.id,
        action: "delete",
        description: `Deleted cutoff period: ${cutoffPeriod}`,
        module_affected: "Settings",
        record_id: id,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error("Error logging audit trail:", auditError);
      // Don't throw error - cutoff was deleted successfully
    }

    showNotification("Cutoff period deleted successfully!", "success");
    await loadCutoffPeriods();
  } catch (error) {
    console.error("Error deleting cutoff period:", error);
    showNotification(
      "Failed to delete cutoff period: " + error.message,
      "error"
    );
  }
}

// ========== FORM HANDLERS ==========
document
  .getElementById("addDepartmentForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("departmentName");
    const name = nameInput.value.trim();

    if (!name) {
      showNotification("Please enter a department name", "warning");
      return;
    }

    try {
      const { error } = await supabase
        .from("departments")
        .insert([{ department_name: name }]);

      if (error) throw error;

      // Log to Audit Trail
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        await supabase.from("audit_trail").insert({
          user_id: user?.id,
          action: "create",
          description: `Created new department: ${name}`,
          module_affected: "Settings",
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        });
      } catch (auditError) {
        console.error("Error logging audit trail:", auditError);
        // Don't throw error - department was created successfully
      }

      showNotification("Department added successfully!", "success");
      nameInput.value = "";
      document.getElementById("departmentModal").close();
      await loadDepartments();
    } catch (error) {
      console.error("Error adding department:", error);
      showNotification("Failed to add department: " + error.message, "error");
    }
  });

document
  .getElementById("addPositionForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("positionName");
    const deptSelect = document.getElementById("positionDepartment");
    const rankInput = document.getElementById("positionRank");
    const salaryInput = document.getElementById("positionSalary");
    const name = nameInput.value.trim();
    const departmentId = parseInt(deptSelect.value);
    const rank = parseInt(rankInput.value);
    const salary = parseFloat(salaryInput.value);
    if (
      !name ||
      !departmentId ||
      isNaN(rank) ||
      rank < 1 ||
      isNaN(salary) ||
      salary < 0
    ) {
      showNotification("Please enter valid position details", "warning");
      return;
    }
    try {
      // Check if rank already exists
      const { data: existing, error: checkError } = await supabase
        .from("positions")
        .select("position_id")
        .eq("pos_rank", rank);
      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        showNotification(
          "Rank " + rank + " is already assigned to another position!",
          "error"
        );
        return;
      }
      const { data: newPosition, error } = await supabase
        .from("positions")
        .insert([
          {
            position_name: name,
            department_id: departmentId,
            pos_rank: rank,
            base_salary: salary,
          },
        ])
        .select()
        .single();
      if (error) throw error;

      // Log to Audit Trail
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        await supabase.from("audit_trail").insert({
          user_id: user?.id,
          action: "create",
          description: `Created new position: ${name} (Rank: ${rank}, Base Salary: ${salary})`,
          module_affected: "Settings",
          record_id: newPosition?.position_id || null,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        });
      } catch (auditError) {
        console.error("Error logging audit trail:", auditError);
        // Don't throw error - position was created successfully
      }

      showNotification("Position added successfully!", "success");
      nameInput.value = "";
      deptSelect.value = "";
      rankInput.value = "";
      salaryInput.value = "";
      document.getElementById("positionModal").close();
      await loadPositions();
    } catch (error) {
      console.error("Error adding position:", error);
      showNotification("Failed to add position: " + error.message, "error");
    }
  });

document
  .getElementById("addOfficialTimeForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("scheduleName");
    const startInput = document.getElementById("startTime");
    const endInput = document.getElementById("endTime");
    const name = nameInput.value.trim();
    const start = startInput.value;
    const end = endInput.value;
    if (!name || !start || !end) {
      showNotification("Please fill all fields", "warning");
      return;
    }
    try {
      const { data: newSchedule, error } = await supabase
        .from("official_time")
        .insert([{ schedule_name: name, start_time: start, end_time: end }])
        .select()
        .single();
      if (error) throw error;

      // Log to Audit Trail
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        await supabase.from("audit_trail").insert({
          user_id: user?.id,
          action: "create",
          description: `Created new schedule: ${name} (${start} - ${end})`,
          module_affected: "Settings",
          record_id: newSchedule?.official_time_id || null,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        });
      } catch (auditError) {
        console.error("Error logging audit trail:", auditError);
        // Don't throw error - schedule was created successfully
      }

      showNotification("Schedule added successfully!", "success");
      nameInput.value = "";
      startInput.value = "";
      endInput.value = "";
      document.getElementById("scheduleModal").close();
      await loadOfficialTime();
    } catch (error) {
      console.error("Error adding schedule:", error);
      showNotification("Failed to add schedule: " + error.message, "error");
    }
  });

document
  .getElementById("addCutoffForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const startInput = document.getElementById("cutoffStartDate");
    const endInput = document.getElementById("cutoffEndDate");
    const start = startInput.value;
    const end = endInput.value;
    if (!start || !end) {
      showNotification("Please select both dates", "warning");
      return;
    }
    if (new Date(start) >= new Date(end)) {
      showNotification("End date must be after start date", "warning");
      return;
    }
    try {
      const { data: newCutoff, error } = await supabase
        .from("cutoffs")
        .insert([{ cutoff_start_date: start, cutoff_end_date: end }])
        .select()
        .single();
      if (error) throw error;

      // Log to Audit Trail
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        await supabase.from("audit_trail").insert({
          user_id: user?.id,
          action: "create",
          description: `Created new cutoff period: ${start} to ${end}`,
          module_affected: "Settings",
          record_id: newCutoff?.cutoff_id || null,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        });
      } catch (auditError) {
        console.error("Error logging audit trail:", auditError);
        // Don't throw error - cutoff was created successfully
      }

      showNotification("Cutoff period added successfully!", "success");
      startInput.value = "";
      endInput.value = "";
      document.getElementById("cutoffModal").close();
      await loadCutoffPeriods();
    } catch (error) {
      console.error("Error adding cutoff period:", error);
      showNotification(
        "Failed to add cutoff period: " + error.message,
        "error"
      );
    }
  });

// Search functionality
document.getElementById("searchDepartments")?.addEventListener("input", (e) => {
  if (departmentsGridApi && departmentsGridApi.setGridOption) {
    departmentsGridApi.setGridOption("quickFilterText", e.target.value);
  }
});

document.getElementById("searchPositions")?.addEventListener("input", (e) => {
  if (positionsGridApi && positionsGridApi.setGridOption) {
    positionsGridApi.setGridOption("quickFilterText", e.target.value);
  }
});

document
  .getElementById("searchOfficialTime")
  ?.addEventListener("input", (e) => {
    if (officialTimeGridApi && officialTimeGridApi.setGridOption) {
      officialTimeGridApi.setGridOption("quickFilterText", e.target.value);
    }
  });

document.getElementById("searchCutoff")?.addEventListener("input", (e) => {
  if (cutoffGridApi && cutoffGridApi.setGridOption) {
    cutoffGridApi.setGridOption("quickFilterText", e.target.value);
  }
});

// ========== INITIALIZATION ==========
function initializeSettings() {
  console.log("Initializing Settings page...");

  if (!supabase) {
    console.error("Supabase client not initialized!");
    showNotification(
      "Database connection failed. Please check your configuration.",
      "error"
    );
    return;
  }

  if (typeof agGrid === "undefined" || !agGrid.createGrid) {
    console.error("AG Grid not loaded! Retrying in 500ms...");
    setTimeout(initializeSettings, 500);
    return;
  }

  console.log("AG Grid library loaded successfully");

  setupTabs();

  try {
    console.log("Initializing grids...");

    initializeDepartmentsGrid();
    initializePositionsGrid();
    initializeOfficialTimeGrid();
    initializeCutoffGrid();

    // Load deduction rates
    loadDeductionRates();

    console.log("All grids initialized successfully");
  } catch (error) {
    console.error("Error during initialization:", error);
    showNotification("Error initializing page: " + error.message, "error");
  }
}

// Start initialization
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSettings);
} else {
  initializeSettings();
}
