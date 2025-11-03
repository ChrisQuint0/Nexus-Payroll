// Settings with Supabase Integration - WORKING VERSION
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
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  const grids = ["departmentsGrid", "positionsGrid", "officialTimeGrid", "cutoffGrid"];
  grids.forEach((gridId) => {
    const gridDiv = document.getElementById(gridId);
    if (gridDiv) {
      gridDiv.classList.toggle("ag-theme-quartz-dark", e.matches);
      gridDiv.classList.toggle("ag-theme-quartz", !e.matches);
    }
  });
});

// ========== NOTIFICATION HELPER ==========
function showNotification(message, type = 'info') {
  const alertTypes = {
    'success': 'alert-success',
    'error': 'alert-error',
    'warning': 'alert-warning',
    'info': 'alert-info'
  };

  const toast = document.createElement('div');
  toast.className = `alert ${alertTypes[type] || 'alert-info'} shadow-lg fixed top-4 right-4 w-auto max-w-md z-50`;
  toast.innerHTML = `<div><span>${message}</span></div>`;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ========== TAB SWITCHING ==========
function setupTabs() {
  const tabs = document.querySelectorAll('[role="tab"]');
  const tabContents = document.querySelectorAll('[id^="tab-content-"]');
  
  // Activate the first tab by default
  const firstTab = tabs[0];
  const firstTabContent = document.getElementById('tab-content-departments');

  if (firstTab && firstTabContent) {
    firstTab.classList.add('tab-active');
    firstTabContent.classList.remove('hidden', 'opacity-0');
    firstTabContent.classList.add('opacity-100');
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = tab.getAttribute('data-tab');
      
      // Deactivate all tabs and hide all content
      tabs.forEach((t) => t.classList.remove('tab-active'));
      tabContents.forEach((content) => {
        content.classList.add('hidden', 'opacity-0');
        content.classList.remove('opacity-100');
      });
      
      // Activate the clicked tab and show its content
      tab.classList.add('tab-active');
      const targetContent = document.getElementById(`tab-content-${targetTab}`);
      if (targetContent) {
        targetContent.classList.remove('hidden', 'opacity-0');
        targetContent.classList.add('opacity-100');
      }
      
      // Resize grid columns after tab switch
      setTimeout(() => {
        let gridApi = null;
        switch(targetTab) {
          case 'departments': gridApi = departmentsGridApi; break;
          case 'positions':   gridApi = positionsGridApi; break;
          case 'schedules':   gridApi = officialTimeGridApi; break;
          case 'cutoff':      gridApi = cutoffGridApi; break;
        }
        if (gridApi && typeof gridApi.sizeColumnsToFit === 'function') {
          gridApi.sizeColumnsToFit();
        }
      }, 150); // A slight delay to ensure the container is visible
    });
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
      filter: true
    },
    { 
      headerName: "Department Name", 
      field: "department_name", 
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: true
    },
    {
      headerName: "Actions",
      field: "actions",
      width: 140,
      pinned: "right",
      lockPosition: true,
      suppressMovable: true,
      cellStyle: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px",
      },
      cellRenderer: (params) => {
        const btn = document.createElement("button");
        btn.className = "px-8 py-2 font-medium text-white transition-colors btn btn-error btn-sm";
        btn.textContent = "Delete";
        btn.onclick = () => deleteDepartment(params.data.department_id);
        return btn;
      },
    },
  ];
  
  const gridOptions = {
    columnDefs: columnDefs,
    rowData: [],
    domLayout: 'normal',
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
  };

  try {
    const api = agGrid.createGrid(gridDiv, gridOptions);
    departmentsGridApi = api || gridOptions.api || null;
    console.log("Departments grid initialized:", !!departmentsGridApi);
    
    // Load data after grid is ready
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
      .from('departments')
      .select('*')
      .order('department_id', { ascending: true });

    if (error) throw error;

    console.log("Departments loaded:", data);

    if (departmentsGridApi) {
      if (typeof departmentsGridApi.setGridOption === 'function') {
        departmentsGridApi.setGridOption("rowData", data || []);
      } else if (typeof departmentsGridApi.setRowData === 'function') {
        departmentsGridApi.setRowData(data || []);
      }
      
      setTimeout(() => {
        if (departmentsGridApi.sizeColumnsToFit) {
          departmentsGridApi.sizeColumnsToFit();
        }
      }, 100);
      
      const countElement = document.getElementById('departmentsCount');
      if (countElement) {
        countElement.textContent = data?.length || 0;
      }
    }
  } catch (error) {
    console.error('Error loading departments:', error);
    showNotification('Failed to load departments: ' + error.message, 'error');
  }
}

