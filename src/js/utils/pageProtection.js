// js/utils/pageProtection.js
import { supabaseClient } from "../supabase/supabaseClient.js";

const MODULE_ACCESS = {
  Admin: [
    "time-in-out.html",
    "dashboard.html",
    "employee-info.html",
    "attendance_management.html",
    "payroll-computation.html",
    "payslip-generation.html",
    "leave_management.html",
    "reports.html",
    "user_management.html",
    "face_enrollment.html",
    "settings.html",
  ],
  "Payroll Staff": [
    "time-in-out.html",
    "dashboard.html",
    "employee-info.html",
    "attendance_management.html",
    "payroll-computation.html",
    "payslip-generation.html",
    "leave_management.html",
    "reports.html",
  ],
  Employee: ["time-in-out.html", "dashboard.html", "payslip-generation.html"],
};

export async function checkPageAccess() {
  try {
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser();

    if (error || !user) {
      // Not logged in - redirect to login
      window.location.href = "../pages/index.html";
      return false;
    }

    const userType = user.user_metadata?.user_type;
    const currentPage = window.location.pathname.split("/").pop();

    if (!userType || !MODULE_ACCESS[userType]) {
      console.error("Invalid user type");
      window.location.href = "../pages/dashboard.html";
      return false;
    }

    const allowedModules = MODULE_ACCESS[userType];

    if (!allowedModules.includes(currentPage)) {
      // User doesn't have access to this page
      alert("You don't have permission to access this page.");
      window.location.href = "../pages/dashboard.html";
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking page access:", error);
    window.location.href = "../pages/index.html";
    return false;
  }
}
