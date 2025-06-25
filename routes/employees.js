const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../authMiddleware');

// POST /employees - Add new employee
router.post('/', authenticateToken, async (req, res) => {
    const { user_id, phone, position } = req.body;

    try {
        const result = await db.query(
            'INSERT INTO employees (user_id, phone, position) VALUES ($1, $2, $3) RETURNING *',
            [user_id, phone, position]
        );

        res.status(201).json({
            message: 'Employee added successfully',
            employee: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /employees - Get all employees (id and email as "name")
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT e.id, u.email AS name
            FROM employees e
            JOIN users u ON e.user_id = u.id
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching employees:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