async function deleteDepartment(id) {
  if (!confirm("Are you sure you want to delete this department?")) return;

  try {
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('department_id', id);

    if (error) throw error;

    showNotification("Department deleted successfully!", 'success');
    await loadDepartments();
  } catch (error) {
    console.error('Error deleting department:', error);
    showNotification('Failed to delete department: ' + error.message, 'error');
  }
}

// ========== POSITIONS ==========
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
      width: 100,
      sortable: true,
      filter: true
    },
    { 
      headerName: "Position", 
      field: "position_name", 
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: true
    },
    { 
      headerName: "Base Salary", 
      field: "base_salary", 
      width: 150,
      sortable: true,
      filter: true,
      valueFormatter: (params) => {
        const value = params.value || 0;
        return "₱" + Number(value).toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      }
    },
    {
      headerName: "Actions",
      field: "actions",
      width: 140,
      pinned: "right",
      lockPosition: true,
      suppressMovable: true,
      cellStyle: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px",
      },
      cellRenderer: (params) => {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "px-8 py-2 font-medium text-white transition-colors btn btn-error btn-sm";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => deletePosition(params.data.position_id));
        return deleteBtn;
      },
    },
  ];
  
  const gridOptions = {
    columnDefs: columnDefs,
    rowData: [],
    domLayout: 'normal',
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
      .from('positions')
      .select('*')
      .order('position_id', { ascending: true });

    if (error) throw error;

    console.log("Positions loaded:", data);

    if (positionsGridApi) {
      if (typeof positionsGridApi.setGridOption === 'function') {
        positionsGridApi.setGridOption("rowData", data || []);
      } else if (typeof positionsGridApi.setRowData === 'function') {
        positionsGridApi.setRowData(data || []);
      }
      
      setTimeout(() => {
        if (positionsGridApi.sizeColumnsToFit) {
          positionsGridApi.sizeColumnsToFit();
        }
      }, 100);
      
      const countElement = document.getElementById('positionsCount');
      if (countElement) {
        countElement.textContent = data?.length || 0;
      }
    }
  } catch (error) {
    console.error('Error loading positions:', error);
    showNotification('Failed to load positions: ' + error.message, 'error');
  }
}

async function deletePosition(id) {
  if (!confirm("Are you sure you want to delete this position?")) return;

  try {
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('position_id', id);

    if (error) throw error;

    showNotification("Position deleted successfully!", 'success');
    await loadPositions();
  } catch (error) {
    console.error('Error deleting position:', error);
    showNotification('Failed to delete position: ' + error.message, 'error');
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
      filter: true
    },
    { 
      headerName: "Schedule Name", 
      field: "schedule_name", 
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: true
    },
    { 
      headerName: "Start Time", 
      field: "start_time", 
      width: 120,
      sortable: true,
      filter: true
    },
    { 
      headerName: "End Time", 
      field: "end_time", 
      width: 120,
      sortable: true,
      filter: true
    },
    {
      headerName: "Actions",
      field: "actions",
      width: 140,
      pinned: "right",
      lockPosition: true,
      suppressMovable: true,
      cellStyle: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px",
      },
      cellRenderer: (params) => {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "px-8 py-2 font-medium text-white transition-colors btn btn-error btn-sm";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => deleteSchedule(params.data.official_time_id));
        return deleteBtn;
      },
    },
  ];
  
  const gridOptions = {
    columnDefs: columnDefs,
    rowData: [],
    domLayout: 'normal',
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
      .from('official_time')
      .select('*')
      .order('official_time_id', { ascending: true });

    if (error) throw error;

    console.log("Schedules loaded:", data);

    if (officialTimeGridApi) {
      if (typeof officialTimeGridApi.setGridOption === 'function') {
        officialTimeGridApi.setGridOption("rowData", data || []);
      } else if (typeof officialTimeGridApi.setRowData === 'function') {
        officialTimeGridApi.setRowData(data || []);
      }
      
      setTimeout(() => {
        if (officialTimeGridApi.sizeColumnsToFit) {
          officialTimeGridApi.sizeColumnsToFit();
        }
      }, 100);
      
      const countElement = document.getElementById('schedulesCount');
      if (countElement) {
        countElement.textContent = data?.length || 0;
      }
    }
  } catch (error) {
    console.error('Error loading schedules:', error);
    showNotification('Failed to load schedules: ' + error.message, 'error');
  }
}

