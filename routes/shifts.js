const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');

// GET /api/shifts — Get all shifts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM shifts');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching shifts:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/shifts — Create a new shift
router.post('/', authenticateToken, async (req, res) => {
  const { user } = req;
  const { shift_date, start_time, end_time, position, employee_id } = req.body;

  try {
    const roleRes = await db.query('SELECT role FROM users WHERE id = $1', [user.userId]);
    if (roleRes.rows[0].role !== 'manager') {
      return res.status(403).json({ message: 'Access denied. Only managers can create shifts.' });
    }

    const shiftResult = await db.query(
      `INSERT INTO shifts (shift_date, start_time, end_time, position, employee_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [shift_date, start_time, end_time, position, employee_id]
    );

    return res.status(201).json({
      message: 'Shift created',
      shift: shiftResult.rows[0],
    });

  } catch (err) {
    console.error('Error creating shift:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;