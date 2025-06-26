#Restaurant Employee Scheduling App (Backend)

## Overview
This project is a responsive web application designed to help restaurant managers create and manage weekly employee schedules. Employees can log in to view their assigned shifts, improving visibility and reducing missed workdays due to schedule confusion.
This tool modernizes the current paper-based system by providing real-time access to the schedule from any device. It was inspired by real operational challenges faced in a restaurant setting, including no-shows, employees arriving when not scheduled, and unclear shift communication. My goal is to eliminate schedule-related issues by improving access and accountability, reducing both missed shifts and unnecessary arrivals.

## 🔧 Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Query Tool:** `pg` (node-postgres)
- **Authentication:** JWT (JSON Web Tokens)
- **Environment Config:** dotenv

## 📁 Folder Structure
restaurant-scheduler-backend/
├── routes/
│ ├── auth.js
│ ├── availability.js
│ ├── shifts.js
│ ├── schedules.js
│ ├── shiftRequests.js
│ └── notifications.js
├── db.js
├── authMiddleware.js
├── index.js
├── .env

## ✨ Features
- JWT-based authentication and role-based access (manager, employee)
- Manager: Create, assign, and view shifts
- Employee: View personal 2-week schedule
- Availability tracking for both managers and employees
- Notifications for shift changes or updates
- Shift trade requests with manager approval
- Shift notes (manager can leave notes on a shift)
