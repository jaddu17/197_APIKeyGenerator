const express = require('express');
const path = require('path');
const db = require('./database'); // mysql2 connection
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ===== PAGE ROUTES =====
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "public", "register.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

// ===== GENERATE API KEY (TANPA SIMPAN) =====
app.post('/api/generate', (req, res) => {
    const apiKey = generateApiKey();
    res.json({ success: true, api_key: apiKey });
});

// ===== SAVE USER + API KEY =====
app.post('/api/user', (req, res) => {
    const { first_name, last_name, email, api_key } = req.body;
    if (!first_name || !last_name || !email || !api_key)
        return res.status(400).json({ success: false, error: "Missing fields" });

    // Insert API key ke DB
    const sqlKey = "INSERT INTO apikey (`key`, createdAt, outOfDate, status) VALUES (?, NOW(), 0, 'offline')";
    db.query(sqlKey, [api_key], (errKey, keyRes) => {
        if (errKey) {
            console.error("Insert API Key Error:", errKey);
            return res.json({ success: false, error: "Insert API Key Failed", details: errKey });
        }

        const apikey_id = keyRes.insertId;

        // Insert user
        const sqlUser = "INSERT INTO users (first_name, last_name, email, apikey_id) VALUES (?, ?, ?, ?)";
        db.query(sqlUser, [first_name, last_name, email, apikey_id], (errUser, userRes) => {
            if (errUser) {
                console.error("Insert User Error:", errUser);
                return res.json({ success: false, error: "Insert User Failed", details: errUser });
            }

            res.json({ success: true, user_id: userRes.insertId, api_key });
        });
    });
});

// ===== ADMIN LOGIN =====
app.post("/admin/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ success: false, message: "Email dan password wajib diisi" });

    db.query("SELECT * FROM admin WHERE email = ? AND password = ? LIMIT 1", [email, password], (err, rows) => {
        if (err) return res.json({ success: false, message: "Kesalahan server" });
        if (rows.length === 0) return res.json({ success: false, message: "Email atau password salah" });
        res.json({ success: true, message: "Login berhasil" });
    });
});

app.get('/dashboard-data', (req, res) => {
    const sql = `
        SELECT u.id AS user_id, u.first_name, u.last_name, u.email, 
               k.id AS apikey_id, k.key AS api_key, k.createdAt AS createdAt, k.status AS status_db
        FROM users u
        LEFT JOIN apikey k ON u.apikey_id = k.id
    `;
    db.query(sql, (err, rows) => {
        if (err) return res.json({ success: false, message: "Gagal load data", details: err });

        const users = rows.map(u => {
            let status_key = "offline";
            if (u.createdAt) {
                const diffDays = Math.floor((new Date() - new Date(u.createdAt)) / (1000*60*60*24));
                status_key = diffDays < 30 ? "online" : "offline";

                // update status ke DB jika berbeda
                if (u.status_db !== status_key) {
                    db.query("UPDATE apikey SET status = ? WHERE id = ?", [status_key, u.apikey_id], err => {
                        if (err) console.error("Gagal update status key:", err);
                    });
                }
            }

            return {
                id: u.user_id,
                first_name: u.first_name,
                last_name: u.last_name,
                email: u.email,
                api_key: u.api_key || "-",
                status_key // kirim ke frontend
            };
        });

        res.json({ success: true, users });
    });
});


// ===== DELETE USER + API KEY =====
app.delete('/delete-user/:id', (req, res) => {
    const userId = req.params.id;
    db.query("SELECT apikey_id FROM users WHERE id = ?", [userId], (err1, rows) => {
        if (err1 || rows.length === 0) return res.json({ success: false, message: "User tidak ditemukan" });
        const apikeyId = rows[0].apikey_id;

        db.query("DELETE FROM users WHERE id = ?", [userId], err2 => {
            if (err2) return res.json({ success: false, message: "Gagal menghapus user" });

            db.query("DELETE FROM apikey WHERE id = ?", [apikeyId], err3 => {
                if (err3) return res.json({ success: false, message: "User terhapus, API Key gagal dihapus" });
                res.json({ success: true, message: "User & API Key berhasil dihapus" });
            });
        });
    });
});

// ===== HELPER =====
function generateApiKey(length = 32) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "";
    for (let i = 0; i < length; i++) key += chars[Math.floor(Math.random() * chars.length)];
    return key;
}

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
