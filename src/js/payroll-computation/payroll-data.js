import { supabaseClient } from "../supabase/supabaseClient.js";

// Function to fetch payroll data from Supabase
export async function fetchPayrollData() {
  try {
    const { data, error } = await supabaseClient
      .from("payroll_register_report")
      .select("*")
      .order("cutoff_id", { ascending: true })
      .order("last_name", { ascending: true });

    if (error) throw error;

    // Transform the data to match your grid column structure
    return data.map((row) => ({
      "Employee ID": row.employee_id,
      Name: `${row.first_name} ${row.middle_name || ""} ${
        row.last_name
      }`.trim(),
      Net: parseFloat(row.net_pay).toFixed(2),
      Gross: parseFloat(row.gross_pay).toFixed(2),
      "Total Deductions": parseFloat(row.total_deductions).toFixed(2),
      "Cutoff Period": row.cutoff_period,
      "Cutoff ID": row.cutoff_id, // Add this for filtering
      Department: row.department,
      // Store additional data for the "View More" modal
      _rawData: row,
    }));
  } catch (error) {
    console.error("Error fetching payroll data:", error);
    return [];
  }
}

// For backward compatibility, export empty array initially
export let rowData = [];
