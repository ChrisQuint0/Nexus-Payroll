# Nexus Payroll - Project Documentation

## 1. Project Overview

**Nexus Payroll** is a comprehensive, end-to-end payroll management system designed to automate and streamline the entire payroll process from employee time tracking to payslip generation. The system minimizes manual intervention by integrating advanced technologies such as facial recognition for time logging, automated attendance processing, and intelligent payroll computation with compliance to Philippine government regulations.

The system serves as a centralized platform for Human Resources and Payroll departments, providing real-time visibility into employee attendance, leave management, payroll calculations, and comprehensive reporting. It ensures accuracy in salary computations while maintaining compliance with statutory requirements including SSS (Social Security System), PhilHealth, Pag-IBIG, and Withholding Tax contributions.

Built with a modular architecture, Nexus Payroll consists of six core modules that work seamlessly together to provide a complete payroll solution. Each module is designed to handle specific aspects of the payroll workflow, from initial employee onboarding to final payslip distribution, ensuring data integrity and operational efficiency throughout the process.

---

## 2. Features

### 2.1 Time In/Out Management

- **Facial Recognition Time Logging**: Advanced face recognition technology using face-api.js library for secure and contactless employee identification
- **Multiple Authentication Methods**:
  - Primary: Facial recognition with real-time camera feed
  - Alternative: QR code scanning capability
  - Fallback: Employee ID manual input
- **Real-time Face Detection**: WebGL-accelerated face detection and recognition using SSD MobileNet v1, Face Landmark 68, and Face Recognition models
- **Automatic Time Logging**: Intelligent system that automatically records time-in and time-out based on employee presence
- **Face Enrollment System**: Dedicated module for enrolling new employees' facial data into the system
- **Confirmation Overlays**: Visual confirmation displays showing employee name, ID, action (TIME IN/OUT), and timestamp

### 2.2 Employee Information & Records Management

- **Comprehensive Employee Database**: Centralized repository for all employee information
- **Personal Information Management**:
  - Employee ID, full name, contact details, address
  - Profile management and updates
- **Employment Details Tracking**:
  - Position and department assignments
  - Hire date and employment status
  - Official time schedules
- **Salary Structure Management**:
  - Hourly and daily rate configurations
  - Salary type definitions
- **Government Contribution Tracking**:
  - SSS (Social Security System) information
  - PhilHealth membership details
  - Pag-IBIG fund contributions
  - Withholding Tax (BIR) data
- **Data Grid Interface**: Advanced AG Grid implementation for efficient data viewing, searching, and filtering
- **CRUD Operations**: Full Create, Read, Update, Delete functionality for employee records

### 2.3 Attendance, Leave, and Absence Management

- **Raw Time Logs Processing**: Conversion of raw time entries into verified timesheets
- **Attendance Summary Generation**: Automated computation of attendance metrics per cutoff period
- **Hours Calculation**:
  - Regular hours computation
  - Overtime hours calculation
  - Undertime detection and tracking
- **Attendance Anomaly Detection**:
  - Late arrival identification
  - Absence tracking
  - Undertime monitoring
- **Leave Management**:
  - Paid and unpaid leave processing
  - Leave application and approval workflow
  - Automatic payroll integration for leave deductions
- **DTR (Daily Time Record) Generation**: Automated generation of Daily Time Records in PDF format
- **Cutoff Period Management**: Flexible cutoff period configuration and filtering
- **Data Export**: CSV export functionality for attendance records
- **Dual View System**: Toggle between Raw Time Logs and Attendance Summary views

### 2.4 Payroll Computation & Compliance

- **Automated Salary Computation**:
  - Base salary calculation based on employee rates
  - Gross pay computation
  - Net pay calculation
- **Deduction Management**:
  - Lateness deductions
  - Undertime deductions
  - Absence deductions
  - Loan deductions
  - Cash advance deductions
- **Statutory Compliance**:
  - SSS contribution calculations using updated contribution tables
  - PhilHealth premium computations
  - Pag-IBIG contribution deductions
  - Withholding Tax (BIR) calculations
- **Payroll Register Generation**: Comprehensive payroll register with gross pay, all deductions, and net pay
- **Cutoff Period Integration**: Payroll computation aligned with defined cutoff periods
- **Data Grid Interface**: Advanced grid system for payroll data management and review

### 2.5 Payslip Generation & Salary Disbursement

