// Dummy data for payslip generation
const dummyEmployees = [
  {
    employeeId: "010101",
    name: "Dela Cruz, Juan",
    position: "IT Support",
    department: "IT",
    cutoffPeriod: "Sep 1 - 15",
    regularPay: 15000.0,
    overtimePay: 1500.0,
    leavePay: 0.0,
    workingHours: 168.0,
    absences: 12.0,
    tardiness: 0.0,
    undertime: 0.0,
    sss: 1125.0,
    philhealth: 450.0,
    pagibig: 100.0,
    withholdingTax: 1250.0,
  },
  {
    employeeId: "010102",
    name: "Santos, Maria",
    position: "HR Manager",
    department: "HR",
    cutoffPeriod: "Sep 1 - 15",
    regularPay: 25000.0,
    overtimePay: 0.0,
    leavePay: 0.0,
    workingHours: 168.0,
    absences: 0.0,
    tardiness: 0.0,
    undertime: 0.0,
    sss: 1125.0,
    philhealth: 750.0,
    pagibig: 100.0,
    withholdingTax: 2500.0,
  },
  {
    employeeId: "010103",
    name: "Reyes, Pedro",
    position: "Software Developer",
    department: "IT",
    cutoffPeriod: "Sep 1 - 15",
    regularPay: 30000.0,
    overtimePay: 3000.0,
    leavePay: 0.0,
    workingHours: 168.0,
    absences: 0.0,
    tardiness: 0.0,
    undertime: 0.0,
    sss: 1125.0,
    philhealth: 900.0,
    pagibig: 100.0,
    withholdingTax: 3200.0,
  },
  {
    employeeId: "010104",
    name: "Garcia, Ana",
    position: "Accountant",
    department: "Finance",
    cutoffPeriod: "Sep 1 - 15",
    regularPay: 22000.0,
    overtimePay: 1000.0,
    leavePay: 0.0,
    workingHours: 168.0,
    absences: 0.0,
    tardiness: 0.0,
    undertime: 0.0,
    sss: 1125.0,
    philhealth: 660.0,
    pagibig: 100.0,
    withholdingTax: 2100.0,
  },
  {
    employeeId: "010105",
    name: "Mendoza, Jose",
    position: "Marketing Specialist",
    department: "Marketing",
    cutoffPeriod: "Sep 1 - 15",
    regularPay: 18000.0,
    overtimePay: 500.0,
    leavePay: 0.0,
    workingHours: 168.0,
    absences: 0.0,
    tardiness: 0.0,
    undertime: 0.0,
    sss: 1125.0,
    philhealth: 540.0,
    pagibig: 100.0,
    withholdingTax: 1600.0,
  },
  {
    employeeId: "010106",
    name: "Torres, Carmen",
    position: "Sales Executive",
    department: "Sales",
    cutoffPeriod: "Sep 1 - 15",
    regularPay: 20000.0,
    overtimePay: 2000.0,
    leavePay: 0.0,
    workingHours: 168.0,
    absences: 0.0,
    tardiness: 0.0,
    undertime: 0.0,
    sss: 1125.0,
    philhealth: 600.0,
    pagibig: 100.0,
    withholdingTax: 1900.0,
  },
  {
    employeeId: "010107",
    name: "Ramos, Roberto",
    position: "Operations Manager",
    department: "Operations",
    cutoffPeriod: "Sep 1 - 15",
    regularPay: 28000.0,
    overtimePay: 0.0,
    leavePay: 0.0,
    workingHours: 168.0,
    absences: 0.0,
    tardiness: 0.0,
    undertime: 0.0,
    sss: 1125.0,
    philhealth: 840.0,
    pagibig: 100.0,
    withholdingTax: 2900.0,
  },
  {
    employeeId: "010108",
    name: "Cruz, Linda",
    position: "Customer Service",
    department: "Support",
    cutoffPeriod: "Sep 1 - 15",
    regularPay: 16000.0,
    overtimePay: 800.0,
    leavePay: 0.0,
    workingHours: 168.0,
    absences: 0.0,
    tardiness: 0.0,
    undertime: 0.0,
    sss: 1125.0,
    philhealth: 480.0,
    pagibig: 100.0,
    withholdingTax: 1400.0,
  },
];

