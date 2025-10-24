// dtr-generator.js
// This module handles DTR generation with Supabase integration

import { supabaseClient } from "../supabase/supabaseClient.js";


 // Generate DTR for a specific employee and cutoff period
 
export async function generateDTR(employeeId, cutoffPeriod) {
  try {
    console.log(`Generating DTR for Employee ${employeeId}, Period: ${cutoffPeriod}`);

    // Parse cutoff period (e.g., "Oct 1 - 15, 2025")
    const { startDay, endDay, month, year } = parseCutoffPeriod(cutoffPeriod);

    // Get employee data
    const employee = await getEmployeeInfo(employeeId);

    // Fetch time logs for this employee and period
    const employeeLogs = await getEmployeeTimeLogs(employeeId, month, year);

    // Build DTR data structure
    const dtrData = buildDTRData(employeeLogs, startDay, endDay, month, year);

    // Calculate totals
    const totals = calculateDTRTotals(dtrData);

    console.log("✅ DTR generated successfully");

    return {
      employee,
      cutoffPeriod,
      dtrData,
      totals,
      month: getMonthName(month),
      year,
    };
  } catch (error) {
    console.error("❌ Error generating DTR:", error);
    throw error;
  }
}


 //Get employee time logs from Supabase for a specific month/year
 
async function getEmployeeTimeLogs(employeeId, month, year) {
  try {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    console.log(`Fetching logs for ${employeeId} from ${startDateStr} to ${endDateStr}`);

    const { data, error } = await supabaseClient
      .from("employee_time_logs")
      .select("*")
      .eq("employee_id", employeeId)
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: true });

    if (error) throw error;

    console.log(` Fetched ${data.length} time logs`);

    // Transform data
    return data.map((log) => ({
      Date: log.date,
      "Time In": log.time_in,
      "Time Out": log.time_out,
      Undertime: log.undertime ?? 0,
      Status: log.status,
    }));
  } catch (error) {
    console.error("Error fetching employee time logs:", error);
    return [];
  }
}


 // Parse cutoff period string into components
 
function parseCutoffPeriod(cutoffPeriod) {
  const parts = cutoffPeriod.match(/(\w+)\s+(\d+)\s*-\s*(\d+),\s*(\d+)/);
  if (!parts) throw new Error("Invalid cutoff period format");

  const monthMap = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };

  return {
  startDay: parseInt(parts[2]),
  endDay: parseInt(parts[3]),
  month: monthMap[parts[1]],
  year: parseInt(parts[4]),
};
}


 // Get employee information

async function getEmployeeInfo(employeeId) {
  try {
    const { data, error } = await supabaseClient
      .from("employee_time_logs")
      .select("employee_id, first_name, middle_name, last_name")
      .eq("employee_id", employeeId)
      .limit(1)
      .single();

    if (error) throw error;

    const fullName = [data.first_name, data.middle_name, data.last_name]
      .filter(Boolean)
      .join(" ");

    return {
      id: employeeId,
      name: fullName || "Unknown Employee",
      department: "N/A",
    };
  } catch (error) {
    console.error("Error fetching employee info:", error);
    return { id: employeeId, name: "Unknown Employee", department: "N/A" };
  }
}


 // Build DTR data structure
 
function buildDTRData(employeeLogs, startDay, endDay, month, year) {
  const dtrData = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = startDay; day <= endDay; day++) {

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayLogs = employeeLogs.filter((log) => log.Date === dateStr);

    if (dayLogs.length > 0) {
      const timeIns = dayLogs.map((l) => l["Time In"]).filter(Boolean);
      const timeOuts = dayLogs.map((l) => l["Time Out"]).filter(Boolean);

      const arrival = timeIns.length > 0 ? formatTime(timeIns[0]) : "";
      const departure = timeOuts.length > 0 ? formatTime(timeOuts[timeOuts.length - 1]) : "";

      const undertimeMinutesTotal = dayLogs.reduce(
        (sum, log) => sum + (parseFloat(log.Undertime) || 0),
        0
      );

      const undertimeHours = Math.floor(undertimeMinutesTotal / 60);
      const undertimeMinutes = undertimeMinutesTotal % 60;

      dtrData.push({
        day,
        arrival,
        departure,
        undertimeHours: undertimeHours > 0 ? undertimeHours : "",
        undertimeMinutes: undertimeMinutes > 0 ? undertimeMinutes : "",
      });
    } else {
      dtrData.push({
        day,
        arrival: "",
        departure: "",
        undertimeHours: "",
        undertimeMinutes: "",
      });
    }
  }

  return dtrData;
}


 // Accurate time formatting (no timezone shift)
 
function formatTime(timeStr) {
  if (!timeStr) return "";

  try {
    // Handle already formatted values 
    if (timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) {
      return timeStr.toUpperCase().trim().replace(/\s+/g, " ");
    }

    // Keep only time part (remove date/timezone fragments)
    const cleanTime = timeStr.trim().split("T").pop().split("+")[0].split("-")[0];
    const [hoursStr, minutesStr] = cleanTime.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;

    return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
  } catch (error) {
    console.error("Error formatting time:", timeStr, error);
    return timeStr;
  }
}


 // Calculate DTR totals
 
