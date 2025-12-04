// Payslip Generation with Supabase Integration
// Get Supabase client
import { supabaseClient } from "../supabase/supabaseClient.js";
const supabase = supabaseClient;

// Configuration constants (Add these to main.js)
const COMPANY_BUCKET = "company_logo";
const FALLBACK_LOGO_URL =
  "https://placehold.co/100x100/9b97ef/FFFFFF/png?text=CN";

/**
 * Generates the public URL for the logo with a cache-busting timestamp.
 * @param {string} path - The logo file path.
 * @returns {string | null} The public URL with cache-buster, or null.
 */
function getLogoUrl(path) {
  if (!path) return null;

  try {
    const { data } = supabase.storage.from(COMPANY_BUCKET).getPublicUrl(path);

    if (data?.publicUrl) {
      // Use Date.now() as the cache-buster 'v' parameter
      const cacheBuster = Date.now();
      const separator = data.publicUrl.includes("?") ? "&" : "?";

      // Return the URL with the unique timestamp (This forces the browser to reload)
      return `${data.publicUrl}${separator}v=${cacheBuster}`;
    }
    return null;
  } catch (e) {
    console.warn("Could not generate logo URL:", e);
    return null;
  }
}

let currentUser = null;

async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error("Error fetching logged in user:", error);
    return null;
  }
  return data.user;
}

async function fetchCompanyDetails() {
  try {
    const { data, error } = await supabase
      .from("company_details")
      .select("*")
      .limit(1)
      .single(); // We expect only one company record

    if (error) throw error;

    console.log("[Payslip] Company details fetched successfully.");
    companyDetails = data;
  } catch (error) {
    console.error("[Payslip] Error fetching company details:", error);
  }
}

function applyRBAC(user) {
  if (!user) return;

  const userType = user.user_metadata?.user_type;
  const employeeId = user.user_metadata?.employee_id;

  if (userType === "Employee") {
    // === Modify columns for Employee role ===
    if (window.gridApi) {
      const employeeColumnDefs = [
        {
          headerName: "Name",
          field: "full_name",
          sortable: true,
          filter: true,
          width: 500,
          minWidth: 180,
          cellStyle: { fontWeight: "500" },
          valueGetter: (params) => {
            const emp = params.data;
            const parts = [
              emp.first_name,
              emp.middle_name,
              emp.last_name,
            ].filter(Boolean);
            return parts.join(" ");
          },
        },
        {
          headerName: "Cutoff Period",
          field: "cutoff_period",
          sortable: true,
          filter: true,
          width: 500,
        },
        {
          headerName: "Actions",
          field: "actions",
          width: 500,
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
              openPreviewModal(params.data);
            });

            return button;
          },
        },
      ];

      // Apply new columns
      window.gridApi.setGridOption("columnDefs", employeeColumnDefs);

      // Disable multi-select + hide checkbox column
      window.gridApi.setGridOption("rowSelection", {
        mode: "singleRow",
        checkboxes: true,
      });
    }

    // Hide search bar
    const searchBar = document.getElementById("searchInput");
    if (searchBar) searchBar.closest("label").classList.add("hidden");

    // Hide cutoff dropdown
    const cutoffSelect = document.getElementById("cutoffPeriod");
    if (cutoffSelect) cutoffSelect.classList.add("hidden");

    const cutOffLabel = document.getElementById("cutoffPeriodLabel");
    if (cutOffLabel) cutOffLabel.classList.add("hidden");

    // // Disable selection for employees
    // if (gridApi) {
    //   gridApi.setGridOption("rowSelection", {
    //     mode: "singleRow",
    //     checkboxes: false,
    //   });
    // }

    // Change PDF button text
    const pdfBtn = document.getElementById("generatePdfBtn");
    if (pdfBtn) pdfBtn.textContent = "Download My Payslip";

    // Save employeeId globally
    window.currentEmployeeId = employeeId;
  }
}

// State management
let allEmployeesData = [];
let filteredData = [];
let gridApi = null;
let companyDetails = null;

// Helper function to get full name
function getFullName(emp) {
  const parts = [emp.first_name, emp.middle_name, emp.last_name].filter(
    Boolean
  );
  return parts.join(" ");
}

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

// Format currency helper
function formatCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0.00";
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

