const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');

// GET /api/notifications — for logged-in user
router.get('/', authenticateToken, async (req, res) => {
    const { user } = req;

    try {
        const result = await db.query(
            `SELECT id, message, read, created_at
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [user.userId]
        );

        res.json({
            message: 'Notifications retrieved successfully',
            notifications: result.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/notifications/:id/read — Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { user } = req;

    try {
        // Ensure the notification belongs to the current user
        const notifRes = await db.query(
            'SELECT * FROM notifications WHERE id = $1 AND user_id = $2',
            [id, user.userId]
        );

        if (notifRes.rows.length === 0) {
            return res.status(404).json({ message: 'Notification not found or does not belong to user' });
        }

        // Mark as read
        const updateRes = await db.query(
            `UPDATE notifications
             SET read = TRUE
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        res.json({
            message: 'Notification marked as read',
            notification: updateRes.rows[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
