import { supabaseClient } from "../supabase/supabaseClient.js";
import { fetchCutoffs } from "./cutoff-handler.js";

// Fetch all departments from the database
async function fetchDepartments() {
  try {
    const { data, error } = await supabaseClient
      .from("departments")
      .select("*")
      .order("department_name", { ascending: true });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error fetching departments:", error);
    return [];
  }
}

// Populate the cutoff dropdown in CSV modal
async function populateCSVCutoffDropdown() {
  const cutoffSelect = document.querySelector("#genCSV select:first-of-type");

  if (!cutoffSelect) {
    console.error("CSV cutoff select element not found");
    return;
  }

  // Fetch cutoffs from database
  const cutoffs = await fetchCutoffs();

  // Clear existing options
  cutoffSelect.innerHTML = "";

  // Add cutoffs to dropdown
  cutoffs.forEach((cutoff) => {
    const option = document.createElement("option");
    option.value = cutoff.cutoff_id;
    option.textContent = `${cutoff.cutoff_start_date} to ${cutoff.cutoff_end_date}`;
    cutoffSelect.appendChild(option);
  });

  // Select the first option by default
  if (cutoffs.length > 0) {
    cutoffSelect.selectedIndex = 0;
  }
}

// Populate the department dropdown in CSV modal
async function populateCSVDepartmentDropdown() {
  const departmentSelect = document.getElementById("departmentCSV");

  if (!departmentSelect) {
    console.error("CSV department select element not found");
    return;
  }

  // Fetch departments from database
  const departments = await fetchDepartments();

  // Clear existing options and add "All Departments"
  departmentSelect.innerHTML = '<option value="all">All Departments</option>';

  // Add departments to dropdown
  departments.forEach((dept) => {
    const option = document.createElement("option");
    option.value = dept.department_id;
    option.textContent = dept.department_name;
    departmentSelect.appendChild(option);
  });
}

// Fetch payroll data for CSV generation
async function fetchPayrollDataForCSV(cutoffId, departmentId) {
  try {
    let query = supabaseClient
      .from("payroll_register_report")
      .select("*")
      .eq("cutoff_id", cutoffId);

    // Add department filter if not "all"
    if (departmentId !== "all") {
      // Need to join with employees to filter by department
      const { data: employees, error: empError } = await supabaseClient
        .from("employees")
        .select("emp_id")
        .eq("department_id", departmentId);

      if (empError) throw empError;

      const empIds = employees.map((e) => e.emp_id);
      query = query.in("employee_id", empIds);
    }

    const { data, error } = await query.order("last_name", { ascending: true });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error fetching payroll data for CSV:", error);
    return [];
  }
}

// Convert data to CSV format
function convertToCSV(data) {
  if (data.length === 0) {
    return "";
  }

  // Define CSV headers
  const headers = [
    "Employee ID",
    "First Name",
    "Middle Name",
    "Last Name",
    "Department",
    "Cutoff Period",
    "Regular Pay",
    "Overtime Pay",
    "Leave Pay",
    "Gross Pay",
    "Absences Deduction",
    "Tardiness Deduction",
    "Undertime Deduction",
    "SSS Deduction",
    "PhilHealth Deduction",
    "Pag-IBIG Deduction",
    "Withholding Tax",
    "Total Deductions",
    "Net Pay",
    "Working Hours",
  ];

  // Create CSV content
  let csv = headers.join(",") + "\n";

  // Add data rows
  data.forEach((row) => {
    const values = [
      row.employee_id,
      `"${row.first_name}"`,
      `"${row.middle_name || ""}"`,
      `"${row.last_name}"`,
      `"${row.department}"`,
      `"${row.cutoff_period}"`,
      parseFloat(row.regular_pay).toFixed(2),
      parseFloat(row.overtime_pay).toFixed(2),
      parseFloat(row.leave_pay_amount).toFixed(2),
      parseFloat(row.gross_pay).toFixed(2),
      parseFloat(row.absences_deduction).toFixed(2),
      parseFloat(row.tardiness_deduction).toFixed(2),
      parseFloat(row.undertime_deduction).toFixed(2),
      parseFloat(row.sss_deduction).toFixed(2),
      parseFloat(row.philhealth_deduction).toFixed(2),
      parseFloat(row.pagibig_deduction).toFixed(2),
      parseFloat(row.withholding_tax).toFixed(2),
      parseFloat(row.total_deductions).toFixed(2),
      parseFloat(row.net_pay).toFixed(2),
      row.working_hours || 0,
    ];

    csv += values.join(",") + "\n";
  });

  return csv;
}

// Download CSV file
function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Handle CSV generation
async function handleGenerateCSV() {
  const cutoffSelect = document.querySelector("#genCSV select:first-of-type");
  const departmentSelect = document.getElementById("departmentCSV");
  const generateButton = document.querySelector("#genCSV .btn-primary");

  // Get selected values
  const cutoffId = parseInt(cutoffSelect.value, 10);
  const departmentId = departmentSelect.value;
  const cutoffText = cutoffSelect.options[cutoffSelect.selectedIndex].text;
  const departmentText =
    departmentSelect.options[departmentSelect.selectedIndex].text;

  // Show loading state
  const originalText = generateButton.textContent;
  generateButton.textContent = "Generating...";
  generateButton.disabled = true;

  try {
    // Fetch data
    const data = await fetchPayrollDataForCSV(cutoffId, departmentId);

    if (data.length === 0) {
      alert("No data found for the selected filters.");
      return;
    }

    // Convert to CSV
    const csv = convertToCSV(data);

    // Generate filename
    const departmentSlug =
      departmentId === "all"
        ? "All_Departments"
        : departmentText.replace(/\s+/g, "_");
    const cutoffSlug = cutoffText.replace(/\s+/g, "_").replace(/\//g, "-");
    const filename = `Payroll_${cutoffSlug}_${departmentSlug}.csv`;

    // Download CSV
    downloadCSV(csv, filename);

    // Log to Audit Trail
    try {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      // Build filter description
      const filterDescription =
        departmentId === "all"
          ? `Cutoff: ${cutoffText}, Department: All Departments`
          : `Cutoff: ${cutoffText}, Department: ${departmentText}`;

      await supabaseClient.from("audit_trail").insert({
        user_id: user?.id,
        action: "view",
        description: `Exported payroll data to CSV (${data.length} employee(s)) - ${filterDescription}`,
        module_affected: "Payroll",
        record_id: cutoffId,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error("Error logging audit trail:", auditError);
      // Don't throw error - CSV export was successful
    }

    // Close modal
    document.getElementById("genCSV").close();

    // Show success message
    console.log(`CSV generated successfully: ${filename}`);
  } catch (error) {
    console.error("Error generating CSV:", error);
    alert("Error generating CSV. Please try again.");
  } finally {
    // Reset button state
    generateButton.textContent = originalText;
    generateButton.disabled = false;
  }
}

// Initialize CSV generator
export async function initializeCSVGenerator() {
  // Handle open modal button
  const openButton = document.getElementById("openCSVModal");
  if (openButton) {
    openButton.addEventListener("click", async () => {
      await populateCSVCutoffDropdown();
      await populateCSVDepartmentDropdown();
      document.getElementById("genCSV").showModal();
    });
  }

  // Handle generate button click
  const generateButton = document.querySelector("#genCSV .btn-primary");
  if (generateButton) {
    generateButton.addEventListener("click", handleGenerateCSV);
  }
}
