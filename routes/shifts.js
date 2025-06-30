const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');

// GET /api/shifts — includes assigned employee_id if any
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        shifts.*,
        schedules.employee_id
      FROM shifts
      LEFT JOIN schedules ON schedules.shift_id = shifts.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching shifts:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/shifts — Create a new shift and assign employee (optional)
router.post('/', authenticateToken, async (req, res) => {
  const { user } = req;
  const { shift_date, start_time, end_time, position, employee_id } = req.body;

  try {
    const roleRes = await db.query('SELECT role FROM users WHERE id = $1', [user.userId]);
    if (roleRes.rows[0].role !== 'manager') {
      return res.status(403).json({ message: 'Access denied. Only managers can create shifts.' });
    }

    // Create shift
    const shiftResult = await db.query(
      `INSERT INTO shifts (shift_date, start_time, end_time, position)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [shift_date, start_time, end_time, position]
    );

    const shift = shiftResult.rows[0];

    // If employee selected, assign to schedule
    let assigned = null;
    if (employee_id) {
      const assignRes = await db.query(
        `INSERT INTO schedules (employee_id, shift_id)
         VALUES ($1, $2)
         RETURNING *`,
        [employee_id, shift.id]
      );
      assigned = assignRes.rows[0];
    }

    return res.status(201).json({
      message: 'Shift created',
      shift: {
        ...shift,
        employee_id: assigned?.employee_id || null,
      }
    });

  } catch (err) {
    console.error('Error creating shift:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;