// Column definitions for AG Grid
const columnDefs = [
  {
    headerName: "Employee ID",
    field: "employee_id",
    sortable: true,
    filter: true,
    width: 140,
    cellStyle: { fontWeight: "500" },
  },
  {
    headerName: "Name",
    field: "full_name",
    sortable: true,
    filter: true,
    width: 200,
    minWidth: 180,
    cellStyle: { fontWeight: "500" },
    valueGetter: (params) => getFullName(params.data),
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
    field: "cutoff_period",
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
        openPreviewModal(params.data);
      });

      return button;
    },
  },
];

// Grid options
const gridOptions = {
  columnDefs: columnDefs,
  rowData: [],
  domLayout: "normal",
  autoSizeStrategy: {
    type: "fitGridWidth",
  },
  rowSelection: {
    mode: "multiRow",
    checkboxes: true,
    headerCheckbox: true,
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
  overlayLoadingTemplate:
    '<span class="ag-overlay-loading-center">Loading payslip data...</span>',
  overlayNoRowsTemplate:
    '<span class="ag-overlay-no-rows-center">No payslip data available</span>',
  // Pagination settings
  pagination: true,
  paginationPageSize: 20,
  paginationPageSizeSelector: [10, 20, 50, 100],
};

// Initialize AG Grid
try {
  if (gridDiv && window.agGrid && agGrid.createGrid) {
    const api = agGrid.createGrid(gridDiv, gridOptions);
    gridApi = api || gridOptions.api || null;
    console.log("[Payslip] AG Grid initialized:", !!gridApi);

    // Save globally so applyRBAC can modify columns
    window.gridApi = gridApi;

    // Now that grid is ready, apply RBAC rules
    if (currentUser) applyRBAC(currentUser);
  } else {
    console.error("AG Grid library not available or grid container missing.");
  }
} catch (error) {
  console.error("Error initializing AG Grid:", error);
  alert("Error loading the grid. Please check the console for details.");
}

// Fetch payslip data from Supabase
async function fetchPayslipData() {
  try {
    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    // Show loading overlay
    if (gridApi) {
      gridApi.setGridOption("loading", true);
    }

    console.log("[Payslip] Fetching data from Supabase...");

    const { data, error } = await supabase
      .from("payslip_generation_report")
      .select("*")
      .order("employee_id", { ascending: true });

    if (error) {
      throw error;
    }

    console.log(
      "[Payslip] Data fetched successfully:",
      data?.length || 0,
      "records"
    );

    // Store the data
    // Store the data
    allEmployeesData = data || [];
    filteredData = [...allEmployeesData];

    // Apply RBAC filtering
    if (currentUser?.user_metadata?.user_type === "Employee") {
      const empId = currentUser.user_metadata.employee_id;
      filteredData = allEmployeesData.filter((emp) => emp.employee_id == empId);
    }

    // Update grid
    if (gridApi) {
      if (typeof gridApi.setGridOption === "function") {
        gridApi.setGridOption("rowData", filteredData);
        gridApi.setGridOption("loading", false);
      } else if (typeof gridApi.setRowData === "function") {
        gridApi.setRowData(filteredData);
      }
    }

    // Update cutoff dropdown if needed
    updateCutoffDropdown();
  } catch (error) {
    console.error("[Payslip] Error fetching payslip data:", error);
    alert(
      "Failed to load payslip data. Please check your connection and try again."
    );

    // Show no rows overlay
    if (gridApi) {
      gridApi.setGridOption("loading", false);
    }
  }
}

// Update cutoff dropdown with available periods
function updateCutoffDropdown() {
  const cutoffPeriod = document.getElementById("cutoffPeriod");
  if (!cutoffPeriod || allEmployeesData.length === 0) return;

  // Get unique cutoff periods from data
  const uniquePeriods = [
    ...new Set(allEmployeesData.map((emp) => emp.cutoff_period)),
  ];

  // Clear existing options except "All Cutoff"
  cutoffPeriod.innerHTML = '<option value="all">All Cutoff</option>';

  // Add unique periods
  uniquePeriods.forEach((period) => {
    const option = document.createElement("option");
    option.value = period;
    option.textContent = period;
    cutoffPeriod.appendChild(option);
  });
}

// Search functionality
const searchInput = document.getElementById("searchInput");
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const searchValue = e.target.value.toLowerCase();

    if (!gridApi) {
      console.warn("[Payslip] gridApi not available for search");
      return;
    }

    try {
      // Apply cutoff filter first
      const cutoffPeriod = document.getElementById("cutoffPeriod");
      const selectedPeriod = cutoffPeriod ? cutoffPeriod.value : "all";

      let dataToSearch = allEmployeesData;
      if (selectedPeriod !== "all") {
        dataToSearch = allEmployeesData.filter(
          (emp) => emp.cutoff_period === selectedPeriod
        );
      }

      // Then apply search filter
      if (searchValue) {
        filteredData = dataToSearch.filter((emp) => {
          const fullName = getFullName(emp).toLowerCase();
          return (
            fullName.includes(searchValue) ||
            emp.employee_id?.toString().toLowerCase().includes(searchValue) ||
            emp.department?.toLowerCase().includes(searchValue) ||
            emp.position?.toLowerCase().includes(searchValue)
          );
        });
      } else {
        filteredData = [...dataToSearch];
      }

      // Update grid
      if (typeof gridApi.setGridOption === "function") {
        gridApi.setGridOption("rowData", filteredData);
      } else if (typeof gridApi.setRowData === "function") {
        gridApi.setRowData(filteredData);
      }
    } catch (error) {
      console.error("[Payslip] Error during search:", error);
    }
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchInput.value = "";
      searchInput.dispatchEvent(new Event("input"));
    }
  });
}

