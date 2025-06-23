const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const authenticateToken = require('../authMiddleware');


// POST /register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user with default role 'employee'
    const newUser = await db.query(
      `INSERT INTO users (email, password, role)
       VALUES ($1, $2, 'employee')
       RETURNING id, email, created_at, role`,
      [email, hashedPassword]
    );

    const userId = newUser.rows[0].id;

    // Automatically insert employee record
    await db.query(
      `INSERT INTO employees (user_id, phone, position)
       VALUES ($1, $2, $3)`,
      [userId, '555-0000', 'Server'] // default phone and position
    );

    res.status(201).json({
      message: 'User registered and employee profile created successfully',
      user: newUser.rows[0],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

const jwt = require('jsonwebtoken');  // ADD this line at the top of the file

// POST /login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // ✅ Generate JWT token:
        const token = jwt.sign(
            { userId: user.rows[0].id, email: user.rows[0].email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
          message: 'Login successful',
          token: token,
          user: {
            id: user.rows[0].id,
            email: user.rows[0].email,
            role: user.rows[0].role // assuming you need this
          }
        });


    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /protected
router.get('/protected', authenticateToken, (req, res) => {
    res.json({
        message: 'Protected route accessed successfully',
        user: req.user
    });
});


module.exports = router;