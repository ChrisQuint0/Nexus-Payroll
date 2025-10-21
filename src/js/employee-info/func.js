import { gridApi, rowData } from './grid.js';
import { officialTimeSchedules } from './employee-data.js'; // Add this import

// Global variables
let currentEmployeeData = [...rowData];
let currentView = 'active'; // 'active' or 'inactive'

// Initialize functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeSearch();
    initializeCSVGeneration();
    populateOfficialTimeDropdown();
    initializeTabSwitching(); // Add this line
});

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
    gridApi.deselectAll();
    handleSelectionChange();
}

// Filter and display data based on current view
function filterAndDisplayData() {
    const filteredData = currentEmployeeData.filter(employee => {
        if (currentView === 'active') {
            return employee.Status === 'Active';
        } else {
            return employee.Status === 'Inactive';
        }
    });
    
    gridApi.setGridOption('rowData', filteredData);
}

// Populate official time dropdown
function populateOfficialTimeDropdown() {
    const officialTimeSelect = document.getElementById('officialTime');
    if (officialTimeSelect) {
        officialTimeSelect.innerHTML = '<option value="">Select Official Time</option>';
        officialTimeSchedules.forEach(schedule => {
            const option = document.createElement('option');
            option.value = schedule.official_time_id;
            option.textContent = schedule.schedule_name;
            officialTimeSelect.appendChild(option);
        });
    }
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
            gridApi.setGridOption('rowData', filteredData);
        });
    }
}

// Handle selection change for archive button
window.handleSelectionChange = function() {
    const selectedRows = gridApi.getSelectedRows();
    const archiveBtn = document.getElementById('archiveBtn');
    if (archiveBtn) {
        archiveBtn.disabled = selectedRows.length === 0;
    }
};

// Archive/Restore selected rows
function handleArchiveSelected() {
    const selectedRows = gridApi.getSelectedRows();
    if (selectedRows.length === 0) return;
    
    const action = currentView === 'active' ? 'archive' : 'restore';
    const actionText = currentView === 'active' ? 'Archive' : 'Restore';
    
    if (confirm(`Are you sure you want to ${actionText.toLowerCase()} ${selectedRows.length} employee(s)?`)) {
        const selectedIds = selectedRows.map(row => row['Employee ID']);
        
        // Update employee status
        currentEmployeeData = currentEmployeeData.map(employee => {
            if (selectedIds.includes(employee['Employee ID'])) {
                return {
                    ...employee,
                    Status: action === 'archive' ? 'Inactive' : 'Active'
                };
            }
            return employee;
        });
        
        // Refresh grid
        filterAndDisplayData();
        
        // Disable button after action
        const archiveBtn = document.getElementById('archiveBtn');
        if (archiveBtn) {
            archiveBtn.disabled = true;
        }
        
        alert(`${selectedRows.length} employee(s) ${actionText.toLowerCase()}d successfully!`);
    }
}

