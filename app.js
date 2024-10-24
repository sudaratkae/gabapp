const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const os = require('os');

const secretKey = 'your_secret_key';
const app = express();
const PORT = 3000;

// Database connection
const db = mysql.createConnection({
    host: 'dx9-0.h.filess.io',
    user: '1_programeye',
    password: 'd983b99992cf5e341d0b9de09f70c2453b7fa0e6',
    database: '1_programeye',
});

// Middleware setup
app.use(cors());
app.use(bodyParser.json());
const upload = multer({ dest: 'uploads/' }); // Specify upload directory

// Function to get the local IP address
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (let interfaceName in interfaces) {
        for (let iface of interfaces[interfaceName]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'IP address not found';
}

// Registration endpoint
app.post('/register', upload.single('profile_image'), (req, res) => {
    console.log(req.body); // Log request body
    console.log(req.file); // Log uploaded file

    const { username, phone, address, password, type, vehicle_number } = req.body;

    if (!username || !phone || !address || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    const profileImage = req.file ? req.file.filename : null; // Uploaded file name

    if (!profileImage) {
        return res.status(400).json({ message: 'Profile image is required.' });
    }

    // Hash the password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Hashing error:', err);
            return res.status(500).json({ message: 'Server error.' });
        }

        const query = 'INSERT INTO user (username, phone, address, password, type, vehicle_number, profile_image) VALUES (?, ?, ?, ?, ?, ?, ?)';
        db.query(query, [username, phone, address, hashedPassword, type, vehicle_number, profileImage], (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Database error.' });
            }
            res.status(201).json({ message: 'User registered successfully!' });
        });
    });
});

// Login endpoint
app.post('/rider/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    db.query('SELECT * FROM user WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('Query error:', err);
            return res.status(500).json({ message: 'Database query error.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = results[0];

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Bcrypt error:', err);
                return res.status(500).json({ message: 'Error comparing passwords.' });
            }
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid password' });
            }

            const token = jwt.sign({ uid: user.id }, secretKey, { expiresIn: '1h' });
            res.status(200).json({
                message: 'Login successful!',
                token,
                results: [{ user_type: user.type, ...user }]
            });
        });
    });
});

// Shipments endpoint
app.get('/shipments', (req, res) => {
    const query = `
      SELECT s.shipment_id, u.username, u.phone, u.address, s.shipment_status 
      FROM Shipment s 
      JOIN user u ON s.receiver_id = u.id
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ error: 'Internal Server Error', details: err });
        }
        res.json(results);
    });
});

// Start server
app.listen(PORT, () => {
    const ipAddress = getLocalIp();
    console.log(`Server running on http://${ipAddress}:${PORT}`);
});
