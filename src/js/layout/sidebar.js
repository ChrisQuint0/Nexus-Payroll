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

async function getUserInfo() {
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

    return {
      firstName: user.user_metadata?.first_name || "",
      lastName: user.user_metadata?.last_name || "",
      userType: user.user_metadata?.user_type || "User",
    };
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
}

function displayUserInfo(userInfo) {
  const userFullNameEl = document.getElementById("userFullName");
  const userTypeEl = document.getElementById("userType");

  if (userFullNameEl && userTypeEl && userInfo) {
    const fullName = `${userInfo.firstName} ${userInfo.lastName}`.trim();
    userFullNameEl.textContent = fullName || "Unknown User";
    userTypeEl.textContent = userInfo.userType;
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

function showSidebar() {
  const sidebarContent = document.getElementById("sidebarContent");
  if (sidebarContent) {
    // Add smooth fade-in transition
    sidebarContent.style.transition = "opacity 0.3s ease-in-out";
    sidebarContent.classList.remove("opacity-0");
    sidebarContent.classList.add("opacity-100");
  }
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
    window.location.href = "../pages/index.html";
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

      // Get user info
      const userInfo = await getUserInfo();

      if (userInfo) {
        // Display user info at the top
        displayUserInfo(userInfo);

        // Filter sidebar based on user type
        filterSidebarByUserType(userInfo.userType);
      } else {
        console.warn("No user info found. User may not be logged in.");
        // Optionally redirect to login
        // window.location.href = "../pages/login.html";
      }

      // Highlight the active link
      highlightActiveSidebarLink();

      // Setup logout button event listener
      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
      }

      // NOW show the sidebar after everything is ready
      showSidebar();
    } catch (error) {
      console.error("Failed to load sidebar:", error);
      // Show sidebar even if there's an error so page isn't stuck
      showSidebar();
    }
  }
});
