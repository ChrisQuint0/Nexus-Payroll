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
 * Retrieves the count of active employees for a specific department.
 * Returns the number of employees with active status in the given department.
 *
 * Args:
 *   dept_id: The ID of the department to filter employees by.
 *
 * Returns:
 *   number|null: The count of active employees, or null if an error occurs.
 */
async function getCountDeptEmployees(dept_id) {
  const { count, error } = await supabaseClient
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("status_id", 1)
    .eq("department_id", dept_id);

  if (error) {
    console.error(
      "Error getting the count of employees in the department:",
      error.message
    );
    return null;
  }
  return count;
}

/**
 * Retrieves the count of employees currently on leave for a specific department.
 * Returns the number of employees whose leave period includes today and who belong to the specified department.
 *
 * Args:
 *   dept_id: The ID of the department to filter employees on leave by.
 *
 * Returns:
 *   number|null: The count of employees currently on leave, or null if an error occurs.
 */
async function getOnLeaveCount(dept_id) {
  const today = new Date().toISOString(); // current timestamp

  const { count, error } = await supabaseClient
    .from("leave_management")
    .select("emp_id, employees!inner(department_id)", {
      count: "exact",
      head: true,
    })
    .lte("leave_start", today) // leave_start <= today
    .gte("leave_end", today) // leave_end >= today
    .eq("employees.department_id", dept_id); // department match via join

  if (error) {
    console.error("Error getting on-leave employee count:", error.message);
    return null;
  }

  return count;
}

//Punctuality Trend Analysis - Data gathering
//Map the Tardiness according to the chosen department.
/**
 * Retrieves and summarizes tardiness data for a specific department.
 * Returns an array of month-year and count pairs representing late time-in logs for the department.
 *
 * Args:
 *   dept_id: The ID of the department to filter tardiness data by.
 *
 * Returns:
 *   Array: An array of [monthYear, count] pairs sorted chronologically, or an empty array if no data is found.
 */
async function getTardinessData(dept_id) {
  const { data, error } = await supabaseClient
    .from("raw_time_logs")
    .select("emp_id, time_in, employees!inner(department_id)")
    .eq("status", "late")
    .eq("employees.department_id", dept_id);

  if (error) {
    console.error("Error fetching tardiness data:", error.message);
    return [];
  }

  if (!data || data.length === 0) {
    console.log("No tardiness data found for department", dept_id);
    return [];
  }

  const tardinessMap = {};

  data.forEach((log) => {
    const date = new Date(log.time_in);
    const key = `${date.getFullYear()}-${date.toLocaleString("default", {
      month: "long",
    })}`;
    tardinessMap[key] = (tardinessMap[key] || 0) + 1;
  });

  // Step 3: Format result as array of [monthYear, count], sorted chronologically
  return Object.entries(tardinessMap).sort(
    (a, b) => new Date(a[0]) - new Date(b[0])
  );
}

/**
 * Retrieves and summarizes absence records for a specific department.
 * Returns an array of month-year and count pairs representing absence trends for the department.
 *
 * Args:
 *   dept_id: The ID of the department to filter absence data by.
 *
 * Returns:
 *   Array: An array of [monthYear, count] pairs sorted chronologically, or an empty array if no data is found.
 */

async function getAbsencesData(dept_id) {
  const { data, error } = await supabaseClient
    .from("attendance_summary")
    .select(
      "emp_id, days_absent, cutoff_id, cutoffs!inner(cutoff_start_date, cutoff_end_date), employees!inner(department_id)"
    )
    .gt("days_absent", 0)
    .eq("employees.department_id", dept_id);

  if (error) {
    console.error("Error fetching absences data:", error.message);
    return [];
  }

  if (!data || data.length === 0) {
    console.log("No absence records found for department", dept_id);
    return [];
  }

  const absencesMap = {};

  data.forEach((record) => {
    const startDate = new Date(record.cutoffs.cutoff_start_date);
    const endDate = new Date(record.cutoffs.cutoff_end_date);

    // Determine which month(s) this cutoff period belongs to
    const startMonth = `${startDate.getFullYear()}-${startDate.toLocaleString(
      "default",
      { month: "long" }
    )}`;
    const endMonth = `${endDate.getFullYear()}-${endDate.toLocaleString(
      "default",
      { month: "long" }
    )}`;

    if (startMonth === endMonth) {
      // Cutoff period is within a single month
      absencesMap[startMonth] =
        (absencesMap[startMonth] || 0) + record.days_absent;
    } else {
      // Cutoff period spans two months - split proportionally
      const totalDays =
        Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      // Days in the start month
      const lastDayOfStartMonth = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        0
      );
      const daysInStartMonth =
        Math.ceil((lastDayOfStartMonth - startDate) / (1000 * 60 * 60 * 24)) +
        1;

      // Days in the end month
      const daysInEndMonth = totalDays - daysInStartMonth;

      // Allocate absences proportionally
      const absencesInStartMonth =
        (record.days_absent * daysInStartMonth) / totalDays;
      const absencesInEndMonth =
        (record.days_absent * daysInEndMonth) / totalDays;

      absencesMap[startMonth] =
        (absencesMap[startMonth] || 0) + absencesInStartMonth;
      absencesMap[endMonth] = (absencesMap[endMonth] || 0) + absencesInEndMonth;
    }
  });

  return Object.entries(absencesMap)
    .map(([key, count]) => [key, Math.round(count)])
    .sort((a, b) => {
      const aDate = new Date(a[0].split("-")[1] + " 1, " + a[0].split("-")[0]);
      const bDate = new Date(b[0].split("-")[1] + " 1, " + b[0].split("-")[0]);
      return aDate - bDate;
    });
}

