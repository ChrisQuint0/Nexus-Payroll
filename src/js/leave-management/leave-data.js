import { supabaseClient } from '../supabase/supabaseClient.js';

// Function to fetch all active employees with leave tracking data
export async function fetchEmployeeLeaveData() {
  try {
    const { data: employees, error: employeesError } = await supabaseClient
      .from('employees')
      .select(`
        emp_id,
        first_name,
        last_name,
        middle_name,
        leave_tracking_id,
        departments (department_name),
        positions (position_name),
        employee_status (status_name),
        leave_tracking!employees_leave_tracking_id_fkey (
          leave_tracking_id,
          vacation_leave,
          sick_leave,
          emergency_leave,
          personal_leave,
          maternity_leave
        )
      `)
      .eq('status_id', 1) // Only fetch active employees
      .order('emp_id', { ascending: true });

    if (employeesError) {
      console.error('Error fetching employee data:', employeesError);
      console.error('Error details:', employeesError.message, employeesError.details);
      return [];
    }

    if (!employees || employees.length === 0) {
      console.log('No active employees found');
      return [];
    }

    console.log('Fetched employees:', employees);

    const transformedData = employees.map(emp => {
      // Get leave tracking data
      const leaveTracking = emp.leave_tracking || {};
      
      const leaveBalances = {
        "Vacation Leave": parseFloat(leaveTracking.vacation_leave || 15),
        "Sick Leave": parseFloat(leaveTracking.sick_leave || 15),
        "Emergency Leave": parseFloat(leaveTracking.emergency_leave || 5),
        "Personal Leave": parseFloat(leaveTracking.personal_leave || 3),
        "Maternity Leave": parseFloat(leaveTracking.maternity_leave || 105)
      };

      // Calculate total leave balance
      const totalBalance = 
        leaveBalances["Vacation Leave"] +
        leaveBalances["Sick Leave"] +
        leaveBalances["Emergency Leave"] +
        leaveBalances["Personal Leave"] +
        leaveBalances["Maternity Leave"];

      return {
        "Employee ID": emp.emp_id.toString(),
        "Last Name": emp.last_name,
        "First Name": emp.first_name,
        "Middle Initial": emp.middle_name || '',
        "Position": emp.positions?.position_name || 'N/A',
        "Department": emp.departments?.department_name || 'N/A',
        "Total Leave Balance": totalBalance,
        "Leave Tracking ID": emp.leave_tracking_id,
        "Leave Details": leaveBalances
      };
    });

    console.log('Transformed employee data:', transformedData);
    return transformedData;
  } catch (error) {
    console.error('Error in fetchEmployeeLeaveData:', error);
    return [];
  }
}

// Initialize with empty arrays
export let rowData = [];

// Function to initialize all data
export async function initializeLeaveData() {
  try {
    const employees = await fetchEmployeeLeaveData();
    rowData = employees;
    
    console.log('Employee leave data initialized:', employees);
    return { employees };
  } catch (error) {
    console.error('Error initializing leave data:', error);
    return { employees: [] };
  }
}
