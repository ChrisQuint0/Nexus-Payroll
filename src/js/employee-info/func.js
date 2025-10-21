// func.js
import { setGridData, getSelectedRows, deselectAll } from './grid.js';
import { initializeEmployeeData, fetchOfficialTimeSchedules, fetchDepartments, fetchPositions } from './employee-data.js';
import { supabaseClient } from '../supabase/supabaseClient.js';

// Global variables
let currentEmployeeData = [];
let currentView = 'active';

// Initialize functionality
document.addEventListener('DOMContentLoaded', async function() {
  await initializeData();
  initializeEventListeners();
  initializeSearch();
  initializeCSVGeneration();
  await populateOfficialTimeDropdown();
  await populateFormDropdowns();
  initializeTabSwitching();
});

// Initialize data from Supabase
async function initializeData() {
  try {
    const { employees, schedules } = await initializeEmployeeData();
    currentEmployeeData = employees;
    
    // Set initial grid data
    filterAndDisplayData();
    
    console.log('Data initialization complete');
  } catch (error) {
    console.error('Error initializing data:', error);
    alert('Error loading employee data. Please refresh the page.');
  }
}

// Populate form dropdowns
async function populateFormDropdowns() {
  try {
    const [departments, positions] = await Promise.all([
      fetchDepartments(),
      fetchPositions()
    ]);

    // Populate department dropdown
    const deptSelect = document.querySelector('select[name="department"]');
    if (deptSelect) {
      deptSelect.innerHTML = '<option value="">Select Department</option>';
      departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.department_name;
        option.textContent = dept.department_name;
        deptSelect.appendChild(option);
      });
    }

    // Populate position dropdown
    const posSelect = document.querySelector('select[name="position"]');
    if (posSelect) {
      posSelect.innerHTML = '<option value="">Select Position</option>';
      positions.forEach(pos => {
        const option = document.createElement('option');
        option.value = pos.position_name;
        option.textContent = pos.position_name;
        option.setAttribute('data-salary', pos.base_salary);
        posSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error populating form dropdowns:', error);
  }
}

// Populate official time dropdown
async function populateOfficialTimeDropdown() {
  const officialTimeSelect = document.getElementById('officialTime');
  if (officialTimeSelect) {
    officialTimeSelect.innerHTML = '<option value="">Select Official Time</option>';
    
    // Ensure we have the latest schedules
    const schedules = await fetchOfficialTimeSchedules();
    
    schedules.forEach(schedule => {
      const option = document.createElement('option');
      option.value = schedule.official_time_id;
      option.textContent = schedule.schedule_name;
      officialTimeSelect.appendChild(option);
    });
  }
}

// Initialize tab switching
function initializeTabSwitching() {
  const activeTab = document.getElementById('activeEmployeesTab');
  const inactiveTab = document.getElementById('inactiveEmployeesTab');

  if (activeTab) {
    activeTab.addEventListener('click', () => switchTab('active'));
  }

  if (inactiveTab) {
    inactiveTab.addEventListener('click', () => switchTab('inactive'));
  }

  // Set initial view
  switchTab('active');
}

// Switch between Active and Inactive tabs
function switchTab(tab) {
  currentView = tab;
  
  // Update tab styles
  const activeTab = document.getElementById('activeEmployeesTab');
  const inactiveTab = document.getElementById('inactiveEmployeesTab');
  
  if (activeTab && inactiveTab) {
    if (tab === 'active') {
      activeTab.classList.remove('btn-outline');
      activeTab.classList.add('btn-primary');
      inactiveTab.classList.remove('btn-primary');
      inactiveTab.classList.add('btn-outline');
    } else {
      inactiveTab.classList.remove('btn-outline');
      inactiveTab.classList.add('btn-primary');
      activeTab.classList.remove('btn-primary');
      activeTab.classList.add('btn-outline');
    }
  }
  
  // Update button text based on current view
  const archiveBtn = document.getElementById('archiveBtn');
  if (archiveBtn) {
    archiveBtn.textContent = tab === 'active' ? 'Archive' : 'Restore';
  }
  
  // Filter and display data
  filterAndDisplayData();
  
  // Clear selection
  deselectAll();
  handleSelectionChange();
}

// Filter and display data based on current view
function filterAndDisplayData() {
  const filteredData = currentEmployeeData.filter(employee => {
    if (currentView === 'active') {
      // Show employees with active status (case-insensitive)
      return !employee.Status || employee.Status.toLowerCase() === 'active';
    } else {
      // Show employees with inactive status (case-insensitive)
      return employee.Status && employee.Status.toLowerCase() === 'inactive';
    }
  });
  
  setGridData(filteredData);
}

// Event listeners setup
function initializeEventListeners() {
  // Archive button
  const archiveBtn = document.getElementById('archiveBtn');
  if (archiveBtn) {
    archiveBtn.addEventListener('click', handleArchiveSelected);
  }
  
  // Add new button
  const addNewBtn = document.getElementById('addNewBtn');
  if (addNewBtn) {
    addNewBtn.addEventListener('click', () => {
      document.getElementById('addEmployeeModal').showModal();
      // Reset form for new employee
      document.getElementById('addEmployeeForm').reset();
      // Show employee ID field for new entries
      const employeeIdInput = document.querySelector('[name="employeeId"]');
      employeeIdInput.readOnly = false;
      employeeIdInput.style.display = 'block';
      employeeIdInput.previousElementSibling.style.display = 'block';
      
      document.querySelector('#addEmployeeModal h3').textContent = 'Add New Employee';
      document.querySelector('#addEmployeeModal button[type="submit"]').textContent = 'Add Employee';
    });
  }
  
  // Add employee form
  const addEmployeeForm = document.getElementById('addEmployeeForm');
  if (addEmployeeForm) {
    addEmployeeForm.addEventListener('submit', handleAddEmployee);
  }
  
  // View more buttons (delegated event handling)
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('view-more-btn')) {
      const employeeId = e.target.getAttribute('data-employee');
      showEmployeeDetails(employeeId);
    }
  });

  // Initialize position change events
  initializePositionChange();
}

