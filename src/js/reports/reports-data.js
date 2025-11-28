import { supabaseClient } from "../supabase/supabaseClient.js";

async function getAuditTrailData() {
  try {
    // Fetch audit trail data
    const { data: auditData, error: auditError } = await supabaseClient
      .from("audit_trail")
      .select("*")
      .order("timestamp", { ascending: false });

    if (auditError) throw auditError;

    /* // Get unique user IDs
    const userIds = [
      ...new Set(auditData.map((record) => record.user_id).filter(Boolean)),
    ];

    // Fetch user data separately
    const { data: userData, error: userError } = await supabaseClient
      .from("employees") // or whatever your users table is called
      .select("emp_id, first_name, last_name")
      .in("emp_id", userIds);

    if (userError) throw userError;

    // Create a user lookup map
    const userMap = {};
    userData?.forEach((user) => {
      userMap[user.emp_id] = `${user.last_name}, ${user.first_name}`;
    }); */

    // Transform the data to match the required shape
    return auditData.map((record) => {
      // Get the user name from the map
      /*  const userName = userMap[record.user_id] || "Unknown User"; */
      const userName = "Unknown User";

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
