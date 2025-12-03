//Establish Supabase connection
import { supabaseClient } from "../supabase/supabaseClient.js";

const departmentSelect = document.getElementById("department-select");
//Code for fetching departments from supabase and putting the options in the select element
async function fetchDepartments() {
  const { data: departmentData, error } = await supabaseClient
    .from("departments")
    .select("*");
  if (error) {
    console.error(
      "Something went wrong with fetching data from departments.",
      error.message
    );
    return [];
  }

  // 1. Add 'All Departments' option first
  const allOption = document.createElement("option");
  allOption.value = 0; // Use 0 as the special ID for 'All Departments'
  allOption.textContent = "All Departments";
  departmentSelect.appendChild(allOption);

  //code for populating the select element in reverse order
  departmentData.reverse().forEach((department) => {
    const option = document.createElement("option");
    option.value = department.department_id;
    option.textContent = department.department_name;
    departmentSelect.appendChild(option);
  });
  return departmentData;
}
fetchDepartments();

/**
 * Retrieves the count of ALL employees for a specific department (or all if dept_id = 0).
 *
 * Args:
 * dept_id: The ID of the department to filter employees by (0 for all).
 *
 * Returns:
 * number|null: The total count of employees, or null if an error occurs.
 */
async function getCountDeptEmployees(dept_id) {
  let query = supabaseClient
    .from("employees")
    .select("*", { count: "exact", head: true });

  // Only apply department filter if dept_id is not 0 (All Departments)
  if (dept_id != 0) {
    query = query.eq("department_id", dept_id);
  }

  const { count, error } = await query;

  if (error) {
    console.error(
      "Error getting the total count of employees in the department:",
      error.message
    );
    return null;
  }
  return count;
}

/**
 * Retrieves the count of leaves that are active or upcoming (leave_start >= today)
 * from the leave_management table for a specific department (or all if dept_id = 0).
 *
 * Args:
 * dept_id: The ID of the department to filter leaves by (0 for all).
 *
 * Returns:
 * number|null: The count of active/upcoming leaves, or null if an error occurs.
 */
async function getOnLeaveCount(dept_id) {
  // Get today's date at midnight in YYYY-MM-DD format for database comparison
  // Using a string comparison here is safer for `timestamp without time zone` columns
  const today = new Date();
  const dateString = today.toISOString().split("T")[0]; // e.g., "2025-12-02"

  // 1. Start building the query on the leave_management table
  let query = supabaseClient
    .from("leave_management")
    .select("leave_id, employees!inner(department_id)", {
      count: "exact",
      head: true,
    })
    // 2. Filter for leaves starting today or in the future
    .gte("leave_start", dateString);

  // 3. Conditionally apply department filter (FIX for All Departments)
  if (dept_id != 0) {
    // Note: The department_id is filtered via the implicit join in the select statement
    query = query.eq("employees.department_id", dept_id);
  }

  const { count, error } = await query;

  if (error) {
    console.error(
      "Error getting the active/upcoming leave count:",
      error.message
    );
    return null;
  }
  return count;
}

// Add this function before getTardinessData

/**
 * Retrieves all defined cutoff periods, sorted by start date.
 *
 * Returns:
 * Array: An array of cutoff objects, or an empty array if an error occurs.
 */