// Search functionality
function initializeSearch() {
  const searchBar = document.getElementById('searchBar');
  if (searchBar) {
    searchBar.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase();
      const filteredData = currentEmployeeData.filter(employee => {
        // First filter by status based on current view
        const statusMatch = currentView === 'active' ? 
          employee.Status === 'Active' : employee.Status === 'Inactive';
        
        // Then filter by search term
        const searchMatch = Object.values(employee).some(value => 
          value.toString().toLowerCase().includes(searchTerm)
        );
        
        return statusMatch && searchMatch;
      });
      setGridData(filteredData);
    });
  }
}

// Handle selection change for archive button
window.handleSelectionChange = function() {
  const selectedRows = getSelectedRows();
  const archiveBtn = document.getElementById('archiveBtn');
  if (archiveBtn) {
    archiveBtn.disabled = selectedRows.length === 0;
  }
};

// Archive/Restore selected rows
async function handleArchiveSelected() {
  const selectedRows = getSelectedRows();
  if (selectedRows.length === 0) return;
  
  const action = currentView === 'active' ? 'archive' : 'restore';
  const actionText = currentView === 'active' ? 'Archive' : 'Restore';
  const newStatusId = action === 'archive' ? 2 : 1; // Assuming 1=Active, 2=Inactive
  
  if (confirm(`Are you sure you want to ${actionText.toLowerCase()} ${selectedRows.length} employee(s)?`)) {
    try {
      const selectedIds = selectedRows.map(row => parseInt(row['Employee ID']));
      
      // Update employee status in Supabase
      const { error } = await supabaseClient
        .from('employees')
        .update({ status_id: newStatusId })
        .in('emp_id', selectedIds);
      
      if (error) throw error;
      
      // Refresh data from Supabase
      await refreshData();
      
      // Disable button after action
      const archiveBtn = document.getElementById('archiveBtn');
      if (archiveBtn) {
        archiveBtn.disabled = true;
      }
      
      alert(`${selectedRows.length} employee(s) ${actionText.toLowerCase()}d successfully!`);
      
    } catch (error) {
      console.error('Error updating employee status:', error);
      alert('Error updating employee status. Please try again.');
    }
  }
}

