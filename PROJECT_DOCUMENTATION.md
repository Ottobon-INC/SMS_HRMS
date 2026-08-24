# HRMS Project Documentation

This document provides a comprehensive overview of the **HRMS** project architecture, technology stack, directory structure, database schema, and core features. It is intended to serve as a reference guide for Large Language Models (LLMs) and developers to understand the codebase.

## 1. Overview
**HRMS** is a full-stack Human Resources Management System (HRMS) built to manage employees, attendance, leaves, payroll, location tracking, duty rosters, and internal chat messaging. It features dual roles (`employee` and `admin`), offering distinct dashboards and module access based on permissions.

## 2. Technology Stack
- **Frontend Framework**: React 19 (using Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (v4)
- **Icons**: Lucide React
- **Maps**: Leaflet & React-Leaflet
- **Animations**: Motion
- **Database / Backend as a Service**: Supabase (PostgreSQL)
- **Chat Server**: Node.js, Express, Socket.io (WebSocket for real-time messaging)

## 3. Directory Structure

```text
/HRMS
│── /server                     # Node.js/Express Chat Server
│   └── index.js                # Socket.io chat server entry point
│── /src                        # React Frontend Source Code
│   │── /components             # UI Components (Admin & Employee views)
│   │── /hooks                  # Custom React Hooks (Business Logic & Supabase integration)
│   │── /lib                    # Utilities, Supabase Client setup, Constants
│   │── App.tsx                 # Main Application Component (Routing & Tab Management)
│   │── main.tsx                # React DOM entry point
│   │── types.ts                # TypeScript Interfaces & Types
│   │── data.ts                 # Mock/Seed Data
│   │── translations.ts         # Bilingual Translations (English & Telugu)
│   └── index.css               # Global CSS & Tailwind imports
│── package.json                # Project Dependencies & Scripts
│── vite.config.ts              # Vite configuration
│── SQL_SCHEMA.sql              # Supabase PostgreSQL Database Schema definitions
└── .env                        # Environment Variables (Supabase URL, Anon Key, etc.)
```

## 4. Database Schema (Supabase PostgreSQL)
All tables in the database are prefixed with `HRMS_`. The application primarily uses the following tables:

- **`HRMS_employees`**: Stores user profiles (id, name, email, password, role, designation, basic_pay, joining_date, status).
- **`HRMS_attendance`**: Tracks employee daily check-ins/check-outs, locations, photos, and punch types (`in_office` vs `out_of_office`).
- **`HRMS_leave_requests` & `HRMS_leave_balances`**: Manages leave applications (sick, casual, maternity, paternity) and respective balances.
- **`HRMS_payroll`**: Stores generated monthly payslips, allowances, deductions, and basic pay computations.
- **`HRMS_advance_requests`**: Handles salary/medical advance requests, tracking amount, repayments, and installment status.
- **`HRMS_invoices`**: Manages billing/invoices.
- **`HRMS_monthly_leave_quota`**: Tracks dynamic monthly leave allocations.
- **`HRMS_office_locations`**: Stores approved geofenced office locations.
- **`HRMS_special_location_events` & `HRMS_special_event_assignees`**: Tracks field events (e.g., medical camps, client sites) and assigned personnel.
- **`HRMS_location_pins`**: Allows employees to pin their location (field visit, medical camp, delivery) with photos.
- **`HRMS_chat_channels` & `HRMS_chat_messages`**: Powers the internal real-time messaging system.
- **`HRMS_duty_roster`**: Schedules employee shifts.

## 5. Core Types (`src/types.ts`)
The `types.ts` file is the central source of truth for the application's data structures:
- `Employee`: Complete profile, embedding references to leaves, attendance, payroll, shifts, etc.
- `LocationPin`: Geotagging type (`PinType`: 'field_visit', 'medical_camp', etc.).
- `AttendanceRecord` & `CheckInLog`: Represents daily presence and precise punch logs.
- `LeaveRequest` & `LeaveBalance`: Leave logic interfaces.
- `AdvanceRequest`: Tracks advanced salary parameters.

## 6. Frontend Architecture & Detailed Modules

The UI is strictly separated into Admin and Employee views. Routing is dynamically controlled via the `activeTab` state synced with URL paths and `localStorage`, bypassing traditional React Router for a lightweight SPA experience. Modules are loaded lazily (`React.lazy`) for performance optimization.

### Key Employee Modules
- **CheckInModule & AttendanceModule**: Handles the daily workflow. Captures start/end times, automatically accesses the device camera to take a verification photo (falling back safely if permissions are denied), and validates the employee's location via geofencing (if punching `in_office`). Also provides the ability to submit "Missed Punch" requests if an employee forgets to check out.
- **LeaveModule**: Allows employees to request leaves (`sick`, `casual`, `maternity`, `paternity`), track approval statuses in real-time, and view their dynamic leave balances/quotas.
- **AdvanceRequestModule**: Facilitates salary or medical advance requests. Employees specify the amount and repayment timeline (2, 3, or 5 months).
- **PayrollModule**: Provides employees with access to their historical payslips, detailing basic pay, calculated allowances/deductions, advances withheld, and attendance-based prorations.
- **DutyRosterModule / EmployeeRoster**: Displays upcoming assigned shifts (date, start time, end time, label).
- **MessagingModule**: A fully integrated real-time WebSocket chat client for company-wide or direct communication.

### Key Admin Modules
- **AdminDashboard & EmployeeDirectory**: Central hub to manage the workforce. Allows creating new users, editing profiles, disabling access (`active`/`inactive`), and resetting passwords.
- **AdminAttendance & AdminMissedPunches**: Overviews company-wide daily attendance. Resolves missed punch requests (approving or rejecting manual time entries).
- **AdminLeaveApprovals & AdminAdvanceApprovals**: Interfaces for managers to review, approve, or reject employee requests, automatically triggering downstream calculations (like updating leave balances or setting up payroll deductions).
- **AdminPayroll**: A bulk processing engine. Automatically tallies working days vs. present days, subtracts unpaid leaves, applies monthly advance installment deductions, and generates finalized payslips for the entire company.
- **AdminOfficeLocations & AdminSpecialEvents**: Geo-fencing configuration panels. Admins define permanent office perimeters and temporary special events (like medical camps) assigning specific employees to them.

### Custom Hooks (`src/hooks/`)
All Supabase queries and complex business logic are abstracted into hooks (`useAuth`, `useEmployees`, `useAttendance`, `useLeaves`, `usePayroll`, `useAdvances`, `useLocationPins`, `useMessaging`) keeping components clean and purely presentational.

## 7. Geo-Fencing & Location Pinning (Deep Dive)

The application employs a dual-layered location tracking system to ensure attendance integrity and field-visit tracking.

### A. Geofenced Attendance Checking (`src/lib/geofence.ts`)
When an employee attempts to "Punch In" as `in_office`, the system enforces a strict geofence verification using the Haversine formula to calculate the distance (in meters) between the employee's device GPS coordinates and the company's approved locations.
1. **Permanent Office Locations**: Pulled from `HRMS_office_locations` (e.g., "Main Office"). These have a defined latitude, longitude, and radius (e.g., 50 meters).
2. **Temporary Special Events**: Pulled from `HRMS_special_location_events`. If an employee is assigned to a specific event today (checked via `HRMS_special_event_assignees`), that event's coordinates are merged into their valid check-in locations.
3. **Validation**: The `checkGeofence` utility iterates through all allowed locations. If the calculated Haversine distance is within the location's `radius_meters`, the punch-in is allowed. Otherwise, it is blocked with a "Too far from office" error, preventing spoofed attendance.

### B. Ad-Hoc Location Pinning (`useLocationPins.ts`)
For field workers or sales teams, the app provides a "Drop Pin" feature. 
1. **Capture**: The employee selects a pin type (`field_visit`, `medical_camp`, `client_site`, `delivery`, `other`), adds an optional note, and takes a live photo.
2. **Reverse Geocoding**: The app captures the exact GPS coordinates and makes a call to the OpenStreetMap Nominatim API (`https://nominatim.openstreetmap.org/reverse`). This translates raw coordinates into a human-readable string (e.g., "Gajuwaka, Visakhapatnam, Andhra Pradesh").
3. **Storage**: The pin, coordinates, readable address, and Base64 photo are pushed to the `HRMS_location_pins` table in Supabase. Admins can view these pins on a timeline (`LocationPinTimeline.tsx`) to track field activity throughout the day independently from standard attendance punches.

## 8. Real-time Messaging (Socket.io + Supabase)
A separate Node.js server (`server/index.js`) handles real-time WebSocket communication:
- Express + Socket.io runs on port `9640`.
- Optimistic UI updates occur immediately over WebSockets (`receive_message`).
- The Node server concurrently saves chat history to the `HRMS_chat_messages` Supabase table.

## 9. Development & Deployment
- Run Frontend: `npm run dev` (Starts Vite server on port `9620`).
- Run Chat Server: `node server/index.js` (Starts Express/Socket.io).
- Environment Variables Required (`.env` / `.env.local`):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
