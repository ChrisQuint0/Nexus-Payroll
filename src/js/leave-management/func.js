// ============================================================================
// Imports
// ============================================================================
import { initializeGrid, setGridData, getSelectedRows, deselectAll } from './grid.js';
import { initializeLeaveData } from './leave-data.js';
import { showGlobalAlert } from '../utils/alerts.js';

// ============================================================================
// Global Variables
// ============================================================================
let currentLeaveData = [];

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async function() {
  initializeGrid();
  await initializeData();
  initializeEventListeners();
  initializeSearch();
});

async function initializeData() {
  try {
    const { leaves } = await initializeLeaveData();
    currentLeaveData = leaves;
    setGridData(currentLeaveData);
  } catch (error) {
    console.error('Error initializing data:', error);
    showGlobalAlert('error', 'Error loading leave data. Please refresh the page.');
  }
}

async function refreshData() {
  const { leaves } = await initializeLeaveData();
  currentLeaveData = leaves;
  setGridData(currentLeaveData);
}

// ============================================================================
// Event Listeners
// ============================================================================

// Initialize all event listeners
function initializeEventListeners() {
  // Delete button
  const deleteBtn = document.getElementById('deleteBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', handleDeleteSelected);
  }
  
  // Add new button
  const addNewBtn = document.getElementById('addNewBtn');
  if (addNewBtn) {
    addNewBtn.addEventListener('click', () => {
      document.getElementById('addLeaveModal').showModal();
      document.getElementById('addLeaveForm').reset();
    });
  }
  
  // Add leave form
  const addLeaveForm = document.getElementById('addLeaveForm');
  if (addLeaveForm) {
    addLeaveForm.addEventListener('submit', handleAddLeave);
  }

  // Employee ID lookup
  const employeeIdInput = document.querySelector('input[name="employeeId"]');
  if (employeeIdInput) {
    employeeIdInput.addEventListener('change', lookupEmployeeName);
  }

  // CSV Generation button
  const generateCsvBtn = document.getElementById('generateCsvBtn');
  if (generateCsvBtn) {
    generateCsvBtn.addEventListener('click', handleGenerateCSV);
  }

  // Confirm delete button
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', confirmDelete);
  }
  
  // View more buttons (delegated event handling)
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('view-more-btn')) {
      const employeeId = e.target.getAttribute('data-employee');
      showLeaveDetails(employeeId);
    }
  });
}

// Handle selection change for delete button
window.handleSelectionChange = function() {
  const selectedRows = getSelectedRows();
  const deleteBtn = document.getElementById('deleteBtn');
  
  if (deleteBtn) {
    deleteBtn.disabled = selectedRows.length === 0;
  }
};

// Handle cell edit to update database
window.handleCellEdit = async function(event) {
  const { data, colDef, newValue, oldValue } = event;
  
  // Don't update if value hasn't changed
  if (newValue === oldValue) return;
  
  const leaveId = data["Leave Request ID"];
  if (!leaveId) {
    showGlobalAlert('error', 'Could not identify leave record to update.');
    return;
  }

  try {
    const { supabaseClient } = await import('../supabase/supabaseClient.js');
    
    let updateData = {};
    
    // Map column field to database column
    switch (colDef.field) {
      case "Leave Duration":
        // Recalculate end date based on new duration
        const startDate = new Date(data["Start Date"]);
        const newEndDate = new Date(startDate);
        newEndDate.setDate(newEndDate.getDate() + newValue - 1);
        updateData.leave_end = newEndDate.toISOString();
        break;
      case "Type":
        updateData.leave_type = newValue;
        break;
      case "Status":
        updateData.is_paid = newValue === "Paid";
        break;
      default:
        return;
    }
    
    // Update database
    const { error } = await supabaseClient
      .from('leave_management')
      .update(updateData)
      .eq('leave_id', leaveId);
    
    if (error) throw error;
    
    showGlobalAlert('success', 'Leave record updated successfully!');
    
    // Refresh data to ensure consistency
    await refreshData();
    
  } catch (error) {
    console.error('Error updating leave record:', error);
    showGlobalAlert('error', 'Error updating leave record. Please try again.');
    
    // Revert the change in the grid
    await refreshData();
  }
};

// ============================================================================
// Leave Management
// ============================================================================

// Delete selected leave records
async function handleDeleteSelected() {
  const selectedRows = getSelectedRows();
  
  if (selectedRows.length === 0) {
    showGlobalAlert('error', 'Please select at least one leave record to delete.');
    return;
  }

  // Update modal message with count
  const message = `Are you sure you want to delete ${selectedRows.length} leave record(s)? This action cannot be undone.`;
  document.getElementById('deleteConfirmMessage').textContent = message;
  
  // Show confirmation modal
  document.getElementById('deleteConfirmModal').showModal();
}