// Cutoff period change
const cutoffPeriod = document.getElementById("cutoffPeriod");
if (cutoffPeriod) {
  cutoffPeriod.addEventListener("change", (e) => {
    const selectedPeriod = e.target.value;

    if (!gridApi) {
      console.warn("[Payslip] gridApi not available");
      return;
    }

    try {
      // Apply cutoff filter
      if (selectedPeriod === "all") {
        filteredData = [...allEmployeesData];
      } else {
        filteredData = allEmployeesData.filter(
          (emp) => emp.cutoff_period === selectedPeriod
        );
      }

      // Also apply search filter if active
      const searchInput = document.getElementById("searchInput");
      const searchValue = searchInput?.value.toLowerCase();
      if (searchValue) {
        filteredData = filteredData.filter((emp) => {
          const fullName = getFullName(emp).toLowerCase();
          return (
            fullName.includes(searchValue) ||
            emp.employee_id?.toString().toLowerCase().includes(searchValue) ||
            emp.department?.toLowerCase().includes(searchValue) ||
            emp.position?.toLowerCase().includes(searchValue)
          );
        });
      }

      // Update grid
      if (typeof gridApi.setGridOption === "function") {
        gridApi.setGridOption("rowData", filteredData);
      } else if (typeof gridApi.setRowData === "function") {
        gridApi.setRowData(filteredData);
      }
    } catch (error) {
      console.error("[Payslip] Error changing cutoff period:", error);
    }
  });
}

// Format date helper
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}

