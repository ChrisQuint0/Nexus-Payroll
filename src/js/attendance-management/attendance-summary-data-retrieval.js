import { supabaseClient } from "../supabase/supabaseClient.js";

export async function getPayrollSummaryReport(cutoffId) {
  try {
    if (!cutoffId) {
      console.error("Cutoff ID is required to fetch the payroll summary.");
      return { data: [], cutoffInfo: null };
    }

    console.log(`Fetching Payroll Summary Report for Cutoff ID: ${cutoffId}...`);

    const { data: summaryData, error: summaryError } = await supabaseClient
      .from("attendance_summary_report")
      .select("*")
      .eq("cutoff_id", cutoffId)
      .order("last_name", { ascending: true });

    if (summaryError) {
      console.error("Error fetching payroll summary data:", summaryError);
      return { data: [], cutoffInfo: null };
    }

    //  Extract cutoff info from first record
    const cutoffInfo = summaryData.length > 0 ? {
      cutoffId: cutoffId,
      cutoffPeriod: summaryData[0].cutoff_period || "N/A"
    } : null;

    const formattedReport = summaryData.map((item) => ({
      "Cutoff ID": cutoffId,
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
      "Absences": item.absences ?? 0,
      "Cutoff Period": item.cutoff_period || "N/A",
      "Department": item.department_name || "N/A",
    }));

    console.log(" Payroll Summary Report ready.");
    console.log("Sample row:", formattedReport[0]); 
    return { data: formattedReport, cutoffInfo };
  } catch (err) {
    console.error(" Unexpected error in getPayrollSummaryReport:", err);
    return { data: [], cutoffInfo: null };
  }
}