// Show employee details in modal
function showEmployeeDetails(employeeId) {
  const employee = currentEmployeeData.find(emp => emp['Employee ID'] === employeeId);
  if (!employee) return;
  
  const statusClass = employee.Status && employee.Status.toLowerCase() === 'active' 
    ? 'bg-green-100 text-green-800 border-green-200' 
    : 'bg-red-100 text-red-800 border-red-200';
  
  const detailsContainer = document.getElementById('employeeDetails');
  detailsContainer.innerHTML = `
    <!-- Employee Header Card -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 border border-blue-200">
      <div class="flex items-start justify-between">
        <div>
          <h3 class="text-2xl font-bold text-gray-800 mb-2">
            ${employee['First Name']} ${employee['Middle Initial'] ? employee['Middle Initial'] + '.' : ''} ${employee['Last Name']}
          </h3>
          <div class="flex items-center gap-3 text-gray-600">
            <span class="text-sm font-medium">ID: ${employee['Employee ID']}</span>
            <span class="text-gray-400">•</span>
            <span class="px-3 py-1 text-sm font-semibold rounded-full border ${statusClass}">
              ${employee.Status || 'Active'}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Personal Information Card -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <h4 class="font-bold text-lg text-gray-800 mb-4 flex items-center gap-3">
          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          Personal Information
        </h4>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-3 border-b border-gray-100">
            <span class="text-gray-600 text-sm">Contact:</span>
            <span class="font-medium text-gray-800">${employee.Contact || 'N/A'}</span>
          </div>
          <div class="flex justify-between items-start py-3 border-b border-gray-100">
            <span class="text-gray-600 text-sm">Address:</span>
            <span class="font-medium text-gray-800 text-right max-w-xs">${employee.Address || 'N/A'}</span>
          </div>
        </div>
      </div>
      
      <!-- Role Information Card -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <h4 class="font-bold text-lg text-gray-800 mb-4 flex items-center gap-3">
          <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          Role Information
        </h4>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-3 border-b border-gray-100">
            <span class="text-gray-600 text-sm">Position:</span>
            <span class="font-medium text-gray-800">${employee.Position}</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-gray-100">
            <span class="text-gray-600 text-sm">Department:</span>
            <span class="font-medium text-gray-800">${employee.Department}</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-gray-100">
            <span class="text-gray-600 text-sm">Date Hired:</span>
            <span class="font-medium text-gray-800">${employee.DateHired ? new Date(employee.DateHired).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>
      </div>
      
      <!-- Schedule Information Card -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <h4 class="font-bold text-lg text-gray-800 mb-4 flex items-center gap-3">
          <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Schedule
        </h4>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-3 border-b border-gray-100">
            <span class="text-gray-600 text-sm">Official Time:</span>
            <span class="font-medium text-gray-800">${employee.ScheduleName || 'N/A'}</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-gray-100">
            <span class="text-gray-600 text-sm">Start Time:</span>
            <span class="font-medium text-gray-800">${employee.StartTime ? formatTime(employee.StartTime) : 'N/A'}</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-gray-100">
            <span class="text-gray-600 text-sm">End Time:</span>
            <span class="font-medium text-gray-800">${employee.EndTime ? formatTime(employee.EndTime) : 'N/A'}</span>
          </div>
        </div>
      </div>
      
      <!-- Government IDs Card -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow md:col-span-2">
        <h4 class="font-bold text-lg text-gray-800 mb-4 flex items-center gap-3">
          <svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
          </svg>
          Government IDs
        </h4>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-3 border-b border-gray-100">
            <span class="text-gray-600 text-sm">SSS ID:</span>
            <span class="font-medium text-gray-800">${employee.SSSID || 'N/A'}</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-gray-100">
            <span class="text-gray-600 text-sm">PhilHealth ID:</span>
            <span class="font-medium text-gray-800">${employee.PhilhealthID || 'N/A'}</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-gray-100">
            <span class="text-gray-600 text-sm">Pag-IBIG ID:</span>
            <span class="font-medium text-gray-800">${employee.PagIBIGID || 'N/A'}</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-gray-100">
            <span class="text-gray-600 text-sm">TIN ID:</span>
            <span class="font-medium text-gray-800">${employee.TINID || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Salary Information Card - Standalone -->
    <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200 p-6 mt-6 hover:shadow-md transition-shadow">
      <h4 class="font-bold text-lg text-gray-800 mb-4 flex items-center gap-3">
        <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Salary Information
      </h4>
      <div class="flex justify-between items-center py-3">
        <span class="text-gray-600 text-sm">Base Rate:</span>
        <span class="text-2xl font-bold text-emerald-700">₱${parseInt(employee.Rate).toLocaleString()}</span>
      </div>
    </div>
    
    <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
      <button class="btn btn-primary flex items-center gap-3" onclick="editEmployee('${employee['Employee ID']}')">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
        Edit Employee
      </button>
    </div>
  `;
  
  document.getElementById('viewMoreModal').showModal();
}