async function deleteSchedule(id) {
  if (!confirm("Are you sure you want to delete this schedule?")) return;

  try {
    const { error } = await supabase
      .from('official_time')
      .delete()
      .eq('official_time_id', id);

    if (error) throw error;

    showNotification("Schedule deleted successfully!", 'success');
    await loadOfficialTime();
  } catch (error) {
    console.error('Error deleting schedule:', error);
    showNotification('Failed to delete schedule: ' + error.message, 'error');
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
      filter: true
    },
    { 
      headerName: "Start Date", 
      field: "cutoff_start_date", 
      flex: 1,
      minWidth: 150,
      sortable: true,
      filter: true,
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    },
    { 
      headerName: "End Date", 
      field: "cutoff_end_date", 
      flex: 1,
      minWidth: 150,
      sortable: true,
      filter: true,
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    },
    {
      headerName: "Actions",
      field: "actions",
      width: 140,
      pinned: "right",
      lockPosition: true,
      suppressMovable: true,
      cellStyle: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px",
      },
      cellRenderer: (params) => {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "px-8 py-2 font-medium text-white transition-colors btn btn-error btn-sm";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => deleteCutoff(params.data.cutoff_id));
        return deleteBtn;
      },
    },
  ];
  
  const gridOptions = {
    columnDefs: columnDefs,
    rowData: [],
    domLayout: 'normal',
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
      .from('cutoffs')
      .select('*')
      .order('cutoff_start_date', { ascending: false });

    if (error) throw error;

    console.log("Cutoff periods loaded:", data);

    if (cutoffGridApi) {
      if (typeof cutoffGridApi.setGridOption === 'function') {
        cutoffGridApi.setGridOption("rowData", data || []);
      } else if (typeof cutoffGridApi.setRowData === 'function') {
        cutoffGridApi.setRowData(data || []);
      }
      
      setTimeout(() => {
        if (cutoffGridApi.sizeColumnsToFit) {
          cutoffGridApi.sizeColumnsToFit();
        }
      }, 100);
      
      const countElement = document.getElementById('cutoffCount');
      if (countElement) {
        countElement.textContent = data?.length || 0;
      }
    }
  } catch (error) {
    console.error('Error loading cutoff periods:', error);
    showNotification('Failed to load cutoff periods: ' + error.message, 'error');
  }
}

async function deleteCutoff(id) {
  if (!confirm("Are you sure you want to delete this cutoff period?")) return;

  try {
    const { error } = await supabase
      .from('cutoffs')
      .delete()
      .eq('cutoff_id', id);

    if (error) throw error;

    showNotification("Cutoff period deleted successfully!", 'success');
    await loadCutoffPeriods();
  } catch (error) {
    console.error('Error deleting cutoff period:', error);
    showNotification('Failed to delete cutoff period: ' + error.message, 'error');
  }
}

// ========== DEDUCTIONS ==========
async function loadDeductionRates() {
  try {
    const { data, error } = await supabase
      .from('deduction_percentages')
      .select('*');

    if (error) throw error;

    console.log("Deduction rates loaded:", data);

    if (data && data.length > 0) {
      data.forEach(deduction => {
        switch(deduction.deduction_name) {
          case 'SSS':
            document.getElementById("sssRate").value = deduction.percentage || 0;
            break;
          case 'PhilHealth':
            document.getElementById("philhealthRate").value = deduction.percentage || 0;
            break;
          case 'Pag-IBIG':
            document.getElementById("pagibigRate").value = deduction.percentage || 0;
            break;
          case 'Withholding Tax':
            document.getElementById("taxRate").value = deduction.percentage || 0;
            break;
        }
      });
    }
  } catch (error) {
    console.error('Error loading deduction rates:', error);
    showNotification('Failed to load deduction rates: ' + error.message, 'error');
  }
}

// ========== FORM HANDLERS ==========
document.getElementById("addDepartmentForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("departmentName");
  const name = nameInput.value.trim();
  
  if (!name) {
    showNotification("Please enter a department name", 'warning');
    return;
  }

  try {
    const { error } = await supabase
      .from('departments')
      .insert([{ department_name: name }]);

    if (error) throw error;

    showNotification("Department added successfully!", 'success');
    nameInput.value = '';
    await loadDepartments();
  } catch (error) {
    console.error('Error adding department:', error);
    showNotification('Failed to add department: ' + error.message, 'error');
  }
});