- **Digital Payslip Generation**: Automated generation of professional payslips
- **PDF Export**: High-quality PDF generation using jsPDF library
- **Batch Processing**: Generate multiple payslips simultaneously (2 payslips per page)
- **Detailed Breakdown Display**:
  - Basic pay information
  - Overtime earnings
  - Allowances
  - All deductions (SSS, PhilHealth, Pag-IBIG, Withholding Tax, loans, etc.)
  - Net pay calculation
- **Attendance Summary Integration**: Payslips include attendance and leave summaries for reference
- **Printable Format**: Professional layout suitable for printing and digital distribution
- **Employee Selection**: Flexible selection of employees for payslip generation

### 2.6 Reports, Analytics, and Audit Trail

- **Dashboard Analytics**:
  - Real-time employee statistics
  - Department-wise filtering
  - Quick statistics display (Total Employees, On Leave, Promotions)
- **Punctuality Trend Analysis**: Visual charts showing attendance trends over time
- **Government Deadlines Tracking**:
  - SSS deadline reminders
  - PhilHealth deadline tracking
  - Pag-IBIG deadline management
  - Withholding Tax deadline monitoring
- **Data Visualization**: Chart.js integration for interactive charts and graphs
- **Comprehensive Reporting**: Various report types for management and finance use
- **Audit Trail**: Secure logging of all system activities and changes

### 2.7 User Management & Authentication

- **User Authentication**: Secure login system using Supabase Auth
- **User Account Management**:
  - Add new users
  - User role management
  - Password reset functionality
- **Session Management**: Secure session handling and authentication state
- **Access Control**: Role-based access control system

### 2.8 System Settings & Configuration

- **Department Management**: CRUD operations for departments
- **Position Management**: Job position definitions and management
- **Official Time Schedule Configuration**: Work schedule setup and management
- **Cutoff Period Settings**: Payroll cutoff period configuration
- **Theme Customization**: System theme and appearance settings
- **Data Grid Configuration**: Customizable grid settings for all modules

### 2.9 Additional Features

- **Responsive Design**: Modern UI built with TailwindCSS and DaisyUI components
- **Data Grid Functionality**: Advanced AG Grid Enterprise features including:
  - Sorting and filtering
  - Search functionality
  - Column resizing and reordering
  - CSV export
  - Row selection
- **Real-time Data Updates**: Live data synchronization with Supabase backend
- **Error Handling**: Comprehensive error handling and user feedback systems
- **Loading States**: Visual feedback during data operations
- **Modal Dialogs**: User-friendly modal interfaces for data entry and confirmations

---

## 3. Technology Used

### 3.1 Front End

#### Core Technologies

- **HTML5**: Semantic markup for all application pages
- **JavaScript (ES6+)**: Modern JavaScript with ES6 modules for application logic
- **CSS3**: Advanced styling and animations

#### CSS Frameworks & Libraries

- **TailwindCSS v4.1.14**: Utility-first CSS framework for rapid UI development
  - PostCSS integration for CSS processing
  - Custom configuration via `postcss.config.cjs`
  - Responsive design utilities
- **DaisyUI v5.3.0**: Component library built on TailwindCSS
  - Pre-built UI components (buttons, modals, forms, cards, etc.)
  - Theme system support
  - Accessibility features

#### JavaScript Libraries & Frameworks

- **AG Grid Community v34.2.0**: Open-source data grid for displaying tabular data
  - Advanced filtering and sorting
  - Column management
  - Data export capabilities
- **AG Grid Enterprise v34.2.0**: Enterprise features for data grids
  - Enhanced functionality
  - Advanced data manipulation
- **Chart.js**: JavaScript charting library for data visualization
  - Line charts for trend analysis
  - Interactive charts
  - Responsive design
- **face-api.js (@vladmandic/face-api v1.5.7)**: Facial recognition library
  - Face detection using SSD MobileNet v1
  - Face landmark detection (68 points)
  - Face recognition and matching
  - WebGL acceleration for performance
- **jsPDF v2.5.1**: PDF generation library
  - Client-side PDF creation
  - Multi-page document support
  - Custom formatting and layouts

#### Build Tools

- **PostCSS v8.5.6**: CSS processing tool
- **PostCSS CLI v11.0.1**: Command-line interface for PostCSS
- **Autoprefixer v10.4.21**: Automatic vendor prefixing for CSS
- **@tailwindcss/postcss v4.1.14**: TailwindCSS PostCSS plugin

#### Development Tools

- **Node.js & npm**: Package management and build scripts
- **Git & GitHub**: Version control and collaboration

### 3.2 Back End

