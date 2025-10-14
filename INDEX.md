## Nexus Payroll - Project Index

### Overview

- Frontend: HTML + TailwindCSS (via PostCSS) + DaisyUI
- Build: `postcss` pipeline to compile `src/input.css` -> `src/output.css`
- Modules map 1:1 across `src/pages` (HTML) and `src/js/<module>/main.js`

### Scripts (package.json)

- `build:css`: postcss src/input.css -o src/output.css
- `watch:css`: postcss src/input.css -o src/output.css --watch

### Key Paths

- `src/assets/`: SVG icons used across UI
- `src/components/sidebar.html`: Sidebar markup
- `src/input.css` -> processed to `src/output.css`
- `src/theme-icons.css`: Additional theme/icon styles

### Pages (src/pages)

- `dashboard.html`
- `attendance_management.html`
- `employee-info.html`
- `leave_management.html`
- `payroll-computation.html`
- `payslip-generation.html`
- `reports.html`
- `settings.html`
- `time-in-out.html`
- `login.html`

### JavaScript Modules (src/js)

- `dashboard/main.js`: Dashboard logic
- `attendance-management/main.js`: Attendance processing
- `employee-info/main.js`: Employee records
- `leave-management/main.js`: Leave workflows
- `payroll-computation/main.js`: Payroll calculations
- `payslip-generation/main.js`: Payslip creation
- `reports/main.js`: Reporting/analytics
- `settings/main.js`: App settings
- `layout/sidebar.js`: Sidebar behavior
- `supabase/`: Backend/data access (empty scaffold)
- `time-in-out/`: Time logging (empty scaffold)
- `utils/`: Shared utilities (empty scaffold)

### Development Notes

- Run CSS build: `npm run build:css`
- Watch CSS changes: `npm run watch:css`
- Tailwind v4 + DaisyUI v5 configured via PostCSS (`postcss.config.cjs`)

### Documentation

- `README.md`: Module responsibilities, assignments, and tech stack
