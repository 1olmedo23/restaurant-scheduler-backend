const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const employeeRoutes = require('./routes/employees');



const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

app.get('/', (req, res) => {
  res.send('API is working!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.use('/api/employees', employeeRoutes);

const shiftRoutes = require('./routes/shifts');
app.use('/api', shiftRoutes);

const scheduleRoutes = require('./routes/schedules');
app.use('/api', scheduleRoutes);

const shiftRequestRoutes = require('./routes/shiftRequests');
app.use('/api', shiftRequestRoutes);

const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);

const availabilityRoutes = require('./routes/availability');
app.use('/api', availabilityRoutes);
