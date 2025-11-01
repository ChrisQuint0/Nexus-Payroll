import { 
  generateDTR, 
  getAvailableCutoffPeriods, 
  generateMultipleDTRsPdf,
  getAvailableDepartments,
  generateDepartmentDTR
} from './dtr-generator.js';
import { gridApi } from './attendance-grid.js';

// Initialize DTR functionality when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log("Initializing DTR functionality...");
  
  // Get the modal and its elements
  const dtrModal = document.getElementById('generateDTR');
  
  if (!dtrModal) {
    console.error("DTR modal not found");
    return;
  }
  
  // Get the select elements (there are two in your HTML)
  const selects = dtrModal.querySelectorAll('select');
  const cutoffSelect = selects[0]; // First select is cutoff
  const departmentSelect = selects[1]; // Second select is department
  
  // Add IDs for easier access
  cutoffSelect.id = 'dtrCutoffSelect';
  departmentSelect.id = 'dtrDepartmentSelect';
  
  // Load departments into the dropdown
  loadDepartments();
  
  // Get the generate button
  const dtrGenerateBtn = dtrModal.querySelector('.btn-primary');
  
  // Handle the Generate DTR button click inside the modal
  if (dtrGenerateBtn) {
    dtrGenerateBtn.addEventListener('click', handleGenerateDTRClick);
  }
  
  console.log("✅ DTR functionality initialized");
});

// Load available departments from Supabase
async function loadDepartments() {
  try {
    const departments = await getAvailableDepartments();
    const deptSelect = document.getElementById('dtrDepartmentSelect');
    
    if (!deptSelect) {
      console.error("Department select not found");
      return;
    }
    
    if (departments.length > 0) {
      // Keep "All Departments" as first option, add fetched departments
      deptSelect.innerHTML = '<option value="">All Departments</option>' +
        departments.map(dept => `<option value="${dept}">${dept}</option>`).join('');
      console.log(` Loaded ${departments.length} departments into dropdown`);
    } else {
      deptSelect.innerHTML = '<option value="">All Departments</option><option value="" disabled>No departments found</option>';
    }
  } catch (error) {
    console.error("Error loading departments:", error);
    const deptSelect = document.getElementById('dtrDepartmentSelect');
    if (deptSelect) {
      deptSelect.innerHTML = '<option value="">All Departments</option><option value="" disabled>Error loading departments</option>';
    }
  }
}

