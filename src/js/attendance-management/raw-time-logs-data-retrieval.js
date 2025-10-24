// src/js/attendance-management/raw-time-logs-data-retrieval.js
import { supabaseClient } from "../supabase/supabaseClient.js"; // Import Supabase client

// Function to fetch and format employee attendance logs
export async function getEmployeeAttendanceTable() {
  try {
    console.log("Fetching and formatting employee time logs...");

    //  Query the 'employee_time_logs' view
    const { data: timeLogs, error: timeLogsError } = await supabaseClient
      .from("employee_time_logs")
      .select("*")
      .order("time_in", { ascending: true }); // Ensure chronological order

    if (timeLogsError) {
      console.error("Error fetching attendance data:", timeLogsError);
      return [];
    }

    // Format data for AG Grid display
    const formattedLogs = timeLogs.map((log) => ({
      "Date": log.date || "N/A",
      "Employee ID": log.employee_id?.toString() || "",
      "Last Name": log.last_name || "",
      "First Name": log.first_name || "",
      "Middle Name": log.middle_name || "",
      "Official Time": log.official_time || "",
      "Time In": log.time_in || "",
      "Time Out": log.time_out || "",
      "Late (m)": log.late_m ?? 0,
      "Undertime": log.undertime ?? 0,
      "Status": log.status || "N/A",
    }));

    console.log(" Attendance logs ready.");
    return formattedLogs;
  } catch (err) {
    console.error(" Unexpected error in getEmployeeAttendanceTable:", err);
    return [];
  }
}