// Calculate gross, deductions, and net pay for each employee
dummyEmployees.forEach((emp) => {
  emp.grossEarnings = emp.regularPay + emp.overtimePay + emp.leavePay;
  emp.totalDeductions =
    emp.sss + emp.philhealth + emp.pagibig + emp.withholdingTax;
  emp.netPay = emp.grossEarnings - emp.totalDeductions;
});

// Get grid div
const gridDiv = document.getElementById("payslipGrid");
if (!gridDiv) {
  console.error("Payslip grid container #payslipGrid not found.");
}

// Determine user theme preference
const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

// Apply the correct AG Grid theme
if (gridDiv) {
  gridDiv.classList.add(
    isDarkMode ? "ag-theme-quartz-dark" : "ag-theme-quartz"
  );
}

// Listen for system theme changes in real time
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!gridDiv) return;
    gridDiv.classList.toggle("ag-theme-quartz-dark", e.matches);
    gridDiv.classList.toggle("ag-theme-quartz", !e.matches);
  });

// Column definitions for AG Grid (selection column is configured via rowSelection)
const columnDefs = [
  {
    headerName: "Employee ID",
    field: "employeeId",
    sortable: true,
    filter: true,
    width: 140,
    cellStyle: { fontWeight: "500" },
  },
  {
    headerName: "Name",
    field: "name",
    sortable: true,
    filter: true,
    width: 200,
    minWidth: 180,
    cellStyle: { fontWeight: "500" },
  },
  {
    headerName: "Position",
    field: "position",
    sortable: true,
    filter: true,
    width: 180,
    minWidth: 170,
  },
  {
    headerName: "Department",
    field: "department",
    sortable: true,
    filter: true,
    width: 140,
  },
  {
    headerName: "Cutoff Period",
    field: "cutoffPeriod",
    sortable: true,
    filter: true,
    width: 140,
  },
  {
    headerName: "Actions",
    field: "actions",
    width: 140,
    pinned: "right",
    lockPosition: true,
    suppressMovable: true,
    cellStyle: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "8px",
    },
    cellRenderer: (params) => {
      const button = document.createElement("button");
      button.className =
        "px-8 py-2 font-medium text-white transition-colors btn btn-primary btn-sm";
      button.textContent = "Preview";

      button.addEventListener("click", () => {
        openPreviewModal(params.data.employeeId);
      });

      return button;
    },
  },
];

// Grid options
const gridOptions = {
  columnDefs: columnDefs,
  rowData: dummyEmployees,
  domLayout: "normal",
  autoSizeStrategy: {
    type: "fitGridWidth",
  },
  rowSelection: {
    mode: "multiRow",
    checkboxes: true, // replaces colDef.checkboxSelection
    headerCheckbox: true, // replaces colDef.headerCheckboxSelection
    selectionColumnDef: {
      width: 50,
      pinned: "left",
      lockPosition: true,
      suppressMovable: true,
      headerClass: "ag-header-cell-center",
    },
  },
  defaultColDef: {
    resizable: true,
    filter: true,
    sortable: true,
  },
  rowHeight: 50,
  headerHeight: 50,
};

// Store grid API globally
let gridApi = null;

// Initialize AG Grid
try {
  if (gridDiv && window.agGrid && agGrid.createGrid) {
    // In recent AG Grid versions, createGrid returns the grid API instance
    const api = agGrid.createGrid(gridDiv, gridOptions);
    gridApi = api || gridOptions.api || null;
    console.log("[Payslip] AG Grid initialized:", !!gridApi, gridApi);
  } else {
    console.error("AG Grid library not available or grid container missing.");
  }
} catch (error) {
  console.error("Error initializing AG Grid:", error);
  alert(
    "Error loading the grid. Please make sure AG Grid library is loaded correctly."
  );
}

