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

    console.log(" DTR generated successfully");

    return {
      employee,
      cutoffPeriod,
      dtrData,
      totals,
      month: getMonthName(month),
      year,
    };
  } catch (error) {
    console.error(" Error generating DTR:", error);
    throw error;
  }
}

// Get employee time logs from Supabase for a specific month/year
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
    // Try with department_name first
    let { data, error } = await supabaseClient
      .from("employee_time_logs")
      .select("employee_id, first_name, middle_name, last_name, department_name")
      .eq("employee_id", employeeId)
      .limit(1)
      .single();

    // If department_name doesn't exist, try with department
    if (error && error.code === '42703') {
      const result = await supabaseClient
        .from("employee_time_logs")
        .select("employee_id, first_name, middle_name, last_name, department")
        .eq("employee_id", employeeId)
        .limit(1)
        .single();
      
      data = result.data;
      error = result.error;
    }

    if (error) throw error;

    const fullName = [data.first_name, data.middle_name, data.last_name]
      .filter(Boolean)
      .join(" ");

    return {
      id: employeeId,
      name: fullName || "Unknown Employee",
      department: data.department_name || data.department || "N/A",
    };
  } catch (error) {
    console.error("Error fetching employee info:", error);
    return { id: employeeId, name: "Unknown Employee", department: "N/A" };
  }
}

