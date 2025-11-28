import { supabaseClient } from "../supabase/supabaseClient.js";
import { supabaseAdmin } from "../supabase/adminClient.js";

async function getAuditTrailData() {
  try {
    // Fetch audit trail data
    const { data: auditData, error: auditError } = await supabaseClient
      .from("audit_trail")
      .select("*")
      .order("timestamp", { ascending: false });

    if (auditError) throw auditError;

    // Get all unique user IDs from audit trail
    const userIds = [...new Set(auditData.map((record) => record.user_id))];

    // Fetch all users from Supabase Auth using Admin API
    const { data: usersData, error: usersError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error("Error fetching users:", usersError);
    }

    // Create a map of user_id to display name
    const userMap = {};
    if (usersData && usersData.users) {
      usersData.users.forEach((user) => {
        // Try to get display name from user_metadata, fallback to email
        const displayName =
          user.user_metadata?.first_name && user.user_metadata?.last_name
            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
            : user.user_metadata?.username || user.email || "Unknown User";

        userMap[user.id] = displayName;
      });
    }

    // Transform the data to match the required shape
    return auditData.map((record) => {
      // Get the user name from the map
      const userName = userMap[record.user_id] || "Unknown User";

      // Format the timestamp to YYYY-MM-DD HH:MM:SS
      const date = new Date(record.timestamp);
      const formattedTime = date.toISOString().slice(0, 19).replace("T", " ");

      return {
        Name: userName,
        Action: record.action.charAt(0).toUpperCase() + record.action.slice(1),
        Description: record.description,
        Module_Affected: record.module_affected,
        RecordID: record.audit_id,
        UserAgent: record.user_agent,
        Time: formattedTime,
      };
    });
  } catch (error) {
    console.error("Error fetching audit trail data:", error);
    throw error;
  }
}

// Export for use in other files
export { getAuditTrailData };
