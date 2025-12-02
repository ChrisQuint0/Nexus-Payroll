import { supabaseClient } from "../supabase/supabaseClient.js";

export async function getPayrollSummaryReport(cutoffId) {
  try {
    // 1. Determine if we should fetch ALL records
    // This allows the calling function to pass null, undefined, or 'all' to load everything
    const fetchAll = !cutoffId || cutoffId === "all";

    console.log(
      `Fetching Payroll Summary Report for Cutoff ID: ${
        fetchAll ? "ALL" : cutoffId
      }...`
    );

    let query = supabaseClient
      .from("attendance_summary_report")
      .select("*")
      // Order by cutoff_id descending (newest first), then by last name
      .order("cutoff_id", { ascending: true })
      .order("employee_id", { ascending: true });

    // 2. Only apply the filter if we are NOT fetching all
    if (!fetchAll) {
      query = query.eq("cutoff_id", cutoffId);
    }

    const { data: summaryData, error: summaryError } = await query;

    if (summaryError) {
      console.error("Error fetching payroll summary data:", summaryError);
      return { data: [], cutoffInfo: null };
    }

    //  Extract cutoff info from first record
    let cutoffInfo = null;
    if (summaryData.length > 0) {
      cutoffInfo = {
        cutoffId: fetchAll ? "All" : cutoffId,
        cutoffPeriod: fetchAll
          ? "All Cutoff Periods"
          : summaryData[0].cutoff_period || "N/A",
      };
    }

    const formattedReport = summaryData.map((item) => ({
      // Use the actual cutoff ID from the item so it displays correctly
      "Cutoff ID": item.cutoff_id?.toString() || "",
      "Employee ID": item.employee_id?.toString() || "",
      "First Name": item.first_name || "",
      "Middle Name": item.middle_name || "",
      "Last Name": item.last_name || "",
      "Regular Hours": item.regular_hours ?? 0,
      "Overtime Hours": item.overtime_hours ?? 0,
      "Late Minutes": item.late_minutes ?? 0,
      "Undertime Minutes": item.undertime_minutes ?? 0,
      "Leave W/ Pay": item.leave_w_pay ?? 0,
      "Leave W/O Pay": item.leave_wo_pay ?? 0,
      Absences: item.absences ?? 0,
      "Cutoff Period": item.cutoff_period || "N/A",
      Department: item.department_name || "N/A",
    }));

    console.log(" Payroll Summary Report ready.");
    console.log("Sample row:", formattedReport[0]);
    return { data: formattedReport, cutoffInfo };
  } catch (err) {
    console.error(" Unexpected error in getPayrollSummaryReport:", err);
    return { data: [], cutoffInfo: null };
  }
}
