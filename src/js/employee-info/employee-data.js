import { supabaseClient } from '../supabase/supabaseClient.js'; // Fixed path

// Function to fetch all employee data with joins
export async function fetchEmployeeData() {
  try {
    // Fetch employees with all related data using multiple queries
    const { data: employees, error: employeesError } = await supabaseClient
      .from('employees')
      .select(`
        *,
        departments (department_name),
        positions (position_name, base_salary),
        gov_info (sss_number, philhealth_number, pagibig_number, tin_number),
        official_time (schedule_name, start_time, end_time),
        employee_status (status_name)
      `);

    if (employeesError) {
      console.error('Error fetching employee data:', employeesError);
      return [];
    }

    // Transform the data to match your existing structure
    const transformedData = employees.map(emp => ({
      // Map to your existing field names
      "Employee ID": emp.emp_id.toString(),
      "First Name": emp.first_name,
      "Last Name": emp.last_name,
      "Middle Initial": emp.middle_name || '',
      "Position": emp.positions?.position_name || '',
      "Department": emp.departments?.department_name || '',
      "Rate": emp.positions?.base_salary?.toString() || '0',
      "SSSID": emp.gov_info?.sss_number || '',
      "PhilhealthID": emp.gov_info?.philhealth_number || '',
      "PagIBIGID": emp.gov_info?.pagibig_number || '',
      "TINID": emp.gov_info?.tin_number || '',
      "DateHired": emp.date_hired,
      "Contact": emp.phone_number || '',
      "Address": emp.address || '',
      "OfficialTimeID": emp.official_time_id?.toString() || '',
      "ScheduleName": emp.official_time?.schedule_name || '',
      "StartTime": emp.official_time?.start_time || '',
      "EndTime": emp.official_time?.end_time || '',
      "Status": emp.employee_status?.status_name || 'Active'
    }));

    console.log('Employee data fetched and transformed successfully:', transformedData);
    return transformedData;
  } catch (error) {
    console.error('Error in fetchEmployeeData:', error);
    return [];
  }
}

// Function to fetch official time schedules
export async function fetchOfficialTimeSchedules() {
  try {
    const { data, error } = await supabaseClient
      .from('official_time')
      .select('*')
      .order('official_time_id');

    if (error) {
      console.error('Error fetching official time schedules:', error);
      return [];
    }

    // Transform to match your existing structure
    const transformedSchedules = data.map(schedule => ({
      official_time_id: schedule.official_time_id.toString(),
      schedule_name: schedule.schedule_name,
      start_time: schedule.start_time,
      end_time: schedule.end_time
    }));

    return transformedSchedules;
  } catch (error) {
    console.error('Error in fetchOfficialTimeSchedules:', error);
    return [];
  }
}

// Function to fetch departments for dropdowns
export async function fetchDepartments() {
  try {
    const { data, error } = await supabaseClient
      .from('departments')
      .select('*')
      .order('department_id');

    if (error) {
      console.error('Error fetching departments:', error);
      return [];
    }

    return data;
  } catch (error) {
    console.error('Error in fetchDepartments:', error);
    return [];
  }
}

// Function to fetch positions for dropdowns
export async function fetchPositions() {
  try {
    const { data, error } = await supabaseClient
      .from('positions')
      .select('*')
      .order('position_id');

    if (error) {
      console.error('Error fetching positions:', error);
      return [];
    }

    return data;
  } catch (error) {
    console.error('Error in fetchPositions:', error);
    return [];
  }
}

// Initialize with empty arrays - will be populated after fetch
export let rowData = [];
export let officialTimeSchedules = [];

// Function to initialize all data
export async function initializeEmployeeData() {
  try {
    const [employees, schedules] = await Promise.all([
      fetchEmployeeData(),
      fetchOfficialTimeSchedules()
    ]);
    
    rowData = employees;
    officialTimeSchedules = schedules;
    
    console.log('Data initialized:', { employees, schedules });
    return { employees, schedules };
  } catch (error) {
    console.error('Error initializing employee data:', error);
    return { employees: [], schedules: [] };
  }
}