// Safe text update helper
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// Open preview modal with employee data
function openPreviewModal(employee) {
  if (!employee || !employee.employee_id) {
    alert("Invalid employee data for preview!");
    return;
  }

  //Company Details

  const logoUrl = getLogoUrl(companyDetails?.logo_path) || FALLBACK_LOGO_URL;

  // Populate Company Info
  setText("previewCompanyName", companyDetails?.name || "Company Name");
  setText(
    "previewCompanyAddress",
    companyDetails?.company_address || "Company Address"
  );

  const logoContainer = document.getElementById("previewLogoContainer");
  if (logoContainer) {
    if (logoUrl) {
      // Use an actual image tag
      logoContainer.innerHTML = `<img src="${logoUrl}" alt="${
        companyDetails?.name || "Company"
      } Logo" class="w-16 h-16 rounded-full object-cover shadow-lg">`;
    } else {
      // Fallback to text initials
      const initials = (companyDetails?.name || "CN").substring(0, 2);
      logoContainer.innerHTML = `<div class="w-16 h-16 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-lg">${initials}</div>`;
    }
  }

  //End of Company Details

  // Populate modal with employee data
  setText("previewEmpId", employee.employee_id || "");
  setText("previewEmpName", getFullName(employee));
  setText("previewDept", employee.department || "");
  setText("previewPos", employee.position || "");

  // Earnings
  setText("previewRegularPay", formatCurrency(employee.regular_pay || 0));
  setText("previewOT", formatCurrency(employee.overtime_pay || 0));
  setText("previewLeavePay", formatCurrency(employee.leave_pay_amount || 0));

  // Attendance Summary
  setText("previewWorkingHours", formatCurrency(employee.working_hours || 0));
  setText("previewAbsences", formatCurrency(employee.absences_deduction || 0));
  setText(
    "previewTardiness",
    formatCurrency(employee.tardiness_deduction || 0)
  );
  setText(
    "previewUndertime",
    formatCurrency(employee.undertime_deduction || 0)
  );

  // Deductions
  setText("previewSSS", formatCurrency(employee.sss_deduction || 0));
  setText(
    "previewPhilhealth",
    formatCurrency(employee.philhealth_deduction || 0)
  );
  setText("previewPagibig", formatCurrency(employee.pagibig_deduction || 0));
  setText("previewTax", formatCurrency(employee.withholding_tax || 0));

  // Summary
  setText("previewGross", formatCurrency(employee.gross_pay || 0));
  setText("previewDeductions", formatCurrency(employee.total_deductions || 0));
  setText("previewNetPay", formatCurrency(employee.net_pay || 0));

  // Update period and issued date
  setText("previewPeriod", employee.cutoff_period || "");
  setText("previewIssued", formatDate(new Date())); // Use current date as issued date

  // Show modal
  const modal = document.getElementById("previewModal");
  if (modal && modal.showModal) {
    if (!modal.open) modal.showModal();

    const minimizeAndClose = () => {
      modal.classList.add("minimizing");
      setTimeout(() => {
        if (modal.open) modal.close();
      }, 170);
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

// Generate PDF matching preview design - 2 PAYSLIPS PER PAGE
async function generateEmployeesPdf(employees) {
  console.log(
    "[Payslip] generateEmployeesPdf called. Count:",
    employees ? employees.length : "n/a"
  );

  if (!window.jspdf || !window.jspdf.jsPDF) {
    console.error("[Payslip] jsPDF not available.");
    alert("PDF library not loaded. Please check your network connection.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;
  const payslipHeight = (pageHeight - margin * 3) / 2;

  // Add summary header on first page
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Payslip Generation Summary", pageWidth / 2, margin + 10, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Total Payslips: ${employees.length} | Generated: ${formattedDate}`,
    pageWidth / 2,
    margin + 25,
    { align: "center" }
  );

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(1);
  doc.line(margin, margin + 35, pageWidth - margin, margin + 35);

  let currentY = margin + 45;

  employees.forEach((emp, index) => {
    if (index > 0 && index % 2 === 0) {
      doc.addPage();
      currentY = margin;
    } else if (index > 0) {
      currentY += payslipHeight + 10;
    }

    let y = currentY;

    // Header Card Background
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 60, 6, 6, "F");

    // Company Logo/Initials (PDF cannot easily load external images like the Preview, so we use initials)
    const initials = (companyDetails?.name || "CN").substring(0, 2);
    doc.setFillColor(99, 102, 241); // Primary Color
    doc.circle(margin + 18, y + 25, 15, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(initials, margin + 18, y + 28, { align: "center" });

    // Company Info
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    // Use fetched data for company name
    doc.text(companyDetails?.name || "Company Name", margin + 45, y + 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    // Use fetched data for company address
    doc.text(
      companyDetails?.company_address || "Company Address",
      margin + 45,
      y + 32
    );

    // Payslip Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(99, 102, 241);
    doc.text("Payslip", pageWidth / 2, y + 28, { align: "center" });

    // Dates
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text("SALARY STATEMENT", pageWidth - margin - 5, y + 14, {
      align: "right",
    });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text(emp.cutoff_period || "", pageWidth - margin - 5, y + 23, {
      align: "right",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text("DATE ISSUED", pageWidth - margin - 5, y + 35, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text(formattedDate, pageWidth - margin - 5, y + 44, { align: "right" });

    y += 70;

    // Employee Info Card
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 38, 4, 4, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text("Employee ID:", margin + 10, y + 13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(emp.employee_id?.toString() || "", margin + 70, y + 13);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("Department:", pageWidth / 2 + 10, y + 13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(emp.department || "", pageWidth / 2 + 60, y + 13);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("Employee Name:", margin + 10, y + 28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(getFullName(emp), margin + 70, y + 28);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("Position:", pageWidth / 2 + 10, y + 28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(emp.position || "", pageWidth / 2 + 60, y + 28);

    y += 48;

    // Two Column Layout
    const colWidth = (pageWidth - margin * 2 - 20) / 2;
    const col1X = margin;
    const col2X = margin + colWidth + 20;

    function drawCard(x, yPos, width, title, items) {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.8);
      doc.roundedRect(x, yPos, width, 18 + items.length * 13 + 10, 4, 4, "S");

      doc.setFillColor(248, 248, 248);
      doc.roundedRect(x, yPos, width, 18, 4, 4, "F");
      doc.setDrawColor(200, 200, 200);
      doc.line(x + 4, yPos + 18, x + width - 4, yPos + 18);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(title, x + 8, yPos + 12);

      let itemY = yPos + 28;
      items.forEach((item) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(item.label, x + 8, itemY);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(item.value, x + width - 8, itemY, { align: "right" });

        itemY += 13;
      });

      return yPos + 18 + items.length * 13 + 10;
    }

    // Gross Earnings
    const grossItems = [
      { label: "Regular Pay", value: formatCurrency(emp.regular_pay || 0) },
      { label: "OT", value: formatCurrency(emp.overtime_pay || 0) },
      { label: "Leave Pay", value: formatCurrency(emp.leave_pay_amount || 0) },
    ];
    const grossEndY = drawCard(
      col1X,
      y,
      colWidth,
      "Gross Earnings",
      grossItems
    );

    // Attendance Summary
    const attendanceItems = [
      { label: "Working Hours", value: formatCurrency(emp.working_hours || 0) },
      { label: "Absences", value: formatCurrency(emp.absences_deduction || 0) },
      {
        label: "Tardiness",
        value: formatCurrency(emp.tardiness_deduction || 0),
      },
      {
        label: "Undertime",
        value: formatCurrency(emp.undertime_deduction || 0),
      },
    ];
    drawCard(
      col1X,
      grossEndY + 10,
      colWidth,
      "Attendance Summary",
      attendanceItems
    );

    // Gov. Contributions
    const contribItems = [
      {
        label: "SSS Contribution",
        value: formatCurrency(emp.sss_deduction || 0),
      },
      {
        label: "PhilHealth",
        value: formatCurrency(emp.philhealth_deduction || 0),
      },
      { label: "Pag-ibig", value: formatCurrency(emp.pagibig_deduction || 0) },
      {
        label: "Withholding Tax",
        value: formatCurrency(emp.withholding_tax || 0),
      },
    ];

    const contribStartY = y;
    const contribEndY = contribStartY + 18 + contribItems.length * 13 + 10;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.8);
    doc.roundedRect(
      col2X,
      contribStartY,
      colWidth,
      contribEndY - contribStartY + 45,
      4,
      4,
      "S"
    );

    doc.setFillColor(248, 248, 248);
    doc.roundedRect(col2X, contribStartY, colWidth, 18, 4, 4, "F");
    doc.setDrawColor(200, 200, 200);
    doc.line(
      col2X + 4,
      contribStartY + 18,
      col2X + colWidth - 4,
      contribStartY + 18
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text("Gov. Contributions", col2X + 8, contribStartY + 12);

    let contribY = contribStartY + 28;
    contribItems.forEach((item) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(item.label, col2X + 8, contribY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(item.value, col2X + colWidth - 8, contribY, { align: "right" });

      contribY += 13;
    });

    contribY += 3;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1.5);
    doc.line(col2X + 8, contribY, col2X + colWidth - 8, contribY);
    contribY += 13;

    const summaryItems = [
      { label: "Gross Earnings", value: formatCurrency(emp.gross_pay || 0) },
      {
        label: "Total Deductions",
        value: formatCurrency(emp.total_deductions || 0),
      },
    ];

    summaryItems.forEach((item) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(item.label, col2X + 8, contribY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(item.value, col2X + colWidth - 8, contribY, { align: "right" });

      contribY += 13;
    });

    y =
      Math.max(
        grossEndY + 10 + 18 + attendanceItems.length * 13 + 10,
        contribEndY + 45
      ) + 12;

    // Net Pay Card
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(134, 239, 172);
    doc.setLineWidth(1.5);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 4, 4, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("Net Pay", margin + 10, y + 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74);
    doc.text(
      formatCurrency(emp.net_pay || 0),
      pageWidth - margin - 10,
      y + 18,
      { align: "right" }
    );

    y += 38;

    // Signature Section
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 42, 4, 4, "F");

    const sigColWidth = (pageWidth - margin * 2 - 30) / 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text("Received By:", margin + 10, y + 14);

    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(1);
    doc.line(margin + 10, y + 30, margin + 10 + sigColWidth - 15, y + 30);

    doc.setFontSize(6);
    doc.text(
      "Signature over Printed Name",
      margin + 10 + (sigColWidth - 15) / 2,
      y + 36,
      { align: "center" }
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text("Date Received:", pageWidth / 2 + 20, y + 14);

    doc.line(
      pageWidth / 2 + 20,
      y + 30,
      pageWidth / 2 + 20 + sigColWidth - 15,
      y + 30
    );

    doc.setFontSize(6);
    doc.text(
      "MM / DD / YYYY",
      pageWidth / 2 + 20 + (sigColWidth - 15) / 2,
      y + 36,
      { align: "center" }
    );

    if (index < employees.length - 1 && (index + 1) % 2 !== 0) {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(1);
      doc.setLineDash([3, 3]);
      doc.line(
        margin,
        currentY + payslipHeight + 5,
        pageWidth - margin,
        currentY + payslipHeight + 5
      );
      doc.setLineDash([]);
    }
  });

  try {
    doc.save("payslips.pdf");
    console.log("[Payslip] PDF saved successfully.");

    // Log to Audit Trail
    try {
      const { supabaseClient } = await import("../supabase/supabaseClient.js");
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      // Build description based on number of employees
      let description = "";
      if (employees.length === 1) {
        description = `Generated payslip for Employee ID ${employees[0].employee_id}`;
      } else if (employees.length === 2) {
        description = `Generated payslips for Employee IDs ${employees[0].employee_id} and ${employees[1].employee_id}`;
      } else {
        description = `Generated ${employees.length} payslips`;
      }

      await supabaseClient.from("audit_trail").insert({
        user_id: user?.id,
        action: "view",
        description: description,
        module_affected: "Payslip Generation",
        record_id: null,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error("Error logging audit trail:", auditError);
      // Don't throw error - PDF generation was successful
    }
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
      console.warn("[Payslip] gridApi is not set.");
    }
    const hasSelectionApi =
      gridApi && typeof gridApi.getSelectedRows === "function";
    const selected = hasSelectionApi ? gridApi.getSelectedRows() || [] : [];
    console.log("[Payslip] Selected rows count:", selected.length);

    if (currentUser?.user_metadata?.user_type === "Employee") {
      if (!selected || selected.length === 0) {
        alert("Please select at least one payslip to download.");
        return;
      }

      generateEmployeesPdf(selected);
      return;
    }

    // For Admin/Payroll Staff
    if (!selected || selected.length === 0) {
      alert("Please select at least one employee to generate a PDF.");
      return;
    }

    try {
      generateEmployeesPdf(selected);
    } catch (e) {
      console.error("[Payslip] Error during PDF generation:", e);
      alert("PDF generation failed. See console for details.");
    }
  });
}

// Window resize handler
window.addEventListener("resize", () => {
  if (gridApi && gridApi.sizeColumnsToFit) {
    gridApi.sizeColumnsToFit();
  }
});

// Global error logging
window.addEventListener("error", (e) => {
  console.error("[Payslip] Global error:", e.message, e.error);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("[Payslip] Unhandled promise rejection:", e.reason);
});

// Initialize data on page load
document.addEventListener("DOMContentLoaded", async () => {
  currentUser = await getCurrentUser();
  await fetchCompanyDetails();
  applyRBAC(currentUser);
  fetchPayslipData();
});

// Also fetch data immediately if DOM is already loaded
if (document.readyState === "loading") {
  // DOM is still loading, event listener above will handle it
} else {
  // DOM is already loaded
  console.log("[Payslip] DOM already loaded, fetching data...");
  await fetchCompanyDetails();
  fetchPayslipData();
}
