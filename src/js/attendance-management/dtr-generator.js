// dtr-generator.js
// This module handles DTR generation and display

import { rawTimeLogsData } from "./attendance-data.js";

/**
 * Generate DTR for a specific employee and cutoff period
 */
export function generateDTR(employeeId, cutoffPeriod) {
  // Parse cutoff period (e.g., "Oct 1 - 15, 2025")
  const { startDay, endDay, month, year } = parseCutoffPeriod(cutoffPeriod);

  // Get employee data
  const employee = getEmployeeInfo(employeeId);

  // Filter time logs for this employee and period
  const employeeLogs = rawTimeLogsData.filter((log) => {
    if (log["Employee ID"] !== employeeId) return false;

    const logDate = new Date(log.Date);
    const logMonth = logDate.getMonth();
    const logYear = logDate.getFullYear();

    // Filter by month and year only (ignore cutoff period days)
    return logMonth === month && logYear === year;
  });

  // Build DTR data structure
  const dtrData = buildDTRData(employeeLogs, startDay, endDay, month, year);

  // Calculate totals
  const totals = calculateDTRTotals(dtrData);

  return {
    employee,
    cutoffPeriod,
    dtrData,
    totals,
    month: getMonthName(month),
    year,
  };
}

/**
 * Parse cutoff period string into components
 */
function parseCutoffPeriod(cutoffPeriod) {
  // Expected format: "Oct 1 - 15, 2025" or "Oct 16 - 31, 2025"
  const parts = cutoffPeriod.match(/(\w+)\s+(\d+)\s*-\s*(\d+),\s*(\d+)/);

  if (!parts) {
    throw new Error("Invalid cutoff period format");
  }

  const monthName = parts[1];
  const startDay = parseInt(parts[2]);
  const endDay = parseInt(parts[3]);
  const year = parseInt(parts[4]);

  const monthMap = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  const month = monthMap[monthName];

  // Always use full month (1-31) regardless of cutoff period selected
  return { startDay: 1, endDay: 31, month, year };
}

/**
 * Get employee information
 */
function getEmployeeInfo(employeeId) {
  const log = rawTimeLogsData.find((log) => log["Employee ID"] === employeeId);
  return {
    id: employeeId,
    name: log ? log.Name : "Unknown Employee",
    department: "N/A", // Could be added from employee master data
  };
}

/**
 * Build DTR data structure for the period
 */