// Initialize position change events
function initializePositionChange() {
  const positionSelect = document.querySelector('select[name="position"]');
  const rateInput = document.querySelector('input[name="rate"]');
  
  if (positionSelect && rateInput) {
    positionSelect.addEventListener('change', function() {
      const selectedOption = this.options[this.selectedIndex];
      const salary = selectedOption.getAttribute('data-salary');
      
      if (salary) {
        rateInput.value = salary;
      } else {
        rateInput.value = '';
      }
    });
  }
}

// Format time from HH:MM:SS to HH:MM AM/PM
function formatTime(timeString) {
  if (!timeString) return 'N/A';
  
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  
  return `${formattedHour}:${minutes} ${ampm}`;
}

// Edit employee - opens the same form as Add New but pre-filled
window.editEmployee = function(employeeId) {
  const employee = currentEmployeeData.find(emp => emp['Employee ID'] === employeeId);
  if (!employee) return;
  
  // Close view more modal
  document.getElementById('viewMoreModal').close();
  
  // Fill the form with employee data
  const form = document.getElementById('addEmployeeForm');
  form.reset();
  
  // Pre-fill all fields
  form.querySelector('[name="employeeId"]').value = employee['Employee ID'];
  form.querySelector('[name="firstName"]').value = employee['First Name'] || '';
  form.querySelector('[name="lastName"]').value = employee['Last Name'] || '';
  form.querySelector('[name="middleInitial"]').value = employee['Middle Initial'] || '';
  form.querySelector('[name="contact"]').value = employee.Contact || '';
  form.querySelector('[name="address"]').value = employee.Address || '';
  
  // Set position and department dropdowns
  const positionSelect = form.querySelector('[name="position"]');
  if (positionSelect) {
    positionSelect.value = employee.Position;
    // Trigger change event to update salary
    positionSelect.dispatchEvent(new Event('change'));
  }
  
  const departmentSelect = form.querySelector('[name="department"]');
  if (departmentSelect) {
    departmentSelect.value = employee.Department;
  }
  
  form.querySelector('[name="dateHired"]').value = employee.DateHired || '';
  form.querySelector('[name="rate"]').value = employee.Rate;
  form.querySelector('[name="sssId"]').value = employee.SSSID || '';
  form.querySelector('[name="philhealthId"]').value = employee.PhilhealthID || '';
  form.querySelector('[name="pagibigId"]').value = employee.PagIBIGID || '';
  form.querySelector('[name="tinId"]').value = employee.TINID || '';
  
  // Set official time
  const officialTimeSelect = document.getElementById('officialTime');
  if (officialTimeSelect && employee.OfficialTimeID) {
    officialTimeSelect.value = employee.OfficialTimeID;
  }
  
  // Make Employee ID read-only during edit (but keep it visible)
  const employeeIdInput = form.querySelector('[name="employeeId"]');
  employeeIdInput.readOnly = true;
  employeeIdInput.style.display = 'block';
  employeeIdInput.previousElementSibling.style.display = 'block'; // Show label
  
  // Change modal title and button text
  document.querySelector('#addEmployeeModal h3').textContent = 'Edit Employee';
  document.querySelector('#addEmployeeModal button[type="submit"]').textContent = 'Update Employee';
  
  // Store the employee ID for update handling
  form.dataset.editingEmployeeId = employeeId;
  
  // Show the modal
  document.getElementById('addEmployeeModal').showModal();
};

