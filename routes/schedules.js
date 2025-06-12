const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');

// POST /api/schedules — Assign employee to shift
router.post('/schedules', authenticateToken, async (req, res) => {
    const { user } = req;
    const { employee_id, shift_id } = req.body;

    try {
        // Only managers can assign shifts
        const userRole = await db.query('SELECT role FROM users WHERE id = $1', [user.userId]);
        if (userRole.rows[0].role !== 'manager') {
            return res.status(403).json({ message: 'Only managers can assign shifts' });
        }

        const result = await db.query(
            `INSERT INTO schedules (employee_id, shift_id)
             VALUES ($1, $2)
             RETURNING *`,
            [employee_id, shift_id]
        );

        res.status(201).json({
            message: 'Employee assigned to shift',
            schedule: result.rows[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/my-schedule — For employees to view their assigned shifts
router.get('/my-schedule', authenticateToken, async (req, res) => {
    const { user } = req;

    try {
        // Confirm this user is an employee
        const userRole = await db.query('SELECT role FROM users WHERE id = $1', [user.userId]);
        if (userRole.rows[0].role !== 'employee') {
            return res.status(403).json({ message: 'Only employees can access this route' });
        }

        // Get employee_id from employees table
        const employeeResult = await db.query(
            'SELECT id FROM employees WHERE user_id = $1',
            [user.userId]
        );

        if (employeeResult.rows.length === 0) {
            return res.status(404).json({ message: 'Employee profile not found' });
        }

        const employeeId = employeeResult.rows[0].id;

        // Get scheduled shifts
        const scheduleResult = await db.query(
            `SELECT schedules.id AS schedule_id, shift_date, start_time, end_time, status
             FROM schedules
             JOIN shifts ON schedules.shift_id = shifts.id
             WHERE schedules.employee_id = $1
             AND shift_date >= CURRENT_DATE
             AND shift_date < CURRENT_DATE + INTERVAL '14 days'
             ORDER BY shift_date`,
            [employeeId]
        );

        res.json({
            message: 'Schedule retrieved successfully',
            schedule: scheduleResult.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/schedules/:id/call-off — manager calls off employee
router.patch('/schedules/:id/call-off', authenticateToken, async (req, res) => {
    const { user } = req;
    const { id } = req.params;

    try {
        // Must be manager
        const roleRes = await db.query('SELECT role FROM users WHERE id = $1', [user.userId]);
        if (roleRes.rows[0].role !== 'manager') {
            return res.status(403).json({ message: 'Only managers can call off shifts' });
        }

        // Get schedule info
        const scheduleRes = await db.query('SELECT * FROM schedules WHERE id = $1', [id]);
        if (scheduleRes.rows.length === 0) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        const schedule = scheduleRes.rows[0];

        // Update status to "called_off"
        await db.query(
            `UPDATE schedules
             SET status = 'called_off'
             WHERE id = $1`,
            [id]
        );

        // Get employee's user_id
        const empRes = await db.query('SELECT user_id FROM employees WHERE id = $1', [schedule.employee_id]);
        const targetUserId = empRes.rows[0].user_id;

        // Create notification
        await db.query(
            `INSERT INTO notifications (user_id, message)
             VALUES ($1, $2)`,
            [targetUserId, 'You have been called off for your shift.']
        );

        res.json({ message: 'Employee called off and notified' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/schedules/:id/notes — Add or update notes for a shift
router.patch('/schedules/:id/notes', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    const { user } = req;

    try {
        // Only managers can update notes
        const roleCheck = await db.query('SELECT role FROM users WHERE id = $1', [user.userId]);
        if (roleCheck.rows[0].role !== 'manager') {
            return res.status(403).json({ message: 'Only managers can add notes' });
        }

        const updateRes = await db.query(
            `UPDATE schedules
             SET notes = $1
             WHERE id = $2
             RETURNING *`,
            [notes, id]
        );

        if (updateRes.rows.length === 0) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        res.json({
            message: 'Shift note updated successfully',
            schedule: updateRes.rows[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;