// Confirm delete action
async function confirmDelete() {
  const selectedRows = getSelectedRows();
  
  // Close the modal
  document.getElementById('deleteConfirmModal').close();

  try {
    // Import supabase client
    const { supabaseClient } = await import('../supabase/supabaseClient.js');
    
    // Get leave IDs from selected rows
    const leaveIds = selectedRows.map(row => row["Leave Request ID"]).filter(id => id);

    if (leaveIds.length === 0) {
      showGlobalAlert('error', 'Could not identify leave records to delete.');
      return;
    }

    // Delete from database
    const { error } = await supabaseClient
      .from('leave_management')
      .delete()
      .in('leave_id', leaveIds);

    if (error) throw error;

    showGlobalAlert('success', `Successfully deleted ${leaveIds.length} leave record(s).`);
    
    await refreshData();
    deselectAll();
  } catch (error) {
    console.error('Error deleting leave records:', error);
    showGlobalAlert('error', 'Error deleting leave records. Please try again.');
  }
}

// Lookup employee name from ID
async function lookupEmployeeName(event) {
  const employeeId = event.target.value;
  const employeeNameInput = document.querySelector('input[name="employeeName"]');
  
  if (!employeeId || !employeeNameInput) return;
  
  try {
    const { supabaseClient } = await import('../supabase/supabaseClient.js');
    
    const { data, error } = await supabaseClient
      .from('employees')
      .select('first_name, middle_name, last_name')
      .eq('emp_id', employeeId)
      .single();
    
    if (error) throw error;
    
    if (data) {
      const fullName = `${data.first_name} ${data.middle_name ? data.middle_name + ' ' : ''}${data.last_name}`;
      employeeNameInput.value = fullName;
    } else {
      employeeNameInput.value = '';
      showGlobalAlert('error', 'Employee not found. Please check the Employee ID.');
    }
  } catch (error) {
    console.error('Error looking up employee:', error);
    employeeNameInput.value = '';
  }
}

// Add new leave record
async function handleAddLeave(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  const employeeId = formData.get('employeeId');
  const leaveType = formData.get('leaveType');
  const duration = parseInt(formData.get('duration'));
  const isPaid = formData.get('paid') === 'Yes';
  
  // Validate inputs
  if (!employeeId || !leaveType || !duration) {
    showGlobalAlert('error', 'Please fill in all required fields.');
    return;
  }

  try {
    const { supabaseClient } = await import('../supabase/supabaseClient.js');
    
    // Calculate leave dates (start from today)
    const leaveStart = new Date();
    const leaveEnd = new Date();
    leaveEnd.setDate(leaveEnd.getDate() + duration - 1);
    
    // Insert new leave record
    const { error } = await supabaseClient
      .from('leave_management')
      .insert({
        emp_id: employeeId,
        leave_type: leaveType,
        leave_start: leaveStart.toISOString(),
        leave_end: leaveEnd.toISOString(),
        is_paid: isPaid
      });
    
    if (error) throw error;
    
    showGlobalAlert('success', 'Leave record added successfully!');
    
    // Close modal and refresh data
    document.getElementById('addLeaveModal').close();
    form.reset();
    await refreshData();
    
  } catch (error) {
    console.error('Error adding leave record:', error);
    showGlobalAlert('error', 'Error adding leave record. Please check the Employee ID and try again.');
  }
}

// ============================================================================
// Leave Details Modal
// ============================================================================