// Handle form submission for both Add and Edit
async function handleAddEmployee(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const isEditing = e.target.dataset.editingEmployeeId;
  const officialTimeId = formData.get('officialTime');

  try {
    if (isEditing) {
      await updateEmployeeInSupabase(formData, isEditing, officialTimeId);
    } else {
      await addEmployeeToSupabase(formData, officialTimeId);
    }

    // Refresh data from Supabase
    await refreshData();
    
    // Reset form and close modal
    e.target.reset();
    document.getElementById('addEmployeeModal').close();
    
    // Clean up editing state
    delete e.target.dataset.editingEmployeeId;
    const employeeIdInput = e.target.querySelector('[name="employeeId"]');
    employeeIdInput.readOnly = false;
    employeeIdInput.style.display = 'block';
    employeeIdInput.previousElementSibling.style.display = 'block';
    
    document.querySelector('#addEmployeeModal h3').textContent = 'Add New Employee';
    document.querySelector('#addEmployeeModal button[type="submit"]').textContent = 'Add Employee';
    
    alert(`Employee ${isEditing ? 'updated' : 'added'} successfully!`);
    
  } catch (error) {
    console.error('Error saving employee:', error);
    alert('Error saving employee data. Please try again.');
  }
}

// Add employee to Supabase
async function addEmployeeToSupabase(formData, officialTimeId) {
  // First create gov_info record
  const { data: govInfo, error: govError } = await supabaseClient
    .from('gov_info')
    .insert({
      sss_number: formData.get('sssId') || null,
      philhealth_number: formData.get('philhealthId') || null,
      pagibig_number: formData.get('pagibigId') || null,
      tin_number: formData.get('tinId') || null
    })
    .select()
    .single();

  if (govError) throw govError;

  // Get department ID
  const { data: department, error: deptError } = await supabaseClient
    .from('departments')
    .select('department_id')
    .eq('department_name', formData.get('department'))
    .single();

  if (deptError) throw deptError;

  // Get position ID
  const { data: position, error: posError } = await supabaseClient
    .from('positions')
    .select('position_id')
    .eq('position_name', formData.get('position'))
    .single();

  if (posError) throw posError;

  // Then create employee record
  const { error: empError } = await supabaseClient
    .from('employees')
    .insert({
      first_name: formData.get('firstName'),
      last_name: formData.get('lastName'),
      middle_name: formData.get('middleInitial') || null,
      phone_number: formData.get('contact') || null,
      address: formData.get('address') || null,
      date_hired: formData.get('dateHired'),
      department_id: department.department_id,
      position_id: position.position_id,
      gov_info_id: govInfo.gov_info_id,
      official_time_id: parseInt(officialTimeId),
      status_id: 1 // Active status
    });

  if (empError) throw empError;
}

// Update employee in Supabase
async function updateEmployeeInSupabase(formData, employeeId, officialTimeId) {
  // Get current employee data to find gov_info_id
  const { data: employee, error: empFetchError } = await supabaseClient
    .from('employees')
    .select('gov_info_id')
    .eq('emp_id', parseInt(employeeId))
    .single();

  if (empFetchError) throw empFetchError;

  // Update gov_info
  const { error: govError } = await supabaseClient
    .from('gov_info')
    .update({
      sss_number: formData.get('sssId') || null,
      philhealth_number: formData.get('philhealthId') || null,
      pagibig_number: formData.get('pagibigId') || null,
      tin_number: formData.get('tinId') || null
    })
    .eq('gov_info_id', employee.gov_info_id);

  if (govError) throw govError;

  // Get department ID
  const { data: department, error: deptError } = await supabaseClient
    .from('departments')
    .select('department_id')
    .eq('department_name', formData.get('department'))
    .single();

  if (deptError) throw deptError;

  // Get position ID
  const { data: position, error: posError } = await supabaseClient
    .from('positions')
    .select('position_id')
    .eq('position_name', formData.get('position'))
    .single();

  if (posError) throw posError;

  // Update employee
  const { error: empError } = await supabaseClient
    .from('employees')
    .update({
      first_name: formData.get('firstName'),
      last_name: formData.get('lastName'),
      middle_name: formData.get('middleInitial') || null,
      phone_number: formData.get('contact') || null,
      address: formData.get('address') || null,
      date_hired: formData.get('dateHired'),
      department_id: department.department_id,
      position_id: position.position_id,
      official_time_id: parseInt(officialTimeId)
    })
    .eq('emp_id', parseInt(employeeId));

  if (empError) throw empError;
}

