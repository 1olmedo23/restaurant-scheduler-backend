const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');

// POST /api/shifts — Create a new shift and optionally assign an employee (Manager only)
router.post('/shifts', authenticateToken, async (req, res) => {
  const { user } = req;
  const { shift_date, start_time, end_time, position, employee_id } = req.body;

  try {
    // Only managers can create shifts
    const roleRes = await db.query('SELECT role FROM users WHERE id = $1', [user.userId]);
    if (roleRes.rows[0].role !== 'manager') {
      return res.status(403).json({ message: 'Access denied. Only managers can create shifts.' });
    }

    // Insert the shift
    const shiftResult = await db.query(
      `INSERT INTO shifts (shift_date, start_time, end_time, position)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [shift_date, start_time, end_time, position]
    );

    const newShift = shiftResult.rows[0];

    let assignmentMessage = 'Shift created successfully';
    let scheduleEntry = null;

    // If employee_id is provided, assign the shift
    if (employee_id) {
      const scheduleResult = await db.query(
        `INSERT INTO schedules (employee_id, shift_id)
         VALUES ($1, $2)
         RETURNING *`,
        [employee_id, newShift.id]
      );

      scheduleEntry = scheduleResult.rows[0];
      assignmentMessage = 'Shift created and assigned successfully';
    }

    return res.status(201).json({
      message: assignmentMessage,
      shift: newShift,
      assignment: scheduleEntry || null
    });

  } catch (err) {
    console.error('Error creating or assigning shift:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;