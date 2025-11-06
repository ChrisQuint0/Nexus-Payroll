import { supabaseClient } from '../supabase/supabaseClient.js';

// Function to fetch all leave data from Supabase
export async function fetchLeaveData() {
  try {
    const { data: leaves, error: leavesError } = await supabaseClient
      .from('leave_management')
      .select(`
        *,
        employees (
          emp_id,
          first_name,
          last_name,
          middle_name,
          departments (department_name),
          positions (position_name)
        )
      `)
      .order('leave_start', { ascending: false });

    if (leavesError) {
      console.error('Error fetching leave data:', leavesError);
      return [];
    }

    if (!leaves || leaves.length === 0) {
      return [];
    }

    const transformedData = leaves.map(leave => {
      const startDate = new Date(leave.leave_start);
      const endDate = new Date(leave.leave_end);
      const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      const employee = leave.employees;
      const fullName = employee 
        ? `${employee.first_name} ${employee.middle_name ? employee.middle_name + ' ' : ''}${employee.last_name}`
        : 'N/A';

      return {
        "Employee ID": employee?.emp_id?.toString() || leave.leave_id.toString(),
        "Name": fullName,
        "Position": employee?.positions?.position_name || 'N/A',
        "Department": employee?.departments?.department_name || 'N/A',
        "Leave Duration": duration,
        "Type": leave.leave_type || 'N/A',
        "Status": leave.is_paid ? "Paid" : "Unpaid",
        "Leave Balance": leave.leave_balance || 0,
        "Leave Request ID": leave.leave_id,
        "Start Date": leave.leave_start,
        "End Date": leave.leave_end
      };
    });

    return transformedData;
  } catch (error) {
    console.error('Error in fetchLeaveData:', error);
    return [];
  }
}

// Initialize with empty arrays
export let rowData = [];

// Function to initialize all data
export async function initializeLeaveData() {
  try {
    const leaves = await fetchLeaveData();
    rowData = leaves;
    
    return { leaves };
  } catch (error) {
    console.error('Error initializing leave data:', error);
    return { leaves: [] };
  }
}
