/**
 * Fetches all employee details from the created SQL View.
 * @returns {Array<Object>} An array of employee objects.
 */
async function getEmployeeDetails() {
  console.log("Fetching full employee details from the View...");

  // We are querying the 'employee_full_details' View
  const { data: employees, error } = await supabase
    .from("employee_full_details")
    .select("*"); // Select all columns from the View

  if (error) {
    console.error("Error fetching employee data:", error);
    return [];
  }

  console.log("Data fetched successfully.");
  return employees;
}
