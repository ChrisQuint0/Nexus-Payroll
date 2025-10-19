import { supabaseAdmin } from "../supabase/adminClient.js";
import { supabaseClient } from "../supabase/supabaseClient.js";
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
    width: 150,
    editable: true,
    cellEditor: "agSelectCellEditor",
    cellEditorParams: {
      values: ["active", "inactive"],
    },
    cellStyle: (params) => ({
      color: params.value === "active" ? "#38B000" : "gray",
      fontWeight: "500",
    }),
  },
  {
    headerName: "Actions",
    field: "actions",
    cellRenderer: function (params) {
      const email = params.data.email;
      // The openResetModal is defined in reset-password.js and attached to window
      return `
        <button class="btn btn-sm btn-primary" onclick="openResetModal('${email}')">Reset</button>
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
    headerName: "Email",
    field: "email",
    sortable: true,
    flex: 1.5,
    editable: true,
  },
  {
    headerName: "Created At",
    field: "created_at",
    sortable: true,
    width: 180,
  },
  {
    headerName: "Updated At",
    field: "updated_at",
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
    const email = event.data.email;
    const newValue = event.value;
    const oldValue = event.oldValue;

    if (!email || newValue === oldValue) return;

    try {
      let updateObject = {};
      let alertMessage = "";

      if (field === "status") {
        updateObject = {
          status: newValue,
          updated_at: new Date().toISOString(),
        };
        alertMessage = `Status for ${event.data.username} updated to "${newValue}"`;
      } else if (field === "username") {
        updateObject = {
          username: newValue,
          updated_at: new Date().toISOString(),
        };
        alertMessage = `Username updated to "${newValue}"`;
      } else if (field === "email") {
        updateObject = {
          email: newValue,
          updated_at: new Date().toISOString(),
        };
        alertMessage = `Email updated to "${newValue}"`;
      } else {
        return; // Not a field we update
      }

      // Update in the database. Use oldValue for email update to correctly target the row.
      const identifier = field === "email" ? oldValue : email;
      const identifierColumn = field === "email" ? "email" : "email";

      const { error } = await supabaseAdmin
        .from("users")
        .update(updateObject)
        .eq(identifierColumn, identifier);

      if (error) throw error;

      // Update the updated_at column in the grid for the current row
      event.data.updated_at = new Date().toLocaleString();

      event.api.refreshCells({
        rowNodes: [event.node],
        columns: ["updated_at"],
        force: true,
      });

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

// Fetch users from Supabase
export async function fetchUsers() {
  try {
    const { data, error } = await supabaseClient
      .from("users")
      .select("username, email, status, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Format and map data
    const users = data.map((user) => ({
      username: user.username,
      email: user.email,
      status: user.status || "inactive",
      created_at: new Date(user.created_at).toLocaleString(),
      updated_at: user.updated_at
        ? new Date(user.updated_at).toLocaleString()
        : "-",
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