// Search functionality (uses grid API correctly)
const searchInput = document.getElementById("searchInput");
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    if (!gridApi) return;
    gridApi.setQuickFilter(e.target.value);
  });
}

// Cutoff period change + initial sync
const cutoffPeriod = document.getElementById("cutoffPeriod");
function applyCutoffToGrid(selectedPeriod) {
  if (!gridApi) {
    console.warn("[Payslip] applyCutoffToGrid: gridApi not ready");
    return;
  }
  const updatedData = dummyEmployees.map((emp) => ({
    ...emp,
    cutoffPeriod: selectedPeriod,
  }));
  // AG Grid modern API: setGridOption; fallback to legacy setRowData if present
  try {
    if (typeof gridApi.setGridOption === "function") {
      gridApi.setGridOption("rowData", updatedData);
    } else if (typeof gridApi.setRowData === "function") {
      gridApi.setRowData(updatedData);
    } else {
      console.warn("[Payslip] No supported API to update rowData");
    }
  } catch (e) {
    console.error("[Payslip] Failed updating rowData:", e);
  }
}
if (cutoffPeriod) {
  // Initial sync on load to match selected option in UI
  applyCutoffToGrid(cutoffPeriod.value);
  cutoffPeriod.addEventListener("change", (e) => {
    applyCutoffToGrid(e.target.value);
  });
}