function showLeaveDetails(employeeId) {
  const employee = currentLeaveData.find(item => item["Employee ID"] === employeeId);
  
  if (!employee) {
    console.error('Employee not found:', employeeId);
    return;
  }

  // Define leave allocations
  const defaultBalances = {
    'Vacation Leave': 15,
    'Sick Leave': 15,
    'Emergency Leave': 5,
    'Personal Leave': 3,
    'Maternity Leave': 105
  };

  // Get all leaves for this employee to calculate used days
  const employeeLeaves = currentLeaveData.filter(leave => leave["Employee ID"] === employeeId);
  
  // Calculate used days per leave type
  const usedDays = {};
  employeeLeaves.forEach(leave => {
    const type = leave["Type"];
    const duration = leave["Leave Duration"];
    if (!usedDays[type]) {
      usedDays[type] = 0;
    }
    usedDays[type] += duration;
  });

  // Calculate remaining balances
  const remainingBalances = {};
  Object.keys(defaultBalances).forEach(type => {
    remainingBalances[type] = defaultBalances[type] - (usedDays[type] || 0);
  });

  // Create modal content with dynamic leave balances
  const modalContent = `
    <div style="text-align: center;">
      <h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Leave Balances</h3>
      <button onclick="this.closest('dialog').close()" style="position: absolute; top: 1rem; right: 1rem; font-size: 1.5rem; background: none; border: none; cursor: pointer; color: #9ca3af;">×</button>
      
      <div style="margin: 2rem 0; text-align: left;">
        ${Object.entries(remainingBalances).map(([type, remaining]) => {
          const used = usedDays[type] || 0;
          const total = defaultBalances[type];
          const percentage = (remaining / total) * 100;
          const barColor = percentage > 50 ? '#10b981' : percentage > 25 ? '#f59e0b' : '#ef4444';
          
          return `
            <div style="margin-bottom: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-weight: 600; color: #374151;">${type}</span>
                <span style="font-weight: 700; font-size: 1.125rem; color: ${barColor};">${remaining} days</span>
              </div>
              <div style="width: 100%; height: 8px; background-color: #e5e7eb; border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; background-color: ${barColor}; width: ${percentage}%; transition: width 0.3s ease;"></div>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 0.25rem;">
                <span style="font-size: 0.75rem; color: #6b7280;">Used: ${used} day(s)</span>
                <span style="font-size: 0.75rem; color: #6b7280;">Total: ${total} day(s)</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 0.75rem; border-radius: 4px; text-align: left;">
        <p style="font-size: 0.875rem; color: #1e40af; margin: 0;">
          <strong>Note:</strong> Leave balances reset every calendar year
        </p>
      </div>
    </div>
  `;

  // Create or get modal
  let modal = document.getElementById('leaveBalanceModal');
  if (!modal) {
    modal = document.createElement('dialog');
    modal.id = 'leaveBalanceModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-box" style="max-width: 600px;">
        <div id="modalContent"></div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    `;
    document.body.appendChild(modal);
  }

  // Update modal content
  document.getElementById('modalContent').innerHTML = modalContent;
  
  // Show modal
  modal.showModal();
}

// ============================================================================
// Search Functionality
// ============================================================================

function initializeSearch() {
  const searchBar = document.getElementById('searchBar');
  
  if (searchBar) {
    searchBar.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      
      if (searchTerm === '') {
        setGridData(currentLeaveData);
        return;
      }

      const filteredData = currentLeaveData.filter(item => {
        return (
          item["Employee ID"]?.toLowerCase().includes(searchTerm) ||
          item["Name"]?.toLowerCase().includes(searchTerm) ||
          item["Position"]?.toLowerCase().includes(searchTerm) ||
          item["Department"]?.toLowerCase().includes(searchTerm) ||
          item["Type"]?.toLowerCase().includes(searchTerm)
        );
      });

      setGridData(filteredData);
    });
  }
}

// ============================================================================
// CSV Export Functionality
// ============================================================================

// Handle CSV generation with filters
function handleGenerateCSV() {
  const department = document.getElementById('csvDepartment').value;
  const position = document.getElementById('csvPosition').value;
  const leaveType = document.getElementById('csvLeaveType').value;

  // Filter data based on selections
  let filteredData = currentLeaveData.filter(leave => {
    // Department filter
    if (department !== 'all' && leave.Department !== department) return false;
    
    // Position filter
    if (position !== 'all' && leave.Position !== position) return false;
    
    // Leave Type filter
    if (leaveType !== 'all' && leave.Type !== leaveType) return false;
    
    return true;
  });

  if (filteredData.length === 0) {
    showGlobalAlert('error', 'No leave records match the selected filters.');
    return;
  }

  generateCSVFile(filteredData);
  document.getElementById('genCSV').close();
}

// Generate and download CSV file
function generateCSVFile(data) {
  // Define CSV headers
  const headers = [
    'Employee ID',
    'Name',
    'Position',
    'Department',
    'Leave Type',
    'Leave Duration (Days)',
    'Leave Balance',
    'Start Date',
    'End Date'
  ];

  // Convert data to CSV format
  let csvContent = headers.join(',') + '\n';
  
  data.forEach(leave => {
    const row = [
      leave["Employee ID"] || '',
      leave["Name"] || '',
      leave["Position"] || '',
      leave["Department"] || '',
      leave["Type"] || '',
      leave["Leave Duration"] || '',
      leave["Leave Balance"] || '',
      leave["Start Date"] ? new Date(leave["Start Date"]).toLocaleDateString() : '',
      leave["End Date"] ? new Date(leave["End Date"]).toLocaleDateString() : ''
    ].map(value => {
      value = String(value);
      
      // Escape commas and quotes in values
      if (value.includes(',') || value.includes('"')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    
    csvContent += row.join(',') + '\n';
  });

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Create filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `leave_data_${timestamp}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showGlobalAlert('success', `CSV file "${filename}" generated successfully with ${data.length} leave record(s)!`);
}
