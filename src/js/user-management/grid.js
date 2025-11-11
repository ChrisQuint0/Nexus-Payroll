import { supabaseAdmin } from "../supabase/adminClient.js";
import { showGlobalAlert } from "../utils/alerts.js";

const gridDiv = document.getElementById("usersGrid");

// Determine user theme preference
const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
gridDiv.classList.add(isDarkMode ? "ag-theme-quartz-dark" : "ag-theme-quartz");
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    gridDiv.classList.toggle("ag-theme-quartz-dark", e.matches);
    gridDiv.classList.toggle("ag-theme-quartz", !e.matches);
  });

// Define columns
const columnDefs = [
  {
    headerName: "Status",
    field: "status",
    sortable: true,
    width: 120,
    editable: true,
    cellEditor: "agSelectCellEditor",
    cellEditorParams: {
      values: ["active", "inactive"],
    },
    cellStyle: (params) => ({
      color: params.value === "active" ? "#38B000" : "#9CA3AF",
      fontWeight: "500",
      textTransform: "capitalize",
    }),
  },
  {
    headerName: "Actions",
    field: "actions",
    cellRenderer: function (params) {
      const userId = params.data.id;
      return `
        <button class="btn btn-sm btn-primary" onclick="openResetModal('${userId}')">Reset</button>
      `;
    },
    width: 100,
    sortable: false,
    filter: false,
  },
  {
    headerName: "Username",
    field: "username",
    sortable: true,
    flex: 1,
    editable: true,
  },
  {
    headerName: "First Name",
    field: "first_name",
    sortable: true,
    flex: 1,
    editable: true,
  },
  {
    headerName: "Last Name",
    field: "last_name",
    sortable: true,
    flex: 1,
    editable: true,
  },
  {
    headerName: "User Type",
    field: "user_type",
    sortable: true,
    width: 150,
    editable: true,
    cellEditor: "agSelectCellEditor",
    cellEditorParams: {
      values: ["Admin", "Payroll Staff", "Employee"],
    },
    cellStyle: {
      fontWeight: "500",
    },
  },
  {
    headerName: "Employee ID",
    field: "employee_id",
    sortable: true,
    width: 130,
    editable: true,
    cellStyle: {
      fontWeight: "500",
    },
    valueGetter: (params) => {
      // Only show Employee ID for Employee user type
      return params.data.user_type === "Employee"
        ? params.data.employee_id || "-"
        : "-";
    },
  },
  {
    headerName: "Email",
    field: "email",
    sortable: true,
    flex: 1.5,
    editable: false, // Email changes are more complex with auth
  },
  {
    headerName: "Created At",
    field: "created_at",
    sortable: true,
    width: 180,
  },
  {
    headerName: "Last Sign In",
    field: "last_sign_in",
    sortable: true,
    width: 180,
  },
];

// Grid options
const gridOptions = {
  columnDefs,
  rowData: [],
  rowSelection: "multiple",
  animateRows: true,
  defaultColDef: {
    filter: true,
    sortable: true,
    resizable: true,
  },
  pagination: true,
  paginationPageSize: 5,
  suppressRowClickSelection: true,

  onCellEditingStopped: async (event) => {
    const field = event.colDef.field;
    const userId = event.data.id;
    const newValue = event.value;
    const oldValue = event.oldValue;

    if (!userId || newValue === oldValue) return;

    try {
      let alertMessage = "";

      if (
        field === "username" ||
        field === "first_name" ||
        field === "last_name" ||
        field === "user_type" ||
        field === "status" ||
        field === "employee_id"
      ) {
        // Special validation for employee_id
        if (field === "employee_id") {
          // Only allow editing if user type is Employee
          if (event.data.user_type !== "Employee") {
            showGlobalAlert(
              "error",
              "Employee ID can only be set for Employee user type"
            );
            event.data[field] = oldValue;
            event.api.refreshCells({
              rowNodes: [event.node],
              columns: [field],
              force: true,
            });
            return;
          }

          // Validate that it's a positive number
          if (isNaN(newValue) || parseInt(newValue) <= 0) {
            showGlobalAlert(
              "error",
              "Employee ID must be a valid positive number"
            );
            event.data[field] = oldValue;
            event.api.refreshCells({
              rowNodes: [event.node],
              columns: [field],
              force: true,
            });
            return;
          }

          // Check if Employee ID already exists
          const { data: existingUsers, error: checkError } =
            await supabaseAdmin.auth.admin.listUsers();

          if (checkError) throw checkError;

          const employeeIdExists = existingUsers.users.some(
            (user) =>
              user.id !== userId && user.user_metadata?.employee_id === newValue
          );

          if (employeeIdExists) {
            showGlobalAlert(
              "error",
              "Employee ID already exists. Please use a unique ID."
            );
            event.data[field] = oldValue;
            event.api.refreshCells({
              rowNodes: [event.node],
              columns: [field],
              force: true,
            });
            return;
          }
        }

        // Update user metadata
        const metadataKey = field;
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            user_metadata: { [metadataKey]: newValue },
          }
        );

        if (error) throw error;

        const fieldLabel = field.replace(/_/g, " ");
        alertMessage = `${
          fieldLabel.charAt(0).toUpperCase() + fieldLabel.slice(1)
        } updated to "${newValue}"`;
      } else {
        return; // Not a field we update
      }

      showGlobalAlert("success", alertMessage);
    } catch (err) {
      console.error(`Error updating ${field}:`, err);

      // Revert the cell value
      event.data[field] = oldValue;
      event.api.refreshCells({
        rowNodes: [event.node],
        columns: [field],
        force: true,
      });

      showGlobalAlert("error", `Failed to update ${field}: ${err.message}`);
    }
  },
};

// Initialize AG Grid
const gridApi = agGrid.createGrid(gridDiv, gridOptions);

// Fetch users from Supabase Auth
export async function fetchUsers() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) throw error;

    // Format and map data
    const users = data.users.map((user) => ({
      id: user.id,
      username: user.user_metadata?.username || "-",
      first_name: user.user_metadata?.first_name || "-",
      last_name: user.user_metadata?.last_name || "-",
      user_type: user.user_metadata?.user_type || "-",
      employee_id: user.user_metadata?.employee_id || "-",
      status: user.user_metadata?.status || "inactive",
      email: user.email,
      created_at: new Date(user.created_at).toLocaleString(),
      last_sign_in: user.last_sign_in_at
        ? new Date(user.last_sign_in_at).toLocaleString()
        : "Never",
    }));

    gridApi.setGridOption("rowData", users);
  } catch (err) {
    console.error("Error fetching users:", err);
    showGlobalAlert("error", "Failed to load users");
  }
}

document.addEventListener("DOMContentLoaded", fetchUsers);

// Make gridApi globally accessible for CSV export
window.gridApi = gridApi;

// Search functionality
const searchBar = document.getElementById("searchBar");
searchBar.addEventListener("input", (e) => {
  const searchValue = e.target.value.toLowerCase();
  gridApi.setGridOption("quickFilterText", searchValue);
});