// Generate PDF — renders a simple summary panel for each employee
function generateEmployeesPdf(employees) {
  console.log(
    "[Payslip] generateEmployeesPdf called. Count:",
    employees ? employees.length : "n/a"
  );
  if (!window.jspdf || !window.jspdf.jsPDF) {
    console.error("[Payslip] jsPDF not available.", { jspdf: !!window.jspdf });
    alert("PDF library not loaded. Please check your network connection.");
    return;
  }
  const { jsPDF } = window.jspdf;
  let doc;
  try {
    doc = new jsPDF({ unit: "pt", format: "a4" }); // 595x842 pt canvas
  } catch (e) {
    console.error("[Payslip] Failed to construct jsPDF:", e);
    alert("Unable to start PDF rendering. See console for details.");
    return;
  }

  const margin = 40;
  let y = margin + 12;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Payslip Summary", margin, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const generatedOn = new Date().toLocaleString();
  doc.text(`Generated on ${generatedOn}`, margin, y);
  y += 14;

  const pageHeight = doc.internal.pageSize.getHeight();
  const panelGap = 14;

  function ensureSpace(requiredHeight) {
    if (y + requiredHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function drawLabelValue(label, value, x, yy, width) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(label, x, yy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(String(value), x + width, yy, { align: "right" });
  }

  employees.forEach((emp, index) => {
    console.log(
      "[Payslip] Rendering panel for employee:",
      emp && emp.employeeId,
      emp && emp.name
    );
    // Estimate height of one panel
    const estimatedPanelHeight = 160; // safe estimate for our rows
    ensureSpace(estimatedPanelHeight);

    // Panel wrapper
    const panelTop = y;
    const panelLeft = margin;
    const panelWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const panelRight = panelLeft + panelWidth;
    const innerPadding = 12;

    // Header
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(
      panelLeft,
      panelTop,
      panelWidth,
      estimatedPanelHeight,
      6,
      6,
      "S"
    );

    let yy = panelTop + innerPadding + 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${emp.name} (${emp.employeeId})`, panelLeft + innerPadding, yy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(
      `${emp.department} • ${emp.position}`,
      panelRight - innerPadding,
      yy,
      { align: "right" }
    );

    // Divider
    yy += 8;
    doc.setDrawColor(230, 230, 230);
    doc.line(panelLeft + innerPadding, yy, panelRight - innerPadding, yy);

    // Two columns of label/value rows
    const colGap = 24;
    const colWidth = (panelWidth - innerPadding * 2 - colGap) / 2;
    const col1X = panelLeft + innerPadding;
    const col2X = col1X + colWidth + colGap;
    const valueRightOffset = 12;

    yy += 16;
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);

    // Left column: earnings and attendance
    drawLabelValue(
      "Regular Pay",
      formatCurrency(emp.regularPay),
      col1X,
      yy,
      colWidth - valueRightOffset
    );
    yy += 14;
    drawLabelValue(
      "OT",
      formatCurrency(emp.overtimePay),
      col1X,
      yy,
      colWidth - valueRightOffset
    );
    yy += 14;
    drawLabelValue(
      "Leave Pay",
      formatCurrency(emp.leavePay),
      col1X,
      yy,
      colWidth - valueRightOffset
    );
    yy += 16;
    drawLabelValue(
      "Working Hours",
      formatCurrency(emp.workingHours),
      col1X,
      yy,
      colWidth - valueRightOffset
    );
    yy += 14;
    drawLabelValue(
      "Absences",
      formatCurrency(emp.absences),
      col1X,
      yy,
      colWidth - valueRightOffset
    );
    yy += 14;
    drawLabelValue(
      "Tardiness",
      formatCurrency(emp.tardiness),
      col1X,
      yy,
      colWidth - valueRightOffset
    );
    yy += 14;
    drawLabelValue(
      "Undertime",
      formatCurrency(emp.undertime),
      col1X,
      yy,
      colWidth - valueRightOffset
    );

    // Right column: contributions + summary
    let yy2 = panelTop + innerPadding + 22;
    drawLabelValue(
      "SSS Contribution",
      formatCurrency(emp.sss),
      col2X,
      yy2,
      colWidth - valueRightOffset
    );
    yy2 += 14;
    drawLabelValue(
      "PhilHealth",
      formatCurrency(emp.philhealth),
      col2X,
      yy2,
      colWidth - valueRightOffset
    );
    yy2 += 14;
    drawLabelValue(
      "Pag-ibig",
      formatCurrency(emp.pagibig),
      col2X,
      yy2,
      colWidth - valueRightOffset
    );
    yy2 += 14;
    drawLabelValue(
      "Withholding Tax",
      formatCurrency(emp.withholdingTax),
      col2X,
      yy2,
      colWidth - valueRightOffset
    );
    yy2 += 16;
    drawLabelValue(
      "Gross Earnings",
      formatCurrency(emp.grossEarnings),
      col2X,
      yy2,
      colWidth - valueRightOffset
    );
    yy2 += 14;
    drawLabelValue(
      "Total Deductions",
      formatCurrency(emp.totalDeductions),
      col2X,
      yy2,
      colWidth - valueRightOffset
    );
    yy2 += 18;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 81, 50); // green-ish
    drawLabelValue(
      "Net Pay",
      formatCurrency(emp.netPay),
      col2X,
      yy2,
      colWidth - valueRightOffset
    );

    // Move y below the taller of the two columns
    y = Math.max(yy + 12, yy2 + 16) + panelGap;
  });

  try {
    doc.save("payslips-summary.pdf");
    console.log("[Payslip] PDF saved successfully.");
  } catch (e) {
    console.error("[Payslip] Failed to save PDF:", e);
    alert("Unable to save PDF. See console for details.");
  }
}

// Generate PDF button
const generatePdfBtn = document.getElementById("generatePdfBtn");
if (generatePdfBtn) {
  generatePdfBtn.addEventListener("click", () => {
    console.log("[Payslip] Generate PDF button clicked");
    if (!gridApi) {
      console.warn(
        "[Payslip] gridApi is not set. Falling back to all dummy employees."
      );
    }
    const hasSelectionApi =
      gridApi && typeof gridApi.getSelectedRows === "function";
    const selected = hasSelectionApi ? gridApi.getSelectedRows() || [] : [];
    console.log("[Payslip] Selected rows count:", selected.length);
    if (!selected || selected.length === 0) {
      alert("Please select at least one employee to generate a PDF summary.");
      console.warn("[Payslip] No rows selected. PDF generation aborted.");
      return;
    }
    console.log("[Payslip] Generating PDF for rows:", selected.length);
    try {
      generateEmployeesPdf(selected);
    } catch (e) {
      console.error("[Payslip] Error during PDF generation:", e);
      alert("PDF generation failed. See console for details.");
    }
  });
}

// Global error logging to help diagnose issues in the field
window.addEventListener("error", (e) => {
  console.error("[Payslip] Global error:", e.message, e.error);
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("[Payslip] Unhandled promise rejection:", e.reason);
});

// Format currency
function formatCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0.00";
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

// Safe text update helper
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// Open preview modal with employee data
function openPreviewModal(employeeId) {
  const employee = dummyEmployees.find((emp) => emp.employeeId === employeeId);

  if (!employee) {
    alert("Employee not found!");
    return;
  }

  // Populate modal with employee data
  setText("previewEmpId", employee.employeeId);
  setText("previewEmpName", employee.name);
  setText("previewDept", employee.department);
  setText("previewPos", employee.position);

  // Earnings
  setText("previewRegularPay", formatCurrency(employee.regularPay));
  setText("previewOT", formatCurrency(employee.overtimePay));
  setText("previewLeavePay", formatCurrency(employee.leavePay));

  // Attendance Summary (Working hours, Absences, Tardiness, Undertime)
  setText("previewWorkingHours", formatCurrency(employee.workingHours));
  setText("previewAbsences", formatCurrency(employee.absences));
  setText("previewTardiness", formatCurrency(employee.tardiness));
  setText("previewUndertime", formatCurrency(employee.undertime));

  // Deductions
  setText("previewSSS", formatCurrency(employee.sss));
  setText("previewPhilhealth", formatCurrency(employee.philhealth));
  setText("previewPagibig", formatCurrency(employee.pagibig));
  setText("previewTax", formatCurrency(employee.withholdingTax));

  // Summary
  setText("previewGross", formatCurrency(employee.grossEarnings));
  setText("previewDeductions", formatCurrency(employee.totalDeductions));
  setText("previewNetPay", formatCurrency(employee.netPay));

  // Update period and issued date
  const periodMap = {
    "Sep 1 - 15": { period: "09/01/25 - 09/15/25", issued: "09/16/25" },
    "Sep 16 - 30": { period: "09/16/25 - 09/30/25", issued: "10/01/25" },
    "Oct 1 - 15": { period: "10/01/25 - 10/15/25", issued: "10/16/25" },
    "Oct 16 - 31": { period: "10/16/25 - 10/31/25", issued: "11/01/25" },
  };

  const dates = periodMap[employee.cutoffPeriod] || {
    period: "09/01/25 - 09/15/25",
    issued: "09/16/25",
  };
  setText("previewPeriod", dates.period);
  setText("previewIssued", dates.issued);

  // Show modal with outside-click minimize before close
  const modal = document.getElementById("previewModal");
  if (modal && modal.showModal) {
    if (!modal.open) modal.showModal();

    const minimizeAndClose = () => {
      modal.classList.add("minimizing");
      setTimeout(() => {
        if (modal.open) modal.close();
      }, 170); // slightly longer than CSS 160ms
    };

    const onBackdropClick = (e) => {
      if (e.target === modal) {
        minimizeAndClose();
      }
    };

    modal.addEventListener("click", onBackdropClick);
    modal.addEventListener(
      "close",
      () => {
        modal.classList.remove("minimizing");
        modal.removeEventListener("click", onBackdropClick);
      },
      { once: true }
    );
  }
}

// Window resize handler for responsive grid
window.addEventListener("resize", () => {
  if (gridApi && gridApi.sizeColumnsToFit) {
    gridApi.sizeColumnsToFit();
  }
});