document.getElementById("addPositionForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("positionName");
  const salaryInput = document.getElementById("positionSalary");
  
  const name = nameInput.value.trim();
  const salary = parseFloat(salaryInput.value);
  
  if (!name || isNaN(salary) || salary < 0) {
    showNotification("Please enter valid position details", 'warning');
    return;
  }

  try {
    const { error } = await supabase
      .from('positions')
      .insert([{ position_name: name, base_salary: salary }]);

    if (error) throw error;

    showNotification("Position added successfully!", 'success');
    nameInput.value = '';
    salaryInput.value = '';
    await loadPositions();
  } catch (error) {
    console.error('Error adding position:', error);
    showNotification('Failed to add position: ' + error.message, 'error');
  }
});

document.getElementById("addOfficialTimeForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("scheduleName");
  const startInput = document.getElementById("startTime");
  const endInput = document.getElementById("endTime");
  
  const name = nameInput.value.trim();
  const start = startInput.value;
  const end = endInput.value;
  
  if (!name || !start || !end) {
    showNotification("Please fill all fields", 'warning');
    return;
  }

  try {
    const { error } = await supabase
      .from('official_time')
      .insert([{ schedule_name: name, start_time: start, end_time: end }]);

    if (error) throw error;

    showNotification("Schedule added successfully!", 'success');
    nameInput.value = '';
    startInput.value = '';
    endInput.value = '';
    await loadOfficialTime();
  } catch (error) {
    console.error('Error adding schedule:', error);
    showNotification('Failed to add schedule: ' + error.message, 'error');
  }
});

document.getElementById("addCutoffForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const startInput = document.getElementById("cutoffStartDate");
  const endInput = document.getElementById("cutoffEndDate");
  
  const start = startInput.value;
  const end = endInput.value;
  
  if (!start || !end) {
    showNotification("Please select both dates", 'warning');
    return;
  }
  
  if (new Date(start) >= new Date(end)) {
    showNotification("End date must be after start date", 'warning');
    return;
  }

  try {
    const { error } = await supabase
      .from('cutoffs')
      .insert([{ cutoff_start_date: start, cutoff_end_date: end }]);

    if (error) throw error;

    showNotification("Cutoff period added successfully!", 'success');
    startInput.value = '';
    endInput.value = '';
    await loadCutoffPeriods();
  } catch (error) {
    console.error('Error adding cutoff period:', error);
    showNotification('Failed to add cutoff period: ' + error.message, 'error');
  }
});

document.getElementById("deductionsForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const rates = [
    { name: 'SSS', rate: parseFloat(document.getElementById("sssRate").value) },
    { name: 'PhilHealth', rate: parseFloat(document.getElementById("philhealthRate").value) },
    { name: 'Pag-IBIG', rate: parseFloat(document.getElementById("pagibigRate").value) },
    { name: 'Withholding Tax', rate: parseFloat(document.getElementById("taxRate").value) }
  ];

  if (rates.some(r => isNaN(r.rate) || r.rate < 0 || r.rate > 100)) {
    showNotification("Please enter valid percentage values (0-100)", 'warning');
    return;
  }

  try {
    const { data: existing } = await supabase
      .from('deduction_percentages')
      .select('*');

    for (const rate of rates) {
      const existingDeduction = existing?.find(d => d.deduction_name === rate.name);

      if (existingDeduction) {
        const { error } = await supabase
          .from('deduction_percentages')
          .update({ percentage: rate.rate })
          .eq('deduction_id', existingDeduction.deduction_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('deduction_percentages')
          .insert([{ deduction_name: rate.name, percentage: rate.rate }]);
        if (error) throw error;
      }
    }

    showNotification("Deduction rates saved successfully!", 'success');
    await loadDeductionRates();
  } catch (error) {
    console.error('Error saving deduction rates:', error);
    showNotification('Failed to save deduction rates: ' + error.message, 'error');
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

document.getElementById("searchOfficialTime")?.addEventListener("input", (e) => {
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
    showNotification("Database connection failed. Please check your configuration.", 'error');
    return;
  }
  
  if (typeof agGrid === 'undefined' || !agGrid.createGrid) {
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
    
    loadDeductionRates();
    
    console.log("All grids initialized successfully");
  } catch (error) {
    console.error("Error during initialization:", error);
    showNotification("Error initializing page: " + error.message, 'error');
  }
}

// Start initialization
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSettings);
} else {
  initializeSettings();
}