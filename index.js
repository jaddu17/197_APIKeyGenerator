const express = require("express");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const db = require("./database");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


// ========================================================
// 1. GENERATE API KEY
// ========================================================
app.post("/generate", (req, res) => {
    const apiKey = crypto.randomBytes(20).toString("hex");

    db.query(
        "INSERT INTO apikey (`key`, createdAt, outOfDate) VALUES (?, NOW(), FALSE)",
        [apiKey],
        (err, result) => {
            if (err) return res.status(500).json({ error: err });

            res.json({
                id: result.insertId,
                api_key: apiKey
            });
        }
    );
});


// ========================================================
// 2. SAVE USER + RELASI API KEY
// ========================================================
app.post("/save-user", (req, res) => {
    const { first_name, last_name, email, api_key_id } = req.body;

    db.query(
        "INSERT INTO user (first_name, last_name, email, api_key_id) VALUES (?, ?, ?, ?)",
        [first_name, last_name, email, api_key_id],
        (err) => {
            if (err) return res.status(500).json({ error: err });
            res.json({ message: "User saved!" });
        }
    );
});


// ========================================================
// 3. REGISTER ADMIN
// ========================================================
app.post("/admin/register", async (req, res) => {
    const { email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    db.query(
        "INSERT INTO admin (email, password) VALUES (?, ?)",
        [email, hashed],
        (err) => {
            if (err) return res.status(500).json({ error: err });
            res.json({ message: "Admin registered!" });
        }
    );
});


// ========================================================
// 4. LOGIN ADMIN
// ========================================================
app.post("/admin/login", async (req, res) => {
    const { email, password } = req.body;

    db.query(
        "SELECT * FROM admin WHERE email = ?",
        [email],
        async (err, rows) => {
            if (err) return res.status(500).json({ error: err });

            if (rows.length === 0)
                return res.status(401).json({ error: "Admin not found" });

            const admin = rows[0];

            const match = await bcrypt.compare(password, admin.password);
            if (!match)
                return res.status(401).json({ error: "Invalid password" });

            res.json({ message: "Login success" });
        }
    );
});


// ========================================================
// 5. LIST USER + APIKEY STATUS
// ========================================================
app.get("/admin/users", (req, res) => {
    db.query(
        `SELECT user.*, apikey.key AS api_key, apikey.outOfDate
         FROM user 
         LEFT JOIN apikey ON user.api_key_id = apikey.id`,
        (err, rows) => {
            if (err) return res.status(500).json({ error: err });

            res.json(rows);
        }
    );
});


// ========================================================
// 6. LIST APIKEY
// ========================================================
app.get("/admin/apikeys", (req, res) => {
    db.query("SELECT * FROM apikey", (err, rows) => {
        if (err) return res.status(500).json({ error: err });
        res.json(rows);
    });
});


// ========================================================
// 7. CEK EXPIRED 1 BULAN
// ========================================================
app.get("/admin/check-status", (req, res) => {
    db.query(
        `UPDATE apikey 
         SET outOfDate = TRUE 
         WHERE createdAt < DATE_SUB(NOW(), INTERVAL 1 MONTH)`,
        (err) => {
            if (err) return res.status(500).json({ error: err });
            res.json({ message: "Status updated" });
        }
    );
});


// ========================================================
// START SERVER
// ========================================================
app.listen(3001, () => console.log("Server running on port 3001"));
