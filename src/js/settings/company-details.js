import { supabaseClient } from "../supabase/supabaseClient.js";
const supabase = supabaseClient;

// Element references
const form = document.getElementById("companyDetailsForm");
const companyIdInput = document.getElementById("companyId");
const companyNameInput = document.getElementById("companyName");
const companyAddressInput = document.getElementById("companyAddress");
const currentLogoImg = document.getElementById("currentLogo");
const logoUploadInput = document.getElementById("logoUpload");
const saveButton = document.getElementById("saveDetailsBtn");
const saveButtonText = document.getElementById("saveDetailsBtnText");
const loadingSpinner = document.getElementById("loadingSpinner");

// Configuration constants
const COMPANY_BUCKET = "company_logo";
const LOGO_FILENAME = "npayroll_logo.png"; // Enforce the required flat file name
const FALLBACK_LOGO_URL =
  "https://placehold.co/100x100/9b97ef/FFFFFF/png?text=CN";

let initialLogoPath = null; // Stores the path of the existing logo

/**
 * Generates the public URL for the logo with a cache-busting timestamp.
 * * FIX: Appends Date.now() to the URL to force the browser to reload the image,
 * bypassing aggressive caching after a file is overwritten in Supabase Storage.
 * * @param {string} path - The logo file path.
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

      // Return the URL with the unique timestamp
      return `${data.publicUrl}${separator}v=${cacheBuster}`;
    }
    return null;
  } catch (e) {
    console.warn("Could not generate logo URL:", e);
    return null;
  }
}

/**
 * Fetches company details and populates the form fields.
 */
async function fetchAndPopulateDetails() {
  try {
    // Fetch the single company record
    const { data, error } = await supabase
      .from("company_details")
      .select("id, name, logo_path, company_address")
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 means 'no rows found'

    if (!data || error?.code === "PGRST116") {
      console.warn("No company details found. Assuming new record.");
      companyIdInput.value = ""; // Leave blank for a true insert
      currentLogoImg.src = FALLBACK_LOGO_URL;
      return;
    }

    // Populate form fields
    companyIdInput.value = data.id;
    companyNameInput.value = data.name;
    companyAddressInput.value = data.company_address;
    initialLogoPath = data.logo_path;

    // Populate the current logo image
    const logoUrl = getLogoUrl(data.logo_path);
    currentLogoImg.src = logoUrl || FALLBACK_LOGO_URL;
  } catch (error) {
    console.error("Error fetching company details:", error);
    alert(
      "Failed to load company details. Check RLS policy on 'company_details'."
    );
  }
}

/**
 * Handles the form submission to update details.
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  // Disable button and show spinner immediately
  saveButton.disabled = true;
  saveButtonText.classList.add("hidden");
  loadingSpinner.classList.remove("hidden");

  const newFile = logoUploadInput.files[0];
  let newLogoPath = initialLogoPath;

  try {
    // 1. --- LOGO UPLOAD/REPLACEMENT LOGIC ---
    if (newFile) {
      if (newFile.type !== "image/png") {
        throw new Error("Only PNG files are allowed for the logo.");
      }

      // A. UPLOAD the new file (This overwrites if the file exists, hence replacing)
      // Use 'upsert: true' to ensure the file is replaced if it already exists
      const { error: uploadError } = await supabase.storage
        .from(COMPANY_BUCKET)
        .upload(LOGO_FILENAME, newFile, {
          cacheControl: "3600",
          upsert: true, // This is key to replacement
        });

      if (uploadError) {
        throw new Error("Logo upload failed: " + uploadError.message);
      }

      // The new path is the fixed filename
      newLogoPath = LOGO_FILENAME;

      // B. DELETE the old file (Optional: Only necessary if Supabase changes its default overwrite behavior)
      // Since we enforce a single filename, the 'upload' with upsert: true handles the replacement.
      // If you had a dynamic filename structure, you would use:
      // if (initialLogoPath && initialLogoPath !== newLogoPath) {
      //     await supabase.storage.from(COMPANY_BUCKET).remove([initialLogoPath]);
      // }
    }

    // 2. --- DATABASE UPSERT LOGIC ---
    const companyData = {
      name: companyNameInput.value,
      company_address: companyAddressInput.value,
      logo_path: newLogoPath,
    };

    // If an ID exists, include it for the UPDATE part of the UPSERT
    if (companyIdInput.value) {
      companyData.id = companyIdInput.value;
    }

    // Use upsert to handle both insert (if no ID) and update (if ID exists)
    const { data: dbData, error: dbError } = await supabase
      .from("company_details")
      .upsert([companyData])
      .select("id")
      .single();

    if (dbError) {
      throw new Error("Database update failed: " + dbError.message);
    }

    // 3. --- SUCCESS & CLEANUP ---
    alert("Company details updated successfully!");

    // Update the form ID if this was an initial INSERT
    if (dbData && !companyIdInput.value) {
      companyIdInput.value = dbData.id;
    }

    // Update the initial state and clear file input
    initialLogoPath = newLogoPath;

    // Add this line to check the URL being generated!
    const newLogoUrl = getLogoUrl(newLogoPath) || FALLBACK_LOGO_URL;
    console.log("New Logo URL with Cache Buster:", newLogoUrl);

    currentLogoImg.src = newLogoUrl; // Use the generated URL
    logoUploadInput.value = "";
  } catch (error) {
    console.error("Save failed:", error);
    alert("Failed to save changes: " + error.message);
  } finally {
    // Re-enable button
    saveButton.disabled = false;
    saveButtonText.classList.remove("hidden");
    loadingSpinner.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Check if the form elements exist on the page before running logic
  if (form) {
    fetchAndPopulateDetails();
    form.addEventListener("submit", handleFormSubmit);
  }
});
