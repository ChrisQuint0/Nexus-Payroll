import { supabaseClient } from "../supabase/supabaseClient.js";

async function getAbsencesData() {
  const { data, error } = await supabaseClient
    .from("attendance_summary")
    .select(
      "emp_id, days_absent, cutoff_id, cutoffs!inner(cutoff_start_date, cutoff_end_date)"
    )
    .gt("days_absent", 0);
  if (error) {
    console.error("Error fetching absences data:", error.message);
    return 0;
  }
  if (!data || data.length === 0) {
    console.log("No absence records found");
    return 0;
  }
  // Get current month string
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${now.toLocaleString("default", {
    month: "long",
  })}`;
  let currentMonthAbsences = 0;
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
    if (startMonth === endMonth && startMonth === currentMonth) {
      // Cutoff period is within the current month
      currentMonthAbsences += record.days_absent;
    } else if (startMonth !== endMonth) {
      // Cutoff period spans two months - check if current month is involved
      const totalDays =
        Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      if (startMonth === currentMonth) {
        // Current month is the start month
        const lastDayOfStartMonth = new Date(
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          0
        );
        const daysInStartMonth =
          Math.ceil((lastDayOfStartMonth - startDate) / (1000 * 60 * 60 * 24)) +
          1;
        const absencesInStartMonth =
          (record.days_absent * daysInStartMonth) / totalDays;
        currentMonthAbsences += absencesInStartMonth;
      } else if (endMonth === currentMonth) {
        // Current month is the end month
        const lastDayOfStartMonth = new Date(
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          0
        );
        const daysInStartMonth =
          Math.ceil((lastDayOfStartMonth - startDate) / (1000 * 60 * 60 * 24)) +
          1;
        const daysInEndMonth = totalDays - daysInStartMonth;
        const absencesInEndMonth =
          (record.days_absent * daysInEndMonth) / totalDays;
        currentMonthAbsences += absencesInEndMonth;
      }
    }
  });
  return Math.round(currentMonthAbsences);
}

async function getTardinessData() {
  const { data, error } = await supabaseClient
    .from("raw_time_logs")
    .select("emp_id, time_in")
    .eq("status", "late");

  if (error) {
    console.error("Error fetching tardiness data:", error.message);
    return 0;
  }

  if (!data || data.length === 0) {
    console.log("No tardiness data found");
    return 0;
  }

  // Get current month string
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${now.toLocaleString("default", {
    month: "long",
  })}`;

  let currentMonthTardiness = 0;

  data.forEach((log) => {
    const date = new Date(log.time_in);
    const logMonth = `${date.getFullYear()}-${date.toLocaleString("default", {
      month: "long",
    })}`;

    if (logMonth === currentMonth) {
      currentMonthTardiness++;
    }
  });

  return currentMonthTardiness;
}

window.onload = async function () {
  const absencesThisMonth = document.getElementById("absences-value");
  const tardinessThisMonth = document.getElementById("tardiness-value");
  const absenceCount = await getAbsencesData();
  const tardinessCount = await getTardinessData();
  absencesThisMonth.textContent = absenceCount;
  tardinessThisMonth.textContent = tardinessCount;
};