#### Backend-as-a-Service (BaaS)

- **Supabase**: Complete backend solution providing:
  - PostgreSQL database
  - Real-time subscriptions
  - Authentication service
  - RESTful API
  - Row Level Security (RLS)
  - Storage capabilities

#### Supabase Services Used

- **Supabase Auth**:
  - User authentication (email/password)
  - Session management
  - User registration
  - Password reset functionality
- **Supabase Database (PostgreSQL)**:
  - Relational database for all application data
  - Custom SQL functions and stored procedures
  - Database views for optimized queries
  - Foreign key relationships
- **Supabase Client Library (@supabase/supabase-js v2)**:
  - JavaScript client for Supabase API
  - Real-time data subscriptions
  - Query builder
  - File upload/download

#### Database Functions

- **Custom RPC Functions**:
  - `match_employee`: Facial recognition matching function using vector similarity search
  - Custom stored procedures for complex operations

#### API Architecture

- **RESTful API**: Supabase provides automatic REST API endpoints for all database tables
- **Real-time Subscriptions**: WebSocket-based real-time data updates
- **Row Level Security (RLS)**: Database-level security policies

### 3.3 Database

#### Database System

- **PostgreSQL** (via Supabase):
  - Relational database management system
  - ACID compliance
  - Advanced query capabilities
  - Full-text search support
  - Vector similarity search for facial recognition

#### Database Schema Components

Based on the codebase analysis, the database includes the following main tables:

- **users**: User account information and authentication
- **employees**: Employee master data
- **raw_time_logs**: Raw time in/out records
- **attendance_summary**: Processed attendance data
- **leaves**: Leave applications and records
- **payroll**: Payroll computation data
- **payslips**: Generated payslip records
- **departments**: Department master data
- **positions**: Job position definitions
- **official_time**: Work schedule configurations
- **cutoff_periods**: Payroll cutoff period definitions
- **government_contributions**: SSS, PhilHealth, Pag-IBIG, and tax information

#### Database Features

- **Foreign Key Relationships**: Maintains referential integrity
- **Database Views**: Optimized views for complex queries
- **Indexes**: Performance optimization for frequently queried fields
- **Vector Storage**: Face descriptor storage for facial recognition (using PostgreSQL vector extensions)
- **Triggers**: Automated database operations
- **Stored Procedures**: Complex business logic at database level

### 3.4 APIs Used

#### External APIs & CDNs

1. **Supabase API**:

   - **URL**: `https://gsihnjyewuzyxzdcztge.supabase.co`
   - **Authentication**: JWT-based authentication
   - **Endpoints**:
     - REST API for database operations
     - Auth API for user management
     - Storage API for file operations
   - **Real-time API**: WebSocket connections for live updates

2. **Face-API.js CDN**:

   - **URL**: `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.5.7/`
   - **Purpose**: Facial recognition models and library
   - **Models Used**:
     - SSD MobileNet v1 (face detection)
     - Face Landmark 68 Net (facial landmarks)
     - Face Recognition Net (face descriptors)

3. **Chart.js CDN**:

   - **URL**: `https://cdn.jsdelivr.net/npm/chart.js`
   - **Purpose**: Data visualization and charting

4. **jsPDF CDN**:

   - **URL**: `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`
   - **Purpose**: Client-side PDF generation

5. **Supabase JavaScript Client CDN**:
   - **URL**: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
   - **Purpose**: Supabase client library

#### Browser APIs

- **MediaDevices API**: Camera access for facial recognition
- **WebGL API**: GPU acceleration for face detection
- **File API**: File handling for exports
- **Fetch API**: HTTP requests to Supabase
- **WebSocket API**: Real-time data subscriptions (via Supabase)

#### Custom API Functions

- **Supabase RPC Functions**:
  - `match_employee(query)`: Custom function for facial recognition matching using vector similarity search
  - Returns: Employee ID, full name, and match distance

---

## Summary

Nexus Payroll is a modern, cloud-based payroll management system that leverages cutting-edge web technologies to provide a comprehensive solution for HR and payroll operations. The system combines advanced facial recognition technology, real-time data processing, automated calculations, and compliance management to deliver an efficient and accurate payroll solution. Built on a scalable architecture using Supabase as the backend, the system ensures data security, real-time updates, and seamless user experience across all modules.

The technology stack emphasizes modern web development practices, utilizing popular open-source libraries and frameworks to create a maintainable and extensible codebase. The modular architecture allows for independent development and integration of features, making the system flexible and adaptable to changing business requirements.