/**
 * Retrieves and summarizes leave records for a specific department.
 * Returns an array of month-year and count pairs representing leave filings for the department.
 *
 * Args:
 *   dept_id: The ID of the department to filter leave data by.
 *
 * Returns:
 *   Array: An array of [monthYear, count] pairs sorted chronologically, or an empty array if no data is found.
 */

async function getLeaveData(dept_id) {
  const { data, error } = await supabaseClient
    .from("leave_management")
    .select("emp_id, leave_start, leave_end, employees!inner(department_id)")
    .eq("employees.department_id", dept_id);

  if (error) {
    console.error("Error fetching leave data:", error.message);
    return [];
  }

  if (!data || data.length === 0) {
    console.log("No leave records found for department", dept_id);
    return [];
  }

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const leavesMap = {};

  data.forEach((record) => {
    const startDate = new Date(record.leave_start);
    startDate.setHours(0, 0, 0, 0);

    if (startDate <= currentDate) {
      const key = `${startDate.getFullYear()}-${startDate.toLocaleString(
        "default",
        { month: "long" }
      )}`;

      // Count each leave filing
      leavesMap[key] = (leavesMap[key] || 0) + 1;
    }
  });

  return Object.entries(leavesMap)
    .map(([key, count]) => [key, count])
    .sort((a, b) => {
      const aDate = new Date(a[0].split("-")[1] + " 1, " + a[0].split("-")[0]);
      const bDate = new Date(b[0].split("-")[1] + " 1, " + b[0].split("-")[0]);
      return aDate - bDate;
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

  // Fetch all position change records for employees in the department for this month
  const { data, error } = await supabaseClient
    .from("employee_position_logs")
    .select(
      "emp_id, time_changed, previous_pos_rank, new_pos_rank, employees!inner(department_id)"
    )
    .eq("employees.department_id", dept_id)
    .gte("time_changed", firstDayOfMonth.toISOString())
    .lte("time_changed", lastDayOfMonth.toISOString());

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
      getTardinessData(dept_id), // Assuming you have this function
      getLeaveData(dept_id),
    ]);

    // Combine all unique months from all datasets
    const allMonths = new Set([
      ...absencesData.map((item) => item[0]),
      ...tardinessData.map((item) => item[0]),
      ...leaveData.map((item) => item[0]),
    ]);

    // Sort months chronologically
    const sortedMonths = Array.from(allMonths).sort((a, b) => {
      const aDate = new Date(a.split("-")[1] + " 1, " + a.split("-")[0]);
      const bDate = new Date(b.split("-")[1] + " 1, " + b.split("-")[0]);
      return aDate - bDate;
    });

    // Create data maps for easy lookup
    const absencesMap = new Map(absencesData);
    const tardinessMap = new Map(tardinessData);
    const leaveMap = new Map(leaveData);

    // Build aligned datasets
    const absencesValues = sortedMonths.map(
      (month) => absencesMap.get(month) || 0
    );
    const tardinessValues = sortedMonths.map(
      (month) => tardinessMap.get(month) || 0
    );
    const leaveValues = sortedMonths.map((month) => leaveMap.get(month) || 0);

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
        labels: sortedMonths,
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
        scales: {
          y: {
            beginAtZero: true,
          },
        },
        layout: {
          padding: 20,
        },
      },
    });

    console.log("Chart updated successfully");
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
  const auditLogs = [];

  // Get current user for audit logging
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  dateInputs.forEach((input) => {
    const deadlineId = input.dataset.deadlineId;
    const deadlineName = input.dataset.deadlineName || "Government Deadline"; // Add data-deadline-name to your inputs if available
    const newDate = input.value;

    updates.push(
      supabaseClient
        .from("government_deadlines")
        .update({ deadline: newDate })
        .eq("id", deadlineId)
    );

    // Prepare audit log entry
    auditLogs.push({
      user_id: user?.id,
      action: "edit",
      description: `Updated government deadline "${deadlineName}" to ${newDate}`,
      module_affected: "Dashboard - Government Deadlines",
      record_id: parseInt(deadlineId),
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  });

  try {
    // Update all deadlines
    await Promise.all(updates);

    // Log all changes to audit trail
    if (auditLogs.length > 0) {
      await supabaseClient.from("audit_trail").insert(auditLogs);
    }

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
  const employeeCount = await getCountDeptEmployees(1);
  if (employeeCount !== null) {
    document.getElementById("total-employees-val").textContent = employeeCount;
  }
  const inactiveCount = await getOnLeaveCount(1);
  if (inactiveCount !== null) {
    document.getElementById("on-leave-val").textContent = inactiveCount;
  }
  const promotionsCount = await getPromotionsData(1);
  document.getElementById("promotions-val").textContent = promotionsCount;
  //Add the default shown for the chart here.
  updateChart(1);
  getGovDeadlines(false);
}
defaultShown();