// Build DTR data structure with proper AM/PM columns
function buildDTRData(employeeLogs, startDay, endDay, month, year) {
  const dtrData = [];

  for (let day = startDay; day <= endDay; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayLogs = employeeLogs.filter((log) => log.Date === dateStr);

    if (dayLogs.length > 0) {
      const timeIns = dayLogs.map((l) => l["Time In"]).filter(Boolean);
      const timeOuts = dayLogs.map((l) => l["Time Out"]).filter(Boolean);

      // Determine AM and PM entries based on number of time logs
      let amArrival = "";
      let amDeparture = "";
      let pmArrival = "";
      let pmDeparture = "";

      if (timeIns.length === 1 && timeOuts.length === 1) {
        // Single shift: Only morning in and afternoon out
        amArrival = formatTime(timeIns[0]);
        pmDeparture = formatTime(timeOuts[0]);
      } else if (timeIns.length === 2 && timeOuts.length === 2) {
        // Full day with lunch break
        amArrival = formatTime(timeIns[0]);  
        amDeparture = formatTime(timeOuts[0]); 
        pmArrival = formatTime(timeIns[1]);    
        pmDeparture = formatTime(timeOuts[1]); 
      } else if (timeIns.length === 2 && timeOuts.length === 1) {
        // Two time-ins but only one time-out (incomplete)
        amArrival = formatTime(timeIns[0]);
        pmArrival = formatTime(timeIns[1]);
        pmDeparture = formatTime(timeOuts[0]);
      } else if (timeIns.length === 1 && timeOuts.length === 2) {
        // One time-in but two time-outs (unusual case)
        amArrival = formatTime(timeIns[0]);
        amDeparture = formatTime(timeOuts[0]);
        pmDeparture = formatTime(timeOuts[1]);
      } else if (timeIns.length > 0) {
        // Fallback: Just use available times
        amArrival = formatTime(timeIns[0]);
        if (timeOuts.length > 0) {
          pmDeparture = formatTime(timeOuts[timeOuts.length - 1]);
        }
      }

      const undertimeMinutesTotal = dayLogs.reduce(
        (sum, log) => sum + (parseFloat(log.Undertime) || 0),
        0
      );

      const undertimeHours = Math.floor(undertimeMinutesTotal / 60);
      const undertimeMinutes = undertimeMinutesTotal % 60;

      dtrData.push({
        day,
        amArrival,
        amDeparture,
        pmArrival,
        pmDeparture,
        undertimeHours: undertimeHours > 0 ? undertimeHours : "",
        undertimeMinutes: undertimeMinutes > 0 ? undertimeMinutes : "",
      });
    } else {
      dtrData.push({
        day,
        amArrival: "",
        amDeparture: "",
        pmArrival: "",
        pmDeparture: "",
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

// Generate PDF with multiple DTRs - 1 DTR per page
export function generateMultipleDTRsPdf(dtrInfoArray) {
  console.log("[DTR] generateMultipleDTRsPdf called. Count:", dtrInfoArray?.length || "n/a");

  if (!window.jspdf) {
    console.error("[DTR] jsPDF library not loaded in window.jspdf");
    alert("PDF library not loaded. Please ensure jsPDF is included in your HTML:\n<script src=\"https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js\"></script>");
    return;
  }

  if (!window.jspdf.jsPDF) {
    console.error("[DTR] jsPDF.jsPDF constructor not available");
    alert("PDF library not properly initialized. Please check your jsPDF installation.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  dtrInfoArray.forEach((dtrInfo, index) => {
    if (index > 0) {
      doc.addPage();
    }

    const { employee, cutoffPeriod, dtrData, totals, month, year } = dtrInfo;
    
    // Draw two DTR columns side by side (original design)
    const colWidth = (pageWidth - margin * 3) / 2;
    const col1X = margin;
    const col2X = margin + colWidth + margin;

    // Draw left column
    drawDTRColumn(doc, col1X, margin, colWidth, employee, month, year, dtrData, totals, false);
    
    // Draw right column
    drawDTRColumn(doc, col2X, margin, colWidth, employee, month, year, dtrData, totals, true);
  });

  try {
    doc.save("DTR_Records.pdf");
    console.log("[DTR] PDF saved successfully.");
  } catch (e) {
    console.error("[DTR] Failed to save PDF:", e);
    alert("Unable to save PDF. See console for details.");
  }
}

// Helper function to draw a single DTR column
function drawDTRColumn(doc, x, y, width, employee, month, year, dtrData, totals, showTotal) {
  let currentY = y;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("DAILY TIME RECORD", x + width / 2, currentY, { align: "center" });
  currentY += 20;

  // Employee name
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(employee.name, x + width / 2, currentY, { align: "center" });
  doc.setDrawColor(0, 0, 0);
  doc.line(x + 10, currentY + 2, x + width - 10, currentY + 2);
  currentY += 10;
  doc.text("(Name)", x + width / 2, currentY, { align: "center" });
  currentY += 15;

  // Month and year
  doc.text(`For the month of ${month} ${year}`, x + 10, currentY);
  doc.line(x + 90, currentY + 2, x + width - 10, currentY + 2);
  currentY += 15;

  // Official hours
  doc.text("Official hours for arrival and departure", x + 10, currentY);
  doc.line(x + 150, currentY + 2, x + width - 10, currentY + 2);
  currentY += 15;

  // Table
  const tableStartY = currentY;
  const cellHeight = 15;
  const col1Width = 25;
  const col2Width = 35;
  const col3Width = 35;
  const col4Width = 35;
  const col5Width = 35;
  const col6Width = 30;
  const col7Width = 30;

  // Table headers
  doc.setFillColor(240, 240, 240);
  doc.rect(x, currentY, width, cellHeight * 2, "F");
  doc.setDrawColor(0, 0, 0);
  doc.rect(x, currentY, width, cellHeight * 2, "S");

  // Draw column lines for header
  doc.line(x + col1Width, currentY, x + col1Width, currentY + cellHeight * 2);
  doc.line(x + col1Width + col2Width * 2, currentY + cellHeight, x + col1Width + col2Width * 2, currentY + cellHeight * 2);
  doc.line(x + col1Width + col2Width * 4, currentY + cellHeight, x + col1Width + col2Width * 4, currentY + cellHeight * 2);
  doc.line(x + col1Width + col2Width * 4 + col6Width, currentY + cellHeight, x + col1Width + col2Width * 4 + col6Width, currentY + cellHeight * 2);

  // Header row 1
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Day", x + col1Width / 2, currentY + 18, { align: "center" });
  doc.text("AM", x + col1Width + col2Width, currentY + 8, { align: "center" });
  doc.text("PM", x + col1Width + col2Width * 3, currentY + 8, { align: "center" });
  doc.text("Undertime", x + col1Width + col2Width * 4 + col6Width / 2 + 15, currentY + 8, { align: "center" });

  doc.line(x, currentY + cellHeight, x + width, currentY + cellHeight);

  // Header row 2
  currentY += cellHeight;
  doc.text("Arrival", x + col1Width + col2Width / 2, currentY + 8, { align: "center" });
  doc.line(x + col1Width + col2Width, currentY, x + col1Width + col2Width, currentY + cellHeight);
  doc.text("Departure", x + col1Width + col2Width + col3Width / 2, currentY + 8, { align: "center" });
  doc.text("Arrival", x + col1Width + col2Width * 2 + col4Width / 2, currentY + 8, { align: "center" });
  doc.line(x + col1Width + col2Width * 3, currentY, x + col1Width + col2Width * 3, currentY + cellHeight);
  doc.text("Departure", x + col1Width + col2Width * 3 + col5Width / 2, currentY + 8, { align: "center" });
  doc.text("Hours", x + col1Width + col2Width * 4 + col6Width / 2, currentY + 8, { align: "center" });
  doc.text("Minutes", x + col1Width + col2Width * 4 + col6Width + col7Width / 2, currentY + 8, { align: "center" });

  currentY += cellHeight;

  // Data rows with proper AM/PM columns
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  dtrData.forEach((entry) => {
    doc.rect(x, currentY, width, cellHeight, "S");
    doc.line(x + col1Width, currentY, x + col1Width, currentY + cellHeight);
    doc.line(x + col1Width + col2Width, currentY, x + col1Width + col2Width, currentY + cellHeight);
    doc.line(x + col1Width + col2Width * 2, currentY, x + col1Width + col2Width * 2, currentY + cellHeight);
    doc.line(x + col1Width + col2Width * 3, currentY, x + col1Width + col2Width * 3, currentY + cellHeight);
    doc.line(x + col1Width + col2Width * 4, currentY, x + col1Width + col2Width * 4, currentY + cellHeight);
    doc.line(x + col1Width + col2Width * 4 + col6Width, currentY, x + col1Width + col2Width * 4 + col6Width, currentY + cellHeight);

    doc.text(entry.day.toString(), x + col1Width / 2, currentY + 10, { align: "center" });
    doc.text(entry.amArrival || "", x + col1Width + col2Width / 2, currentY + 10, { align: "center" });
    doc.text(entry.amDeparture || "", x + col1Width + col2Width + col3Width / 2, currentY + 10, { align: "center" });
    doc.text(entry.pmArrival || "", x + col1Width + col2Width * 2 + col4Width / 2, currentY + 10, { align: "center" });
    doc.text(entry.pmDeparture || "", x + col1Width + col2Width * 3 + col5Width / 2, currentY + 10, { align: "center" });
    doc.text(entry.undertimeHours?.toString() || "", x + col1Width + col2Width * 4 + col6Width / 2, currentY + 10, { align: "center" });
    doc.text(entry.undertimeMinutes?.toString() || "", x + col1Width + col2Width * 4 + col6Width + col7Width / 2, currentY + 10, { align: "center" });

    currentY += cellHeight;
  });

  // Total row
  doc.setFillColor(240, 240, 240);
  doc.rect(x, currentY, width, cellHeight, "FD");
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", x + col1Width + col2Width * 2, currentY + 10, { align: "center" });
  if (showTotal) {
    doc.text(totals.totalUndertime, x + col1Width + col2Width * 4 + (col6Width + col7Width) / 2, currentY + 10, { align: "center" });
  }

  currentY += cellHeight + 20;

  // Signature lines
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.line(x + 10, currentY, x + width - 10, currentY);
  currentY += 10;
  doc.text("Verified as to the prescribed office hours.", x + width / 2, currentY, { align: "center" });
  currentY += 20;
  doc.line(x + 10, currentY, x + width - 10, currentY);
  currentY += 10;
  doc.text("In Charge", x + width / 2, currentY, { align: "center" });
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

// Get all unique departments from Supabase
export async function getAvailableDepartments() {
  try {
    console.log(" Fetching departments from Supabase...");
    
    // First try to get from departments table with department_name column
    const { data: deptTableData, error: deptTableError } = await supabaseClient
      .from("departments")
      .select("department_name")
      .order("department_name");

    // If departments table exists and has data, use it
    if (!deptTableError && deptTableData && deptTableData.length > 0) {
      const departments = deptTableData.map(row => row.department_name).filter(Boolean);
      console.log(` Found ${departments.length} departments from departments table:`, departments);
      return departments;
    }

    // Fallback: Get unique departments from employee_time_logs view
    console.log("Trying employee_time_logs view...");
    const { data, error } = await supabaseClient
      .from("employee_time_logs")
      .select("department_name");

    if (error) {
      // If department_name doesn't exist, try just 'department'
      console.log("Trying 'department' column...");
      const { data: data2, error: error2 } = await supabaseClient
        .from("employee_time_logs")
        .select("department");
      
      if (error2) throw error2;
      
      const departments = [...new Set(data2.map(row => row.department).filter(Boolean))];
      console.log(` Found ${departments.length} unique departments:`, departments);
      return departments.sort();
    }

    // Extract unique departments and filter out nulls
    const departments = [...new Set(data.map(row => row.department_name).filter(Boolean))];
    console.log(` Found ${departments.length} unique departments:`, departments);
    
    return departments.sort();
  } catch (error) {
    console.error(" Error fetching departments:", error);
    return [];
  }
}

// Get employees by department from Supabase
export async function getEmployeesByDepartment(department) {
  try {
    console.log(` Fetching employees for department: ${department}`);
    
    // Try with department_name first
    let { data, error } = await supabaseClient
      .from("employee_time_logs")
      .select("employee_id, first_name, middle_name, last_name, department_name")
      .eq("department_name", department);

    // If department_name doesn't exist, try with department
    if (error && error.code === '42703') {
      console.log("Trying 'department' column...");
      const result = await supabaseClient
        .from("employee_time_logs")
        .select("employee_id, first_name, middle_name, last_name, department")
        .eq("department", department);
      
      data = result.data;
      error = result.error;
    }

    if (error) throw error;

    // Get unique employees (since employee_time_logs has multiple entries per employee)
    const uniqueEmployees = {};
    data.forEach(row => {
      if (!uniqueEmployees[row.employee_id]) {
        uniqueEmployees[row.employee_id] = {
          employee_id: row.employee_id,
          first_name: row.first_name,
          middle_name: row.middle_name,
          last_name: row.last_name,
          department: row.department_name || row.department
        };
      }
    });

    const employees = Object.values(uniqueEmployees);
    console.log(` Found ${employees.length} employees in ${department}`);
    
    return employees;
  } catch (error) {
    console.error(" Error fetching employees by department:", error);
    return [];
  }
}

// Generate DTR for entire department
export async function generateDepartmentDTR(department, cutoffPeriod) {
  try {
    console.log(` Generating DTR for department: ${department}`);
    
    // Get all employees in the department
    const employees = await getEmployeesByDepartment(department);
    console.log(`Found ${employees.length} employees in ${department}`);
    
    // Generate DTR for each employee
    const dtrInfoArray = [];
    for (const employee of employees) {
      try {
        const dtrInfo = await generateDTR(employee.employee_id, cutoffPeriod);
        dtrInfoArray.push(dtrInfo);
      } catch (error) {
        console.error(`Failed to generate DTR for ${employee.employee_id}:`, error);
      }
    }
    
    return dtrInfoArray;
  } catch (error) {
    console.error("Error generating department DTR:", error);
    throw error;
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