function buildDTRData(employeeLogs, startDay, endDay, month, year) {
  const dtrData = [];

  // Get the actual number of days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    const dayLogs = employeeLogs.filter((log) => log.Date === dateStr);

    if (dayLogs.length > 0) {
      // If there are multiple logs for the same day, take the first time in and last time out
      const timeIns = dayLogs.map((l) => l["Time In"]).filter((t) => t);
      const timeOuts = dayLogs.map((l) => l["Time Out"]).filter((t) => t);

      const arrival = timeIns.length > 0 ? timeIns[0] : "";
      const departure =
        timeOuts.length > 0 ? timeOuts[timeOuts.length - 1] : "";

      // Calculate undertime (sum of all undertime for the day)
      const undertimeHours = dayLogs.reduce((sum, log) => {
        const undertime = parseFloat(log.Undertime) || 0;
        return sum + undertime;
      }, 0);

      const undertimeMinutes = Math.round(undertimeHours * 60);

      dtrData.push({
        day,
        arrival,
        departure,
        undertimeHours: undertimeHours > 0 ? Math.floor(undertimeHours) : "",
        undertimeMinutes: undertimeHours > 0 ? undertimeMinutes % 60 : "",
      });
    } else {
      // No log for this day
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

/**
 * Calculate DTR totals
 */
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

/**
 * Get month name from month index
 */
function getMonthName(monthIndex) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[monthIndex];
}

/**
 * Display DTR in a modal or new window
 */
export function displayDTR(dtrInfo) {
  // Create a printable DTR view
  const dtrHTML = generateDTRHTML(dtrInfo);

  // Open in new window for printing
  const printWindow = window.open("", "_blank", "width=1200,height=800");
  printWindow.document.write(dtrHTML);
  printWindow.document.close();

  // Auto-print after load
  printWindow.onload = function () {
    printWindow.print();
  };
}

/**
 * Generate HTML for DTR display matching the official format
 */
function generateDTRHTML(dtrInfo) {
  const { employee, cutoffPeriod, dtrData, totals, month, year } = dtrInfo;

  // Both columns show the same data (days 1-31)
  // This matches the official DTR format with duplicate sides
  const leftColumn = dtrData; // Days 1-31
  const rightColumn = dtrData; // Days 1-31 (duplicate)

  return `
    <!DOCTYPE html>
    <html lang="en" data-theme="light">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Time Record - ${employee.name}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 0.5in;
        }
        
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none;
          }
        }
        
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 15px;
          background-color: #fff;
        }
        
        .dtr-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8px;
        }
        
        .dtr-table th,
        .dtr-table td {
          border: 1px solid #000;
          padding: 2px 3px;
          text-align: center;
        }
        
        .dtr-table th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        
        .underline-field {
          border-bottom: 1px solid #000;
          display: inline-block;
          min-width: 200px;
          padding: 0 6px;
        }
        
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-primary {
          background: #4F46E5;
          color: white;
        }
        
        .btn-secondary {
          background: #6B7280;
          color: white;
        }
      </style>
    </head>
    <body>
      <!-- Print Button -->
      <div class="no-print" style="text-align: right; margin-bottom: 20px;">
        <button onclick="window.print()" class="btn btn-primary">
          Print DTR
        </button>
        <button onclick="window.close()" class="btn btn-secondary">
          Close
        </button>
      </div>

      <!-- DTR Content -->
      <div style="max-width: 100%; margin: 0 auto;">
        <!-- Two-column layout side by side -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <!-- Left DTR -->
          <div>
            <div style="text-align: center; margin-bottom: 10px;">
              <h2 style="font-weight: bold; font-size: 12px; margin: 0 0 8px 0;">DAILY TIME RECORD</h2>
            </div>
            
            <div style="margin-bottom: 10px;">
              <div style="text-align: center; margin-bottom: 3px;">
                <span class="underline-field">${employee.name}</span>
              </div>
              <div style="text-align: center; font-size: 8px; margin-bottom: 8px;">(Name)</div>
              
              <div style="margin-top: 8px; font-size: 8px; text-align: left;">
                <span>For the month of</span>
                <span class="underline-field" style="min-width: 150px;">${month} ${year}</span>
              </div>
              
              <div style="margin-top: 8px; font-size: 8px; text-align: left;">
                <span>Official hours for arrival</span><br/>
                <span>and departure</span>
                <span class="underline-field" style="min-width: 120px;"></span>
              </div>
            </div>

            <table class="dtr-table">
              <thead>
                <tr>
                  <th rowspan="2" style="width: 25px;">Day</th>
                  <th colspan="4">TIME</th>
                  <th colspan="2">UNDERTIME</th>
                </tr>
                <tr>
                  <th style="width: 50px;">Arrival</th>
                  <th style="width: 50px;">Departure</th>
                  <th style="width: 50px;">Arrival</th>
                  <th style="width: 50px;">Departure</th>
                  <th style="width: 35px;">Hours</th>
                  <th style="width: 35px;">Minutes</th>
                </tr>
              </thead>
              <tbody>
                ${leftColumn
                  .map(
                    (entry) => `
                  <tr>
                    <td style="font-weight: bold;">${entry.day}</td>
                    <td>${entry.arrival || ""}</td>
                    <td>${entry.departure || ""}</td>
                    <td></td>
                    <td></td>
                    <td>${entry.undertimeHours || ""}</td>
                    <td>${entry.undertimeMinutes || ""}</td>
                  </tr>
                `
                  )
                  .join("")}
                ${
                  leftColumn.length < 31
                    ? Array(31 - leftColumn.length)
                        .fill(0)
                        .map(
                          (_, i) => `
                  <tr>
                    <td style="font-weight: bold;">${
                      leftColumn.length + i + 1
                    }</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                `
                        )
                        .join("")
                    : ""
                }
                <tr style="font-weight: bold; background-color: #f0f0f0;">
                  <td colspan="5" style="text-align: right; padding-right: 6px;">TOTAL</td>
                  <td colspan="2"></td>
                </tr>
              </tbody>
            </table>

            <div style="margin-top: 15px; font-size: 7px; line-height: 1.3;">
              <p style="margin: 1px 0;">I certify on my honor that the above is a true and correct report</p>
              <p style="margin: 1px 0;">of the hours of work performed, record of which was made</p>
              <p style="margin: 1px 0;">daily at the time of arrival at and departure from office.</p>
            </div>

            <div style="margin-top: 20px; text-align: center;">
              <div style="border-top: 1px solid #000; width: 180px; margin: 0 auto; padding-top: 2px;">
                <p style="font-size: 8px; margin: 0;">Verified as to the prescribed office hours</p>
              </div>
            </div>

            <div style="margin-top: 15px; text-align: center;">
              <div style="border-top: 1px solid #000; width: 180px; margin: 0 auto; padding-top: 2px;">
                <p style="font-size: 8px; margin: 0; font-weight: bold;">In Charge</p>
              </div>
            </div>
          </div>

          <!-- Right DTR -->
          <div>
            <div style="text-align: center; margin-bottom: 10px;">
              <h2 style="font-weight: bold; font-size: 12px; margin: 0 0 8px 0;">DAILY TIME RECORD</h2>
            </div>
            
            <div style="margin-bottom: 10px;">
              <div style="text-align: center; margin-bottom: 3px;">
                <span class="underline-field">${employee.name}</span>
              </div>
              <div style="text-align: center; font-size: 8px; margin-bottom: 8px;">(Name)</div>
              
              <div style="margin-top: 8px; font-size: 8px; text-align: left;">
                <span>For the month of</span>
                <span class="underline-field" style="min-width: 150px;">${month} ${year}</span>
              </div>
              
              <div style="margin-top: 8px; font-size: 8px; text-align: left;">
                <span>Official hours for arrival</span><br/>
                <span>and departure</span>
                <span class="underline-field" style="min-width: 120px;"></span>
              </div>
            </div>

            <table class="dtr-table">
              <thead>
                <tr>
                  <th rowspan="2" style="width: 25px;">Day</th>
                  <th colspan="4">TIME</th>
                  <th colspan="2">UNDERTIME</th>
                </tr>
                <tr>
                  <th style="width: 50px;">Arrival</th>
                  <th style="width: 50px;">Departure</th>
                  <th style="width: 50px;">Arrival</th>
                  <th style="width: 50px;">Departure</th>
                  <th style="width: 35px;">Hours</th>
                  <th style="width: 35px;">Minutes</th>
                </tr>
              </thead>
              <tbody>
                ${rightColumn
                  .map(
                    (entry) => `
                  <tr>
                    <td style="font-weight: bold;">${entry.day}</td>
                    <td>${entry.arrival || ""}</td>
                    <td>${entry.departure || ""}</td>
                    <td></td>
                    <td></td>
                    <td>${entry.undertimeHours || ""}</td>
                    <td>${entry.undertimeMinutes || ""}</td>
                  </tr>
                `
                  )
                  .join("")}
                ${
                  rightColumn.length < 31
                    ? Array(31 - rightColumn.length)
                        .fill(0)
                        .map(
                          (_, i) => `
                  <tr>
                    <td style="font-weight: bold;">${
                      rightColumn.length + i + 1
                    }</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                `
                        )
                        .join("")
                    : ""
                }
                <tr style="font-weight: bold; background-color: #f0f0f0;">
                  <td colspan="5" style="text-align: right; padding-right: 6px;">TOTAL</td>
                  <td colspan="2">${totals.totalUndertime}</td>
                </tr>
              </tbody>
            </table>

            <div style="margin-top: 15px; font-size: 7px; line-height: 1.3;">
              <p style="margin: 1px 0;">I certify on my honor that the above is a true and correct report</p>
              <p style="margin: 1px 0;">of the hours of work performed, record of which was made</p>
              <p style="margin: 1px 0;">daily at the time of arrival at and departure from office.</p>
            </div>

            <div style="margin-top: 20px; text-align: center;">
              <div style="border-top: 1px solid #000; width: 180px; margin: 0 auto; padding-top: 2px;">
                <p style="font-size: 8px; margin: 0;">Verified as to the prescribed office hours</p>
              </div>
            </div>

            <div style="margin-top: 15px; text-align: center;">
              <div style="border-top: 1px solid #000; width: 180px; margin: 0 auto; padding-top: 2px;">
                <p style="font-size: 8px; margin: 0; font-weight: bold;">In Charge</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
