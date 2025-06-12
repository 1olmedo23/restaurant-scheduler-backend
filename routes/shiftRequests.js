const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');

// POST /api/shift-requests — Submit a trade request
router.post('/shift-requests', authenticateToken, async (req, res) => {
    const { user } = req;
    const { target_employee_id, schedule_id } = req.body;

    try {
        // Confirm user is an employee
        const roleRes = await db.query('SELECT role FROM users WHERE id = $1', [user.userId]);
        if (roleRes.rows[0].role !== 'employee') {
            return res.status(403).json({ message: 'Only employees can request trades' });
        }

        // Get requester's employee_id
        const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [user.userId]);
        if (empRes.rows.length === 0) {
            return res.status(404).json({ message: 'Employee profile not found' });
        }

        const requesterId = empRes.rows[0].id;

        // Insert shift request
        const result = await db.query(
            `INSERT INTO shift_requests (requester_id, target_employee_id, schedule_id)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [requesterId, target_employee_id, schedule_id]
        );

        res.status(201).json({
            message: 'Shift trade request submitted',
            request: result.rows[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/shift-requests/pending — View pending trade requests (managers only)
router.get('/shift-requests/pending', authenticateToken, async (req, res) => {
    const { user } = req;

    try {
        // Only managers can view pending trade requests
        const roleRes = await db.query('SELECT role FROM users WHERE id = $1', [user.userId]);
        if (roleRes.rows[0].role !== 'manager') {
            return res.status(403).json({ message: 'Only managers can view shift requests' });
        }

        const result = await db.query(
            `SELECT sr.*, s.shift_id, e1.position AS requester_position, e2.position AS target_position
             FROM shift_requests sr
             JOIN schedules s ON sr.schedule_id = s.id
             JOIN employees e1 ON sr.requester_id = e1.id
             JOIN employees e2 ON sr.target_employee_id = e2.id
             WHERE sr.status = 'pending'
             ORDER BY sr.created_at DESC`
        );

        res.json({
            message: 'Pending shift requests retrieved',
            requests: result.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/shift-requests/:id/approve — Manager approves request
router.patch('/shift-requests/:id/approve', authenticateToken, async (req, res) => {
    const { user } = req;
    const { id } = req.params;

    try {
        // Must be manager
        const roleRes = await db.query('SELECT role FROM users WHERE id = $1', [user.userId]);
        if (roleRes.rows[0].role !== 'manager') {
            return res.status(403).json({ message: 'Only managers can approve requests' });
        }

        // Get the trade request
        const requestRes = await db.query('SELECT * FROM shift_requests WHERE id = $1 AND status = $2', [id, 'pending']);
        if (requestRes.rows.length === 0) {
            return res.status(404).json({ message: 'Pending request not found' });
        }

        const { schedule_id, requester_id, target_employee_id } = requestRes.rows[0];

        // Update the schedule to assign the shift to the new employee
        await db.query(
            `UPDATE schedules
             SET employee_id = $1
             WHERE id = $2`,
            [target_employee_id, schedule_id]
        );

        // Mark the request as approved
        await db.query(
            `UPDATE shift_requests
             SET status = 'approved'
             WHERE id = $1`,
            [id]
        );

        // Notify the original requester
        const userRes = await db.query(
            `SELECT user_id FROM employees WHERE id = $1`,
            [requester_id]
        );
        const requesterUserId = userRes.rows[0].user_id;

        await db.query(
            `INSERT INTO notifications (user_id, message)
             VALUES ($1, $2)`,
            [requesterUserId, 'Your shift trade request was approved.']
        );

        res.json({ message: 'Shift trade approved and updated' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/shift-requests/:id/reject — Manager rejects request
router.patch('/shift-requests/:id/reject', authenticateToken, async (req, res) => {
    const { user } = req;
    const { id } = req.params;

    try {
        // Must be manager
        const roleRes = await db.query('SELECT role FROM users WHERE id = $1', [user.userId]);
        if (roleRes.rows[0].role !== 'manager') {
            return res.status(403).json({ message: 'Only managers can reject requests' });
        }

        // Get the trade request
        const requestRes = await db.query('SELECT * FROM shift_requests WHERE id = $1 AND status = $2', [id, 'pending']);
        if (requestRes.rows.length === 0) {
            return res.status(404).json({ message: 'Pending request not found' });
        }

        // Mark request as rejected
        await db.query(
            `UPDATE shift_requests
             SET status = 'rejected'
             WHERE id = $1`,
            [id]
        );

        // Notify the requester
        const userRes = await db.query(
            `SELECT user_id FROM employees WHERE id = $1`,
            [requestRes.rows[0].requester_id]
        );
        const requesterUserId = userRes.rows[0].user_id;

        await db.query(
            `INSERT INTO notifications (user_id, message)
             VALUES ($1, $2)`,
            [requesterUserId, 'Your shift trade request was rejected.']
        );

        res.json({ message: 'Shift trade request rejected' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;