async function getCutoffs() {
  const { data, error } = await supabaseClient
    .from("cutoffs")
    .select("cutoff_start_date, cutoff_end_date")
    .order("cutoff_start_date", { ascending: true });

  if (error) {
    console.error("Error fetching cutoffs:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Retrieves and summarizes tardiness data for a specific department per cutoff.
 * Returns an array of cutoff date range and count pairs representing 'late' logs.
 *
 * Args:
 * dept_id: The ID of the department to filter tardiness data by.
 *
 * Returns:
 * Array: An array of [cutoffDateRange, count] pairs, or an empty array if no data is found.
 */
async function getTardinessData(dept_id) {
  const cutoffs = await getCutoffs();
  if (cutoffs.length === 0) return [];

  // Start building the query
  let query = supabaseClient
    .from("raw_time_logs")
    .select("time_in, employees!inner(department_id)")
    .eq("status", "late"); // Filter only 'late' statuses

  // **CRITICAL FIX:** Only apply department filter if dept_id is not 0
  if (dept_id != 0) {
    query = query.eq("employees.department_id", dept_id);
  }

  const { data: logs, error } = await query;

  if (error) {
    console.error("Error fetching tardiness data:", error.message);
    return [];
  }

  if (!logs || logs.length === 0) {
    console.log("No tardiness data found for department", dept_id);
    return [];
  }

  const cutoffMap = new Map();

  logs.forEach((log) => {
    const logDate = new Date(log.time_in);

    // Find the corresponding cutoff for the log's date
    const cutoff = cutoffs.find((c) => {
      const start = new Date(c.cutoff_start_date);
      const end = new Date(c.cutoff_end_date);
      return logDate >= start && logDate <= end;
    });

    if (cutoff) {
      const cutoffKey = `${cutoff.cutoff_start_date} to ${cutoff.cutoff_end_date}`;
      cutoffMap.set(cutoffKey, (cutoffMap.get(cutoffKey) || 0) + 1);
    }
  });

  // Sort by cutoff start date
  return Array.from(cutoffMap.entries()).sort((a, b) => {
    const startDateA = new Date(a[0].split(" to ")[0]);
    const startDateB = new Date(b[0].split(" to ")[0]);
    return startDateA - startDateB;
  });
}

/**
 * Retrieves and summarizes absence records for a specific department per cutoff (or all if dept_id = 0).
 * Returns an array of cutoff date range and count pairs representing 'absent' logs.
 *
 * Args:
 * dept_id: The ID of the department to filter absence data by (0 for all).
 *
 * Returns:
 * Array: An array of [cutoffDateRange, count] pairs, or an empty array if no data is found.
 */
async function getAbsencesData(dept_id) {
  const cutoffs = await getCutoffs();
  if (cutoffs.length === 0) return [];

  // Start building the query
  let query = supabaseClient
    .from("raw_time_logs")
    .select("time_in, employees!inner(department_id)")
    .eq("status", "absent"); // Filter only 'absent' statuses

  // **FIX:** Only apply the department filter if dept_id is not 0 (All Departments)
  if (dept_id != 0) {
    query = query.eq("employees.department_id", dept_id);
  }

  // Execute the query
  const { data: logs, error } = await query;

  if (error) {
    console.error("Error fetching absences data:", error.message);
    return [];
  }

  if (!logs || logs.length === 0) {
    console.log("No absence records found for department", dept_id);
    return [];
  }

  const cutoffMap = new Map();

  logs.forEach((log) => {
    const logDate = new Date(log.time_in);

    // Find the corresponding cutoff for the log's date
    const cutoff = cutoffs.find((c) => {
      const start = new Date(c.cutoff_start_date);
      const end = new Date(c.cutoff_end_date);
      return logDate >= start && logDate <= end;
    });

    if (cutoff) {
      const cutoffKey = `${cutoff.cutoff_start_date} to ${cutoff.cutoff_end_date}`;
      cutoffMap.set(cutoffKey, (cutoffMap.get(cutoffKey) || 0) + 1);
    }
  });

  // Sort by cutoff start date
  return Array.from(cutoffMap.entries()).sort((a, b) => {
    const startDateA = new Date(a[0].split(" to ")[0]);
    const startDateB = new Date(b[0].split(" to ")[0]);
    return startDateA - startDateB;
  });
}

/**
 * Retrieves and summarizes leave records for a specific department per cutoff (or all if dept_id = 0).
 * Returns an array of cutoff date range and count pairs representing 'leave' logs.
 *
 * Args:
 * dept_id: The ID of the department to filter leave data by (0 for all).
 *
 * Returns:
 * Array: An array of [cutoffDateRange, count] pairs, or an empty array if no data is found.
 */
async function getLeaveData(dept_id) {
  const cutoffs = await getCutoffs();
  if (cutoffs.length === 0) return [];

  // Start building the query
  let query = supabaseClient
    .from("raw_time_logs")
    .select("time_in, employees!inner(department_id)")
    .in("status", ["leave with pay", "leave without pay"]); // Filter both leave statuses

  // **FIX:** Only apply the department filter if dept_id is not 0 (All Departments)
  if (dept_id != 0) {
    query = query.eq("employees.department_id", dept_id);
  }

  // Execute the query
  const { data: logs, error } = await query;

  if (error) {
    console.error("Error fetching leave data:", error.message);
    return [];
  }

  if (!logs || logs.length === 0) {
    console.log("No leave records found for department", dept_id);
    return [];
  }

  const cutoffMap = new Map();

  logs.forEach((log) => {
    const logDate = new Date(log.time_in);

    // Find the corresponding cutoff for the log's date
    const cutoff = cutoffs.find((c) => {
      const start = new Date(c.cutoff_start_date);
      const end = new Date(c.cutoff_end_date);
      return logDate >= start && logDate <= end;
    });

    if (cutoff) {
      const cutoffKey = `${cutoff.cutoff_start_date} to ${cutoff.cutoff_end_date}`;
      cutoffMap.set(cutoffKey, (cutoffMap.get(cutoffKey) || 0) + 1);
    }
  });

  // Sort by cutoff start date
  return Array.from(cutoffMap.entries()).sort((a, b) => {
    const startDateA = new Date(a[0].split(" to ")[0]);
    const startDateB = new Date(b[0].split(" to ")[0]);
    return startDateA - startDateB;
  });
}

/**
 * Retrieves and counts promotion records for a specific department in the current month.
 * Returns the count of promotions that occurred this month.
 *
 * Args:
 *   dept_id: The ID of the department to filter promotion data by.
 *
 * Returns:
 *   Number: The count of promotions in the current month, or 0 if no data is found.
 */

async function getPromotionsData(dept_id) {
  // Get the first and last day of the current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  );

  // Start building the query
  let query = supabaseClient
    .from("employee_position_logs")
    .select(
      "emp_id, time_changed, previous_pos_rank, new_pos_rank, employees!inner(department_id)"
    )
    .gte("time_changed", firstDayOfMonth.toISOString())
    .lte("time_changed", lastDayOfMonth.toISOString());

  // **CRITICAL FIX:** Only apply department filter if dept_id is not 0
  if (dept_id != 0) {
    query = query.eq("employees.department_id", dept_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching promotions data:", error.message);
    return 0;
  }

  // Filter for actual promotions (previous_pos_rank < new_pos_rank) in JavaScript
  const promotions = data
    ? data.filter((record) => record.previous_pos_rank < record.new_pos_rank)
    : [];

  const promotionCount = promotions.length;

  console.log(
    `Promotions this month for department ${dept_id}:`,
    promotionCount
  );
  return promotionCount;
}

// Code for updating the chart.
async function updateChart(dept_id) {
  try {
    // Fetch all data concurrently
    const [absencesData, tardinessData, leaveData] = await Promise.all([
      getAbsencesData(dept_id),
      getTardinessData(dept_id),
      getLeaveData(dept_id),
    ]);

    // Combine all unique cutoff date ranges from all datasets
    const allCutoffs = new Set([
      ...absencesData.map((item) => item[0]),
      ...tardinessData.map((item) => item[0]),
      ...leaveData.map((item) => item[0]),
    ]);

    // Sort cutoffs chronologically based on the start date in the key string
    const sortedCutoffs = Array.from(allCutoffs).sort((a, b) => {
      const startDateA = new Date(a.split(" to ")[0]);
      const startDateB = new Date(b.split(" to ")[0]);
      return startDateA - startDateB;
    });

    // Create data maps for easy lookup
    const absencesMap = new Map(absencesData);
    const tardinessMap = new Map(tardinessData);
    const leaveMap = new Map(leaveData);

    // Build aligned datasets
    const absencesValues = sortedCutoffs.map(
      (cutoff) => absencesMap.get(cutoff) || 0
    );
    const tardinessValues = sortedCutoffs.map(
      (cutoff) => tardinessMap.get(cutoff) || 0
    );
    const leaveValues = sortedCutoffs.map(
      (cutoff) => leaveMap.get(cutoff) || 0
    );

    // Get or create the chart
    const ctx = document.getElementById("myChart");

    // Destroy existing chart if it exists
    if (window.myChartInstance) {
      window.myChartInstance.destroy();
    }

    // Create new chart
    window.myChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: sortedCutoffs, // Use cutoff date ranges as labels
        datasets: [
          {
            label: "# of Absences",
            data: absencesValues,
            borderWidth: 1,
            tension: 0.3,
            borderColor: "rgba(207, 51, 90, 1)",
            backgroundColor: "rgba(235, 97, 132, 1)",
          },
          {
            label: "# of Tardiness",
            data: tardinessValues,
            borderWidth: 1,
            tension: 0.3,
            borderColor: "rgba(212, 193, 16, 1)",
            backgroundColor: "rgba(238, 227, 124, 1)",
          },
          {
            label: "# of Leave",
            data: leaveValues,
            borderWidth: 1,
            tension: 0.3,
            borderColor: "rgba(16, 84, 212, 1)",
            backgroundColor: "rgba(78, 136, 243, 1)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true,
          },
          x: {
            // Added x-axis configuration for better display of date range labels
            ticks: {
              display: false,
            },
            grid: {
              display: false,
            },
          },
        },
        layout: {
          padding: {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error updating chart:", error);
  }
}

/**
 * Fetches government deadlines and displays them in the list.
 * Populates the deadlines list with data from the government_deadlines table.
 * @param {boolean} editMode - Whether to display in edit mode with date inputs
 */

async function getGovDeadlines(editMode = false) {
  // Fetch all government deadlines
  const { data, error } = await supabaseClient
    .from("government_deadlines")
    .select("*")
    .order("deadline", { ascending: true }); // Sort by date

  if (error) {
    console.error("Error fetching government deadlines:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No government deadlines found");
    return;
  }

  // Get the ul element
  const deadlinesList = document.getElementById("deadlines-list-values");

  // Clear existing content
  deadlinesList.innerHTML = "";

  // Create and append list items for each deadline
  data.forEach((deadline) => {
    const li = document.createElement("li");
    li.id = "deadline-list-item";
    li.className = "list-row";

    // Format the date
    const deadlineDate = new Date(deadline.deadline);
    const formattedDate = deadlineDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Format date for input (YYYY-MM-DD)
    const inputDate = deadline.deadline;

    if (editMode) {
      li.innerHTML = `
        <div class="justify-start" id="deadline-type">
          <h3>${deadline.gov_dept}</h3>
        </div>
        <div id="deadline-date-value" class="text-end">
          <input type="date" value="${inputDate}" 
                 class="input input-bordered input-sm" 
                 data-deadline-id="${deadline.id}" />
        </div>
      `;
    } else {
      li.innerHTML = `
        <div class="justify-start" id="deadline-type">
          <h3>${deadline.gov_dept}</h3>
        </div>
        <div id="deadline-date-value" class="text-end">
          <h4>${formattedDate}</h4>
        </div>
      `;
    }

    deadlinesList.appendChild(li);
  });

  console.log(`Displayed ${data.length} government deadlines`);
}

/**
 * Saves all updated government deadlines
 */
async function saveGovDeadlines() {
  const dateInputs = document.querySelectorAll(
    '#deadlines-list-values input[type="date"]'
  );

  const updates = [];

  dateInputs.forEach((input) => {
    const deadlineId = input.dataset.deadlineId;
    const newDate = input.value;

    updates.push(
      supabaseClient
        .from("government_deadlines")
        .update({ deadline: newDate })
        .eq("id", deadlineId)
    );
  });

  try {
    await Promise.all(updates);
    console.log("All deadlines updated successfully");

    // Refresh the list in view mode
    await getGovDeadlines(false);

    // Update button states
    toggleEditMode(false);
  } catch (error) {
    console.error("Error updating deadlines:", error.message);
  }
}

/**
 * Toggle edit mode for government deadlines
 */
let isEditMode = false;

function toggleEditMode(editMode) {
  isEditMode = editMode;
  const editButton = document.getElementById("edit-gov-deadlines");

  if (isEditMode) {
    editButton.textContent = "Save";
    editButton.classList.add("btn-primary");
  } else {
    editButton.textContent = "Edit";
    editButton.classList.remove("btn-primary");
  }
}

// Event listener for edit button
document
  .getElementById("edit-gov-deadlines")
  .addEventListener("click", async () => {
    if (isEditMode) {
      // Save mode
      await saveGovDeadlines();
    } else {
      // Edit mode
      toggleEditMode(true);
      await getGovDeadlines(true);
    }
  });

// Code for Dynamically updating Dashboard info based from
// Listener for Department Select changes
departmentSelect.addEventListener("change", async (event) => {
  const dept_id = event.target.value;
  console.log("Selected Option's ID:", dept_id);

  //Updates the Total Employee Stats on the dashboard
  const employeeCount = await getCountDeptEmployees(dept_id);
  if (employeeCount !== null) {
    document.getElementById("total-employees-val").textContent = employeeCount;
  }

  //Updates the On Leave Stats on the dashboard
  const inactiveCount = await getOnLeaveCount(dept_id);
  document.getElementById("on-leave-val").textContent = inactiveCount;

  const promotionsCount = await getPromotionsData(dept_id);
  document.getElementById("promotions-val").textContent = promotionsCount;

  //Updates the chart.
  updateChart(dept_id);
});

//Run an Intial default/shown information.
async function defaultShown() {
  const allDeptId = 0; // Use the 'All Departments' ID

  const employeeCount = await getCountDeptEmployees(allDeptId);
  if (employeeCount !== null) {
    document.getElementById("total-employees-val").textContent = employeeCount;
  }
  const inactiveCount = await getOnLeaveCount(allDeptId);
  if (inactiveCount !== null) {
    document.getElementById("on-leave-val").textContent = inactiveCount;
  }
  const promotionsCount = await getPromotionsData(allDeptId);
  document.getElementById("promotions-val").textContent = promotionsCount;

  // Add the default shown for the chart here.
  updateChart(allDeptId);
  getGovDeadlines(false);
}
defaultShown();
