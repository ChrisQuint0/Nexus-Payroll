// js/layout/sidebar.js
import { supabaseClient } from "../supabase/supabaseClient.js";

// Define module access by user type
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

async function getUserType() {
  try {
    // Get the current logged-in user
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser();

    if (error || !user) {
      console.error("Error getting user:", error);
      return null;
    }

    // Get user type from metadata
    const userType = user.user_metadata?.user_type;
    return userType || null;
  } catch (error) {
    console.error("Error fetching user type:", error);
    return null;
  }
}

function filterSidebarByUserType(userType) {
  if (!userType || !MODULE_ACCESS[userType]) {
    console.warn("Invalid user type or no access defined");
    return;
  }

  const allowedModules = MODULE_ACCESS[userType];
  const menuItems = document.querySelectorAll(".menu > li");

  menuItems.forEach((li) => {
    const link = li.querySelector("a");
    if (!link) return;

    const href = link.getAttribute("href");
    const fileName = href ? href.split("/").pop() : "";

    // Check if this module is allowed for the user type
    const isAllowed = allowedModules.includes(fileName);

    if (isAllowed) {
      li.style.display = ""; // Show
    } else {
      li.style.display = "none"; // Hide
    }
  });
}

function highlightActiveSidebarLink() {
  const links = document.querySelectorAll(".menu a");
  const currentPath = window.location.pathname.split("/").pop();

  links.forEach((link) => {
    const icon = link.querySelector("img");

    if (link.getAttribute("href").includes(currentPath)) {
      // Highlight active link
      link.classList.add(
        "bg-primary",
        "text-white",
        "font-medium",
        "rounded-lg"
      );

      // Make SVG icon white (invert colors)
      if (icon) icon.classList.add("invert", "brightness-0");
    } else {
      // Remove highlight
      link.classList.remove(
        "bg-primary",
        "text-white",
        "font-medium",
        "rounded-lg"
      );

      // Reset icon color
      if (icon) icon.classList.remove("invert", "brightness-0");
    }
  });
}

async function handleLogout(e) {
  e.preventDefault();

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) throw error;

    // Redirect to login page after successful logout
    window.location.href = "../pages/login.html";
  } catch (error) {
    console.error("Logout error:", error);
    alert("Failed to logout: " + error.message);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const sidebarContainer = document.getElementById("sidebar");

  if (sidebarContainer) {
    try {
      // Load sidebar HTML
      const response = await fetch("../components/sidebar.html");
      const sidebarHTML = await response.text();
      sidebarContainer.innerHTML = sidebarHTML;

      // Get user type and filter sidebar
      const userType = await getUserType();

      if (userType) {
        filterSidebarByUserType(userType);
      } else {
        console.warn("No user type found. User may not be logged in.");
        // Optionally redirect to login
        // window.location.href = "../pages/login.html";
      }

      // Highlight the active link after the sidebar has loaded
      highlightActiveSidebarLink();

      // Setup logout button event listener
      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
      }
    } catch (error) {
      console.error("Failed to load sidebar:", error);
    }
  }
});
