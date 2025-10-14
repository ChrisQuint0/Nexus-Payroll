// js/layout/sidebar.js

document.addEventListener("DOMContentLoaded", async () => {
  const sidebarContainer = document.getElementById("sidebar");

  if (sidebarContainer) {
    try {
      const response = await fetch("../components/sidebar.html");
      const sidebarHTML = await response.text();
      sidebarContainer.innerHTML = sidebarHTML;

      // Highlight the active link after the sidebar has loaded
      highlightActiveSidebarLink();
    } catch (error) {
      console.error("Failed to load sidebar:", error);
    }
  }
});

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