function calculateDTRTotals(dtrData) {
  let totalUndertimeMinutes = 0;

  dtrData.forEach((entry) => {
    if (entry.undertimeHours || entry.undertimeMinutes) {
      const hours = parseInt(entry.undertimeHours) || 0;
      const minutes = parseInt(entry.undertimeMinutes) || 0;
      totalUndertimeMinutes += hours * 60 + minutes;
    }
  });

  const totalHours = Math.floor(totalUndertimeMinutes / 60);
  const totalMinutes = totalUndertimeMinutes % 60;

  return {
    undertimeHours: totalHours,
    undertimeMinutes: totalMinutes,
    totalUndertime: `${totalHours}:${String(totalMinutes).padStart(2, "0")}`,
  };
}


 // Get month name from index
 
function getMonthName(monthIndex) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return months[monthIndex];
}


 // Display DTR in printable window
 
export function displayDTR(dtrInfo) {
  const dtrHTML = generateDTRHTML(dtrInfo);
  const printWindow = window.open("", "_blank", "width=1200,height=800");
  printWindow.document.write(dtrHTML);
  printWindow.document.close();

  printWindow.onload = () => printWindow.print();
}


 // Generate printable DTR HTML
 
function generateDTRHTML(dtrInfo) {
  const { employee, cutoffPeriod, dtrData, totals, month, year } = dtrInfo;
  const leftColumn = dtrData;
  const rightColumn = dtrData;

  return `
    <!DOCTYPE html>
    <html lang="en" data-theme="light">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Time Record - ${employee.name}</title>
      <style>
        @page { size: A4 portrait; margin: 0.5in; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
        .container { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .header-title { text-align:center; font-size:12px; font-weight:bold; }
        .field-label { font-size:8px; }
        .underline-field { border-bottom: 1px solid #000; display:inline-block; min-width:140px; padding: 0 4px; }
        .dtr-table { width:100%; border-collapse:collapse; font-size:8px; margin-top:5px; }
        .dtr-table th, .dtr-table td { border:1px solid #000; padding:2px 3px; text-align:center; }
        .dtr-table th { font-weight:bold; background:#eee; }
        .signature-line { border-bottom:1px solid #000; width:70%; height:10px; margin:20px auto 3px auto; }
        .signature-text { text-align:center; font-size:8px; }
        @media print { .no-print { display:none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align:right;margin-bottom:10px;">
        <button onclick="window.print()">🖨️ Print</button>
        <button onclick="window.close()">✖ Close</button>
      </div>

      <div class="container">
        ${[leftColumn, rightColumn].map((column, idx) => `
          <div>
            <div class="header-title">DAILY TIME RECORD</div>
            <br>

            <div class="field-label" style="text-align:center;">
              <span class="underline-field">${employee.name}</span><br>
              (Name)
            </div>

            <div class="field-label" style="margin-top:5px;">
              For the month of <span class="underline-field">${month} ${year}</span>
            </div>
            <div class="field-label" style="margin-top:3px;">
              Official hours for arrival and departure <span class="underline-field"></span>
            </div>

            <table class="dtr-table">
              <thead>
                <tr>
                  <th rowspan="2">Day</th>
                  <th colspan="2">AM</th>
                  <th colspan="2">PM</th>
                  <th colspan="2">Undertime</th>
                </tr>
                <tr>
                  <th>Arrival</th><th>Departure</th>
                  <th>Arrival</th><th>Departure</th>
                  <th>Hours</th><th>Minutes</th>
                </tr>
              </thead>
              <tbody>
                ${column.map(entry => `
                  <tr>
                    <td>${entry.day}</td>
                    <td>${entry.arrival || ""}</td>
                    <td>${entry.departure || ""}</td>
                    <td></td>
                    <td></td>
                    <td>${entry.undertimeHours || ""}</td>
                    <td>${entry.undertimeMinutes || ""}</td>
                  </tr>`).join("")}

                <tr style="font-weight:bold;background:#eee;">
                  <td colspan="5" style="text-align:right;">TOTAL</td>
                  <td colspan="2">${idx === 1 ? totals.totalUndertime : ""}</td>
                </tr>
              </tbody>
            </table>

            <div class="signature-line"></div>
            <div class="signature-text">Verified as to the prescribed office hours.</div>

            <div class="signature-line"></div>
            <div class="signature-text">In Charge</div>
          </div>
        `).join("")}
      </div>
    </body>
    </html>
  `;
}



  // Get available cutoff periods
 
export async function getAvailableCutoffPeriods(employeeId) {
  try {
    const { data, error } = await supabaseClient
      .from("employee_time_logs")
      .select("date")
      .eq("employee_id", employeeId)
      .order("date", { ascending: false });

    if (error) throw error;

    const uniqueMonths = new Set();
    data.forEach((log) => {
      if (log.date) {
        const date = new Date(log.date);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        uniqueMonths.add(monthYear);
      }
    });

    const cutoffPeriods = [];
    uniqueMonths.forEach((monthYear) => {
      const [year, month] = monthYear.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = monthNames[parseInt(month) - 1];
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      cutoffPeriods.push(`${monthName} 1 - 15, ${year}`);
      cutoffPeriods.push(`${monthName} 16 - ${lastDay}, ${year}`);
    });

    return cutoffPeriods;
  } catch (error) {
    console.error("Error fetching cutoff periods:", error);
    return [];
  }
}


 // Generate DTR for multiple employees
 
export async function generateBulkDTR(employeeIds, cutoffPeriod) {
  const results = [];
  for (const employeeId of employeeIds) {
    try {
      const dtrInfo = await generateDTR(employeeId, cutoffPeriod);
      results.push({ employeeId, success: true, data: dtrInfo });
    } catch (error) {
      console.error(`Failed to generate DTR for ${employeeId}:`, error);
      results.push({ employeeId, success: false, error: error.message });
    }
  }
  return results;
}
