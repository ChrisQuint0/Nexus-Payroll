import { gridApi, rowData } from './grid.js';

// Global variables
let currentEmployeeData = [...rowData];

// Initialize functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeSearch();
    initializeCSVGeneration(); // Add this line
});

// Event listeners setup
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
}

// Search functionality
function initializeSearch() {
    const searchBar = document.getElementById('searchBar');
    if (searchBar) {
        searchBar.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const filteredData = currentEmployeeData.filter(employee => 
                Object.values(employee).some(value => 
                    value.toString().toLowerCase().includes(searchTerm)
                )
            );
            gridApi.setGridOption('rowData', filteredData);
        });
    }
}

// Handle selection change for delete button
window.handleSelectionChange = function() {
    const selectedRows = gridApi.getSelectedRows();
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.disabled = selectedRows.length === 0;
    }
};

// Delete selected rows
function handleDeleteSelected() {
    const selectedRows = gridApi.getSelectedRows();
    if (selectedRows.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedRows.length} employee(s)?`)) {
        const selectedIds = selectedRows.map(row => row['Employee ID']);
        currentEmployeeData = currentEmployeeData.filter(
            employee => !selectedIds.includes(employee['Employee ID'])
        );
        
        gridApi.setGridOption('rowData', currentEmployeeData);
        const deleteBtn = document.getElementById('deleteBtn');
        if (deleteBtn) {
            deleteBtn.disabled = true;
        }
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
                        <span class="font-medium">Name:</span>
                        <span>${employee.Name}</span>
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
                </div>
            </div>
            
            <!-- Salary Information -->
            <div class="space-y-4">
                <h4 class="font-bold text-lg border-b pb-2">Salary Information</h4>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="font-medium">Salary Structure:</span>
                        <span>${employee.SalaryStructure}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium">Rate:</span>
                        <span>₱${parseInt(employee.Rate).toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium">Classification:</span>
                        <span>${employee.Classification || 'N/A'}</span>
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
    form.querySelector('[name="name"]').value = employee.Name;
    form.querySelector('[name="contact"]').value = employee.Contact || '';
    form.querySelector('[name="address"]').value = employee.Address || '';
    form.querySelector('[name="position"]').value = employee.Position;
    form.querySelector('[name="department"]').value = employee.Department;
    form.querySelector('[name="dateHired"]').value = employee.DateHired || '';
    form.querySelector('[name="salaryStructure"]').value = employee.SalaryStructure;
    form.querySelector('[name="rate"]').value = employee.Rate;
    form.querySelector('[name="classification"]').value = employee.Classification || 'Full-Time';
    form.querySelector('[name="sssId"]').value = employee.SSSID || '';
    form.querySelector('[name="philhealthId"]').value = employee.PhilhealthID || '';
    form.querySelector('[name="pagibigId"]').value = employee.PagIBIGID || '';
    form.querySelector('[name="tinId"]').value = employee.TINID || '';
    
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
    
    const employeeData = {
        "Employee ID": formData.get('employeeId'),
        Name: formData.get('name'),
        Position: formData.get('position'),
        Department: formData.get('department'),
        SalaryStructure: formData.get('salaryStructure'),
        Rate: formData.get('rate'),
        Classification: formData.get('classification'),
        SSSID: formData.get('sssId') || '',  // Ensure empty strings instead of null
        PhilhealthID: formData.get('philhealthId') || '',
        PagIBIGID: formData.get('pagibigId') || '',
        TINID: formData.get('tinId') || '',
        DateHired: formData.get('dateHired') || '',
        Contact: formData.get('contact') || '',
        Address: formData.get('address') || ''
    };
    
    if (isEditing) {
        // Update existing employee
        const employeeIndex = currentEmployeeData.findIndex(
            emp => emp['Employee ID'] === isEditing
        );
        
        if (employeeIndex !== -1) {
            currentEmployeeData[employeeIndex] = employeeData;
            gridApi.setGridOption('rowData', currentEmployeeData);
            
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
        gridApi.setGridOption('rowData', currentEmployeeData);
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
    const salaryStructure = document.getElementById('csvSalaryStructure').value;
    const classification = document.getElementById('csvClassification').value;
    const rateRange = document.getElementById('csvRateRange').value;

    // Filter data based on selections
    let filteredData = currentEmployeeData.filter(employee => {
        // Department filter
        if (department !== 'all' && employee.Department !== department) return false;
        
        // Position filter
        if (position !== 'all' && employee.Position !== position) return false;
        
        // Salary Structure filter
        if (salaryStructure !== 'all' && employee.SalaryStructure !== salaryStructure) return false;
        
        // Classification filter
        if (classification !== 'all' && employee.Classification !== classification) return false;
        
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
        alert('No employees match the selected filters.');
        return;
    }

    generateCSVFile(filteredData);
    document.getElementById('genCSV').close();
}

// Generate and download CSV file
function generateCSVFile(data) {
    console.log('Generating CSV from data:', data); // Debug log
    
    // Define CSV headers - MUST MATCH the exact field names from employee-data.js
    const headers = [
        'Employee ID',
        'Name',
        'Position',
        'Department',
        'SalaryStructure',
        'Rate',
        'Classification',
        'SSSID',           // Changed from 'SSS ID'
        'PhilhealthID',    // Changed from 'Philhealth ID'
        'PagIBIGID',       // Changed from 'Pag-IBIG ID'
        'TINID',           // Changed from 'TIN ID'
        'DateHired',       // Changed from 'Date Hired'
        'Contact',
        'Address'
    ];

    // Convert data to CSV format
    let csvContent = headers.join(',') + '\n';
    
    data.forEach(employee => {
        const row = headers.map(header => {
            let value = employee[header] || '';
            console.log(`Field: ${header}, Value:`, value); // Debug log
            
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

    console.log('Final CSV content:', csvContent); // Debug log

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