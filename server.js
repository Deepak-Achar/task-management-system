require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Create MySQL connection without database first
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: 3306
});

// Connect and create database if it doesn't exist
connection.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    
    // Create database if it doesn't exist
    connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`, (err) => {
        if (err) {
            console.error('Error creating database:', err);
            return;
        }
        console.log('Database created or already exists');
        
        // Close the initial connection
        connection.end();
        
        // Create the final connection with the database
        const db = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: 3306
        });

        // Connect to MySQL with database selected
        db.connect(err => {
            if (err) {
                console.error('Error connecting to MySQL:', err);
                return;
            }
            console.log('Connected to MySQL database');
            
            // Create tasks table if it doesn't exist
            const createTable = `
                CREATE TABLE IF NOT EXISTS tasks (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    text VARCHAR(255) NOT NULL,
                    completed BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;
            
            db.query(createTable, (err) => {
                if (err) {
                    console.error('Error creating table:', err);
                    return;
                }
                console.log('Tasks table ready');
            });
        });

        // API Routes
        // Get all tasks
        app.get('/api/tasks', (req, res) => {
            db.query('SELECT * FROM tasks ORDER BY created_at DESC', (err, results) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json(results);
            });
        });

        // Add new task
        app.post('/api/tasks', (req, res) => {
            const { text } = req.body;
            if (!text) {
                res.status(400).json({ error: 'Task text is required' });
                return;
            }
            
            db.query('INSERT INTO tasks (text) VALUES (?)', [text], (err, result) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                db.query('SELECT * FROM tasks WHERE id = ?', [result.insertId], (err, results) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json(results[0]);
                });
            });
        });

        // Toggle task completion
        app.put('/api/tasks/:id', (req, res) => {
            const { id } = req.params;
            db.query('UPDATE tasks SET completed = NOT completed WHERE id = ?', [id], (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                db.query('SELECT * FROM tasks WHERE id = ?', [id], (err, results) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json(results[0]);
                });
            });
        });

        // Add update task route
        app.put('/api/tasks/:id/update', (req, res) => {
            const { id } = req.params;
            const { text } = req.body;
            if (!text) {
                res.status(400).json({ error: 'Task text is required' });
                return;
            }
            
            db.query('UPDATE tasks SET text = ? WHERE id = ?', [text, id], (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                db.query('SELECT * FROM tasks WHERE id = ?', [id], (err, results) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json(results[0]);
                });
            });
        });

        // Delete task
        app.delete('/api/tasks/:id', (req, res) => {
            const { id } = req.params;
            db.query('DELETE FROM tasks WHERE id = ?', [id], (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: 'Task deleted successfully' });
            });
        });

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    });
});
