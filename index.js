const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const availabilityRoutes = require('./routes/availability');
const shiftRoutes = require('./routes/shifts');
const scheduleRoutes = require('./routes/schedules');
const shiftRequestRoutes = require('./routes/shiftRequests');
const notificationRoutes = require('./routes/notifications');

// Mount routes
app.use('/api', authRoutes);                    // /api/login, /api/register
app.use('/api', availabilityRoutes);            // /api/availability, /api/availability/override
app.use('/api/employees', employeeRoutes);      // /api/employees/...
app.use('/api/shifts', shiftRoutes);                   // /api/shifts/...
app.use('/api', scheduleRoutes);                // /api/schedules/...
app.use('/api', shiftRequestRoutes);            // /api/shift-requests/...
app.use('/api/notifications', notificationRoutes); // /api/notifications/...

// Root endpoint
app.get('/', (req, res) => {
  res.send('API is working!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});