// Reset form when modal is closed
document.getElementById('addEmployeeModal').addEventListener('close', function() {
  const form = document.getElementById('addEmployeeForm');
  form.reset();
  delete form.dataset.editingEmployeeId;
  const employeeIdInput = form.querySelector('[name="employeeId"]');
  employeeIdInput.readOnly = false;
  employeeIdInput.style.display = 'block';
  employeeIdInput.previousElementSibling.style.display = 'block';
  document.querySelector('#addEmployeeModal h3').textContent = 'Add New Employee';
  document.querySelector('#addEmployeeModal button[type="submit"]').textContent = 'Add Employee';
});

// Generate CSV functionality
function initializeCSVGeneration() {
  const generateCsvBtn = document.getElementById('generateCsvBtn');
  if (generateCsvBtn) {
    generateCsvBtn.addEventListener('click', handleGenerateCSV);
  }
}

// Handle CSV generation with filters
function handleGenerateCSV() {
  const department = document.getElementById('csvDepartment').value;
  const position = document.getElementById('csvPosition').value;
  const rateRange = document.getElementById('csvRateRange').value;

  // Filter data based on selections
  let filteredData = currentEmployeeData.filter(employee => {
    // Status filter - only include active employees for CSV (case-insensitive)
    if (!employee.Status || employee.Status.toLowerCase() !== 'active') return false;
    
    // Department filter
    if (department !== 'all' && employee.Department !== department) return false;
    
    // Position filter
    if (position !== 'all' && employee.Position !== position) return false;
    
    // Rate Range filter
    if (rateRange !== 'all') {
      const rate = parseInt(employee.Rate);
      switch (rateRange) {
        case '0-50000':
          if (rate > 50000) return false;
          break;
        case '50001-80000':
          if (rate < 50001 || rate > 80000) return false;
          break;
        case '80001-100000':
          if (rate < 80001 || rate > 100000) return false;
          break;
        case '100001+':
          if (rate < 100001) return false;
          break;
      }
    }
    
    return true;
  });

  if (filteredData.length === 0) {
    alert('No active employees match the selected filters.');
    return;
  }

  generateCSVFile(filteredData);
  document.getElementById('genCSV').close();
}

// Generate and download CSV file
function generateCSVFile(data) {
  console.log('Generating CSV from data:', data);
  
  // Define CSV headers
  const headers = [
    'Employee ID',
    'First Name',
    'Last Name',
    'Middle Initial',
    'Position',
    'Department',
    'Rate',
    'SSSID',
    'PhilhealthID',
    'PagIBIGID',
    'TINID',
    'DateHired',
    'Contact',
    'Address',
    'OfficialTimeID',
    'ScheduleName',
    'StartTime',
    'EndTime',
    'Status'
  ];

  // Convert data to CSV format
  let csvContent = headers.join(',') + '\n';
  
  data.forEach(employee => {
    const row = headers.map(header => {
      let value = employee[header] || '';
      console.log(`Field: ${header}, Value:`, value);
      
      // Convert to string and handle empty values
      value = String(value);
      
      // Escape commas and quotes in values
      if (value.includes(',') || value.includes('"')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvContent += row.join(',') + '\n';
  });

  console.log('Final CSV content:', csvContent);

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Create filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `employee_data_${timestamp}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Show success message
  alert(`CSV file "${filename}" generated successfully with ${data.length} employee(s)!`);
}

// Refresh all data from Supabase
async function refreshData() {
  const { employees } = await initializeEmployeeData();
  currentEmployeeData = employees;
  filterAndDisplayData();
}