// Show employee details in modal
function showEmployeeDetails(employeeId) {
    const employee = currentEmployeeData.find(emp => emp['Employee ID'] === employeeId);
    if (!employee) return;
    
    const detailsContainer = document.getElementById('employeeDetails');
    detailsContainer.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Personal Information -->
            <div class="space-y-4">
                <h4 class="font-bold text-lg border-b pb-2">Personal Information</h4>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="font-medium">Employee ID:</span>
                        <span>${employee['Employee ID']}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium">Last Name:</span>
                        <span>${employee['Last Name']}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium">First Name:</span>
                        <span>${employee['First Name']}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium">Middle Initial:</span>
                        <span>${employee['Middle Initial'] || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium">Status:</span>
                        <span class="px-2 py-1 rounded ${employee.Status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${employee.Status}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium">Contact:</span>
                        <span>${employee.Contact || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium">Address:</span>
                        <span class="text-right">${employee.Address || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <!-- Role Information -->
            <div class="space-y-4">
                <h4 class="font-bold text-lg border-b pb-2">Role Information</h4>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="font-medium">Position:</span>
                        <span>${employee.Position}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium">Department:</span>
                        <span>${employee.Department}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium">Date Hired:</span>
                        <span>${employee.DateHired ? new Date(employee.DateHired).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium">Official Time:</span>
                        <span>${employee.ScheduleName || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium">Start Time:</span>
                        <span>${employee.StartTime ? formatTime(employee.StartTime) : 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium">End Time:</span>
                        <span>${employee.EndTime ? formatTime(employee.EndTime) : 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <!-- Salary Information -->
            <div class="space-y-4">
                <h4 class="font-bold text-lg border-b pb-2">Salary Information</h4>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="font-medium">Rate:</span>
                        <span>₱${parseInt(employee.Rate).toLocaleString()}</span>
                    </div>
                </div>
            </div>
            
            <!-- Government IDs -->
            <div class="space-y-4">
                <h4 class="font-bold text-lg border-b pb-2">Government IDs</h4>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="font-medium">SSS ID:</span>
                        <span>${employee.SSSID || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium">Philhealth ID:</span>
                        <span>${employee.PhilhealthID || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium">Pag-IBIG ID:</span>
                        <span>${employee.PagIBIGID || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium">TIN ID:</span>
                        <span>${employee.TINID || 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="flex justify-end mt-6">
            <button class="btn btn-primary" onclick="editEmployee('${employee['Employee ID']}')">
                Edit
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
    
    // Make Employee ID read-only during edit
    form.querySelector('[name="employeeId"]').readOnly = true;
    
    // Change modal title and button text
    document.querySelector('#addEmployeeModal h3').textContent = 'Edit Employee';
    document.querySelector('#addEmployeeModal button[type="submit"]').textContent = 'Update Employee';
    
    // Store the employee ID for update handling
    form.dataset.editingEmployeeId = employeeId;
    
    // Show the modal
    document.getElementById('addEmployeeModal').showModal();
};

// Handle form submission for both Add and Edit
function handleAddEmployee(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const isEditing = e.target.dataset.editingEmployeeId;
    const officialTimeId = formData.get('officialTime');
    
    // Find the selected official time schedule
    const selectedSchedule = officialTimeSchedules.find(
        schedule => schedule.official_time_id === officialTimeId
    );
    
    const employeeData = {
        "Employee ID": formData.get('employeeId'),
        "First Name": formData.get('firstName'),
        "Last Name": formData.get('lastName'),
        "Middle Initial": formData.get('middleInitial') || '',
        Position: formData.get('position'),
        Department: formData.get('department'),
        Rate: formData.get('rate'),
        SSSID: formData.get('sssId') || '',
        PhilhealthID: formData.get('philhealthId') || '',
        PagIBIGID: formData.get('pagibigId') || '',
        TINID: formData.get('tinId') || '',
        DateHired: formData.get('dateHired') || '',
        Contact: formData.get('contact') || '',
        Address: formData.get('address') || '',
        OfficialTimeID: officialTimeId || '',
        ScheduleName: selectedSchedule ? selectedSchedule.schedule_name : '',
        StartTime: selectedSchedule ? selectedSchedule.start_time : '',
        EndTime: selectedSchedule ? selectedSchedule.end_time : '',
        Status: isEditing ? currentEmployeeData.find(emp => emp['Employee ID'] === isEditing)?.Status || 'Active' : 'Active' // Set status for new employees
    };
    
    if (isEditing) {
        // Update existing employee
        const employeeIndex = currentEmployeeData.findIndex(
            emp => emp['Employee ID'] === isEditing
        );
        
        if (employeeIndex !== -1) {
            currentEmployeeData[employeeIndex] = employeeData;
            filterAndDisplayData();
            
            alert('Employee updated successfully!');
        }
    } else {
        // Add new employee
        // Check if employee ID already exists
        if (currentEmployeeData.some(emp => emp['Employee ID'] === employeeData['Employee ID'])) {
            alert('Employee ID already exists!');
            return;
        }
        
        currentEmployeeData.push(employeeData);
        filterAndDisplayData();
        alert('Employee added successfully!');
    }
    
    // Reset form and close modal
    e.target.reset();
    document.getElementById('addEmployeeModal').close();
    
    // Clean up editing state
    delete e.target.dataset.editingEmployeeId;
    e.target.querySelector('[name="employeeId"]').readOnly = false;
    document.querySelector('#addEmployeeModal h3').textContent = 'Add New Employee';
    document.querySelector('#addEmployeeModal button[type="submit"]').textContent = 'Add Employee';
}

// Reset form when modal is closed
document.getElementById('addEmployeeModal').addEventListener('close', function() {
    const form = document.getElementById('addEmployeeForm');
    form.reset();
    delete form.dataset.editingEmployeeId;
    form.querySelector('[name="employeeId"]').readOnly = false;
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
        // Status filter - only include active employees for CSV
        if (employee.Status !== 'Active') return false;
        
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
    
    // Define CSV headers - include new official time fields
    const headers = [
        'Employee ID',
        'First Name',
        'Last Name',
        'Middle Initial',
        'Position',
        'Department',
        'SalaryStructure',
        'Rate',
        'Classification',
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