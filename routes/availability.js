// routes/availability.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');

// POST /api/availability — employee sets availability
router.post('/availability', authenticateToken, async (req, res) => {
    const { user } = req;
    const { day_of_week, period, available } = req.body;

    try {
        const roleRes = await db.query('SELECT role FROM users WHERE id = $1', [user.userId]);
        if (roleRes.rows[0].role !== 'employee') {
            return res.status(403).json({ message: 'Only employees can set availability' });
        }

        const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [user.userId]);
        if (empRes.rows.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const employeeId = empRes.rows[0].id;

        const result = await db.query(
            `INSERT INTO availability (employee_id, day_of_week, period, available)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [employeeId, day_of_week, period, available]
        );

        res.status(201).json({
            message: 'Availability set',
            availability: result.rows[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/availability/override — manager overrides availability
router.patch('/availability/override', authenticateToken, async (req, res) => {
    const { user } = req;
    const { employee_id, day_of_week, period, available } = req.body;

    try {
        // Must be manager
        const roleRes = await db.query('SELECT role FROM users WHERE id = $1', [user.userId]);
        if (roleRes.rows[0].role !== 'manager') {
            return res.status(403).json({ message: 'Only managers can override availability' });
        }

        // Update availability (if exists), else insert new
        const checkRes = await db.query(
            `SELECT id FROM availability WHERE employee_id = $1 AND day_of_week = $2 AND period = $3`,
            [employee_id, day_of_week, period]
        );

        let result;
        if (checkRes.rows.length > 0) {
            result = await db.query(
                `UPDATE availability
                 SET available = $1
                 WHERE employee_id = $2 AND day_of_week = $3 AND period = $4
                 RETURNING *`,
                [available, employee_id, day_of_week, period]
            );
        } else {
            result = await db.query(
                `INSERT INTO availability (employee_id, day_of_week, period, available)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [employee_id, day_of_week, period, available]
            );
        }

        res.json({
            message: 'Availability override successful',
            availability: result.rows[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/availability/all — Managers view all employee availability
router.get('/availability/all', authenticateToken, async (req, res) => {
    const { user } = req;

    try {
        // Check if user is a manager
        const roleRes = await db.query('SELECT role FROM users WHERE id = $1', [user.userId]);
        if (roleRes.rows[0].role !== 'manager') {
            return res.status(403).json({ message: 'Only managers can view employee availability' });
        }

        const result = await db.query(
            `SELECT a.employee_id, u.email AS employee_name, a.day_of_week, a.period, a.available
             FROM availability a
             JOIN employees e ON a.employee_id = e.id
             JOIN users u ON e.user_id = u.id
             ORDER BY employee_id, 
                      CASE 
                          WHEN day_of_week = 'Sunday' THEN 0
                          WHEN day_of_week = 'Monday' THEN 1
                          WHEN day_of_week = 'Tuesday' THEN 2
                          WHEN day_of_week = 'Wednesday' THEN 3
                          WHEN day_of_week = 'Thursday' THEN 4
                          WHEN day_of_week = 'Friday' THEN 5
                          WHEN day_of_week = 'Saturday' THEN 6
                      END, 
                      period`
        );

        res.json({
            message: 'All employee availability retrieved',
            availability: result.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;