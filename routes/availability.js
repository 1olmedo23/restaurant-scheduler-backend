const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../authMiddleware'); // ✅ Only use this

// GET current user's availability
router.get('/availability', authMiddleware, async (req, res) => {
  const user = req.user;

  try {
    const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [user.userId]);

    if (empRes.rows.length === 0) {
      return res.status(404).json({ message: 'Employee record not found for user' });
    }

    const employeeId = empRes.rows[0].id;

    const result = await db.query(
      'SELECT * FROM availability WHERE employee_id = $1',
      [employeeId]
    );

    res.json({ availability: result.rows });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST (create or update) current user's availability
router.post('/availability', authMiddleware, async (req, res) => {
  const user = req.user;
  const { day_of_week, period, available } = req.body;

  try {
    const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [user.userId]);

    if (empRes.rows.length === 0) {
      return res.status(404).json({ message: 'Employee record not found for user' });
    }

    const employeeId = empRes.rows[0].id;

    await db.query(
      `INSERT INTO availability (employee_id, day_of_week, period, available)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (employee_id, day_of_week, period)
       DO UPDATE SET available = EXCLUDED.available`,
      [employeeId, day_of_week, period, available]
    );

    res.status(200).json({ message: 'Availability updated successfully' });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;