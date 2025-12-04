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
    // Note: Assuming 'supabase' is accessible in this file's scope
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
