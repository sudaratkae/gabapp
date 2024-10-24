const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const secretKey = 'your_secret_key';

const app = express();
const PORT = 3000;

const db = mysql.createConnection({
    host: 'dx9-0.h.filess.io',
    user: '1_programeye',
    password: 'd983b99992cf5e341d0b9de09f70c2453b7fa0e6',
    database: '1_programeye',
});

app.use(cors());
app.use(bodyParser.json());
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // ระบุที่จัดเก็บไฟล์อัปโหลด

app.post('/register', upload.single('profile_image'), (req, res) => {
    // ตรวจสอบข้อมูลที่ส่งมาทาง console
    console.log(req.body); // ตรวจสอบข้อมูลที่ส่งมาจาก Flutter
    console.log(req.file); // ตรวจสอบไฟล์ที่อัปโหลด

    const { username, phone, address, password, type, vehicle_number } = req.body;

    // ตรวจสอบว่ามีข้อมูลที่จำเป็นทั้งหมดหรือไม่
    if (!username || !phone || !address || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    // คุณสามารถจัดการการบันทึกรูปภาพได้ที่นี่
    const profileImage = req.file ? req.file.filename : null; // ชื่อไฟล์ที่อัปโหลด

    // ตรวจสอบว่าโปรไฟล์อิมเมจถูกส่ง
    if (!profileImage) {
        return res.status(400).json({ message: 'Profile image is required.' });
    }

    // เข้ารหัสรหัสผ่าน
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

app.post('/rider/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    // ใช้ db แทน pool ที่นี่
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
app.get('/shipments', (req, res) => {
    const query = `
      SELECT s.shipment_id, u.username, u.phone, u.address, s.shipment_status 
      FROM Shipment s 
      JOIN user u ON s.receiver_id = u.id
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error executing query:', err); // Log error to console
            return res.status(500).json({ error: 'Internal Server Error', details: err });
        }
        res.json(results);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
