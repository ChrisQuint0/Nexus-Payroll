import { generateDTR, displayDTR, getAvailableCutoffPeriods } from './dtr-generator.js';
import { gridApi } from './attendance-grid.js';


 // Initialize DTR functionality when DOM is ready
 
document.addEventListener('DOMContentLoaded', () => {
  console.log("Initializing DTR functionality...");
  
  // Get the modal and its elements
  const dtrModal = document.getElementById('generateDTR');
  const dtrGenerateBtn = dtrModal.querySelector('.btn-primary');
  const cutoffSelect = dtrModal.querySelector('select');
  
  // Add ID to the select for easier access
  cutoffSelect.id = 'dtrCutoffSelect';
  
  // Handle the Generate DTR button click inside the modal
  dtrGenerateBtn.addEventListener('click', handleGenerateDTRClick);
  
  console.log(" DTR functionality initialized");
});


 // Handle Generate DTR button click from modal
 
async function handleGenerateDTRClick(e) {
  e.preventDefault();
  
  try {
    console.log("=== Starting DTR Generation ===");
    
    // Get selected rows from the grid
    const selectedRows = gridApi.getSelectedRows();
    
    if (selectedRows.length === 0) {
      alert(' Please select at least one employee from the grid');
      return;
    }
    
    console.log(`Selected ${selectedRows.length} employee(s)`);
    
    // Get the selected cutoff period from the modal
    const cutoffSelect = document.getElementById('dtrCutoffSelect');
    const cutoffPeriod = cutoffSelect.value;
    
    console.log("Cutoff Period:", cutoffPeriod);
    
    // Close the modal
    const modal = document.getElementById('generateDTR');
    modal.close();
    
    // Show loading indicator
    const loadingToast = showLoading(`Generating DTR for ${selectedRows.length} employee(s)...`);
    
    // Generate DTR for each selected employee
    let successCount = 0;
    let errorCount = 0;
    
    for (const row of selectedRows) {
      const employeeId = row['Employee ID'] || row.employee_id;
      const employeeName = `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim();
      
      if (!employeeId) {
        console.error("No employee ID found in row:", row);
        errorCount++;
        continue;
      }
      
      console.log(`\n📄 Generating DTR for: ${employeeName} (${employeeId})`);
      
      try {
        // Generate DTR
        const dtrInfo = await generateDTR(employeeId, cutoffPeriod);
        
        console.log("✅ DTR data generated successfully");
        
        // Display DTR in new window
        displayDTR(dtrInfo);
        
        successCount++;
        
        // Small delay between opening multiple windows
        if (selectedRows.length > 1 && successCount < selectedRows.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
      } catch (error) {
        console.error(` Failed to generate DTR for ${employeeName} (${employeeId}):`, error);
        errorCount++;
      }
    }
    
    // Remove loading indicator
    hideLoading(loadingToast);
    
    // Show result
    if (successCount > 0 && errorCount === 0) {
      showSuccess(` Successfully generated ${successCount} DTR(s)`);
    } else if (successCount > 0 && errorCount > 0) {
      showWarning(` Generated ${successCount} DTR(s), ${errorCount} failed`);
    } else {
      showError(` Failed to generate DTR. Check console for details.`);
    }
    
    console.log("=== DTR Generation Complete ===");
    console.log(`Success: ${successCount}, Errors: ${errorCount}`);
    
  } catch (error) {
    console.error(" Error in handleGenerateDTRClick:", error);
    alert(`Failed to generate DTR: ${error.message}`);
  }
}


 // Load available cutoff periods when modal opens
 
async function loadCutoffPeriodsForSelectedEmployee() {
  try {
    const selectedRows = gridApi.getSelectedRows();
    
    if (selectedRows.length === 0) {
      return;
    }
    
    const employeeId = selectedRows[0]['Employee ID'] || selectedRows[0].employee_id;
    
    console.log("Loading cutoff periods for employee:", employeeId);
    
    // Get available cutoff periods
    const periods = await getAvailableCutoffPeriods(employeeId);
    
    if (periods.length > 0) {
      const cutoffSelect = document.getElementById('dtrCutoffSelect');
      
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
    }
    
  } catch (error) {
    console.error("Error loading cutoff periods:", error);
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


 //  Load cutoff periods when modal opens
 
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