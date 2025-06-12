const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');

// POST /api/shifts — Create a new shift
router.post('/shifts', authenticateToken, async (req, res) => {
    const { user } = req;
    const { shift_date, start_time, end_time } = req.body;

    try {
        // Only managers can create shifts
        const userRole = await db.query('SELECT role FROM users WHERE id = $1', [user.userId]);
        if (userRole.rows[0].role !== 'manager') {
            return res.status(403).json({ message: 'Access denied. Only managers can create shifts.' });
        }

        const result = await db.query(
            `INSERT INTO shifts (shift_date, start_time, end_time)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [shift_date, start_time, end_time]
        );

        res.status(201).json({
            message: 'Shift created successfully',
            shift: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