// Handle Generate DTR button click from modal
async function handleGenerateDTRClick(e) {
  e.preventDefault();
  
  try {
    console.log("=== Starting DTR Generation ===");
    
    const cutoffSelect = document.getElementById('dtrCutoffSelect');
    const departmentSelect = document.getElementById('dtrDepartmentSelect');
    
    if (!cutoffSelect || !departmentSelect) {
      alert(' Modal elements not found');
      return;
    }
    
    const cutoffPeriod = cutoffSelect.value;
    const selectedDepartment = departmentSelect.value;
    
    if (!cutoffPeriod) {
      alert(' Please select a cutoff period');
      return;
    }
    
    console.log("Cutoff Period:", cutoffPeriod);
    console.log("Selected Department:", selectedDepartment || "All Departments");
    
    let dtrInfoArray = [];
    let loadingMessage = '';
    
    // Check if a specific department is selected
    if (selectedDepartment && selectedDepartment !== "") {
      // Generate by department
      console.log(" Generating DTR for department:", selectedDepartment);
      loadingMessage = `Generating DTR for ${selectedDepartment} department...`;
      
      // Close the modal
      const modal = document.getElementById('generateDTR');
      if (modal && typeof modal.close === 'function') {
        modal.close();
      }
      
      // Show loading indicator
      const loadingToast = showLoading(loadingMessage);
      
      try {
        dtrInfoArray = await generateDepartmentDTR(selectedDepartment, cutoffPeriod);
      } catch (error) {
        hideLoading(loadingToast);
        console.error("Error generating department DTR:", error);
        showError(` Failed to generate DTR for ${selectedDepartment}. Check console for details.`);
        return;
      }
      
      hideLoading(loadingToast);
      
    } else {
      // Generate by selected employees from grid (default behavior)
      if (!gridApi || typeof gridApi.getSelectedRows !== 'function') {
        alert(' Grid API not available. Please select a department or refresh the page.');
        return;
      }
      
      const selectedRows = gridApi.getSelectedRows();
      
      if (selectedRows.length === 0) {
        alert(' Please select at least one employee from the grid, or choose a specific department');
        return;
      }
      
      console.log(` Selected ${selectedRows.length} employee(s) from grid`);
      loadingMessage = `Generating DTR for ${selectedRows.length} employee(s)...`;
      
      // Close the modal
      const modal = document.getElementById('generateDTR');
      if (modal && typeof modal.close === 'function') {
        modal.close();
      }
      
      // Show loading indicator
      const loadingToast = showLoading(loadingMessage);
      
      // Generate DTR for each selected employee
      let errorCount = 0;
      
      for (const row of selectedRows) {
        const employeeId = row['Employee ID'] || row.employee_id;
        const employeeName = `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim();
        
        if (!employeeId) {
          console.error("No employee ID found in row:", row);
          errorCount++;
          continue;
        }
        
        console.log(`\n Generating DTR for: ${employeeName} (${employeeId})`);
        
        try {
          const dtrInfo = await generateDTR(employeeId, cutoffPeriod);
          console.log(" DTR data generated successfully");
          dtrInfoArray.push(dtrInfo);
        } catch (error) {
          console.error(` Failed to generate DTR for ${employeeName} (${employeeId}):`, error);
          errorCount++;
        }
      }
      
      hideLoading(loadingToast);
      
      if (errorCount > 0 && dtrInfoArray.length === 0) {
        showError(` Failed to generate DTR. Check console for details.`);
        console.log("=== DTR Generation Failed ===");
        return;
      }
    }
    
    // Generate PDF if we have any successful DTRs
    if (dtrInfoArray.length > 0) {
      try {
        generateMultipleDTRsPdf(dtrInfoArray);
        showSuccess(` Successfully generated ${dtrInfoArray.length} DTR(s) in PDF`);
      } catch (error) {
        console.error("Error generating PDF:", error);
        showError(` Failed to generate PDF. Check console for details.`);
      }
    } else {
      showError(` Failed to generate DTR. Check console for details.`);
    }
    
    console.log("=== DTR Generation Complete ===");
    console.log(` Success: ${dtrInfoArray.length} DTRs generated`);

  } catch (error) {
    console.error("❌ Error in handleGenerateDTRClick:", error);
    alert(`Failed to generate DTR: ${error.message}`);
  }
}

// Load available cutoff periods when modal opens
async function loadCutoffPeriodsForSelectedEmployee() {
  try {
    let employeeId = null;
    
    // Try to get from selected rows first
    if (gridApi && typeof gridApi.getSelectedRows === 'function') {
      const selectedRows = gridApi.getSelectedRows();
      
      if (selectedRows.length > 0) {
        employeeId = selectedRows[0]['Employee ID'] || selectedRows[0].employee_id;
      }
    }
    
    // If no employee selected, get any employee from the database
    if (!employeeId) {
      const { supabaseClient } = await import("../supabase/supabaseClient.js");
      const { data, error } = await supabaseClient
        .from("employee_time_logs")
        .select("employee_id")
        .limit(1);
      
      if (data && data.length > 0) {
        employeeId = data[0].employee_id;
      }
    }
    
    if (employeeId) {
      console.log("Loading cutoff periods for employee:", employeeId);
      const periods = await getAvailableCutoffPeriods(employeeId);
      populateCutoffSelect(periods);
    }
    
  } catch (error) {
    console.error("Error loading cutoff periods:", error);
  }
}

// Populate cutoff select dropdown
function populateCutoffSelect(periods) {
  const cutoffSelect = document.getElementById('dtrCutoffSelect');
  
  if (!cutoffSelect) {
    console.error("Cutoff select not found");
    return;
  }
  
  if (periods.length > 0) {
    // Clear existing options
    cutoffSelect.innerHTML = '';
    
    // Add new options
    periods.forEach(period => {
      const option = document.createElement('option');
      option.value = period;
      option.textContent = period;
      cutoffSelect.appendChild(option);
    });
    
    console.log(` Loaded ${periods.length} cutoff periods`);
  } else {
    cutoffSelect.innerHTML = '<option value="">No periods available</option>';
  }
}

// Helper: Show loading indicator
function showLoading(message) {
  const toast = document.createElement('div');
  toast.id = 'loadingToast';
  toast.className = 'alert alert-info fixed bottom-4 right-4 w-auto shadow-lg z-50';
  toast.innerHTML = `
    <span class="loading loading-spinner"></span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  return toast;
}

// Helper: Hide loading indicator
function hideLoading(toast) {
  if (toast && toast.parentNode) {
    toast.remove();
  }
}

// Helper: Show success message
function showSuccess(message) {
  const toast = document.createElement('div');
  toast.className = 'alert alert-success fixed bottom-4 right-4 w-auto shadow-lg z-50';
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Helper: Show warning message
function showWarning(message) {
  const toast = document.createElement('div');
  toast.className = 'alert alert-warning fixed bottom-4 right-4 w-auto shadow-lg z-50';
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Helper: Show error message
function showError(message) {
  const toast = document.createElement('div');
  toast.className = 'alert alert-error fixed bottom-4 right-4 w-auto shadow-lg z-50';
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Load cutoff periods when modal opens
const generateDTRBtn = document.getElementById('generateDTRBtn');
if (generateDTRBtn) {
  generateDTRBtn.addEventListener('click', () => {
    // Load cutoff periods when opening the modal
    setTimeout(() => {
      loadCutoffPeriodsForSelectedEmployee();
    }, 100);
  });
}

// Export for use in other modules if needed
export { handleGenerateDTRClick, loadCutoffPeriodsForSelectedEmployee };