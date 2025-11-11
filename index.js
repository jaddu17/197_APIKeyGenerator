const express = require('express')
const path = require('path')
const crypto = require('crypto')
const db = require('./database') // koneksi ke MySQL
const app = express()
const port = 3001

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// ✅ Cek koneksi
app.get('/test', (req, res) => res.send('Hello World!'))

// ✅ Rute utama
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// ==========================
// 🔹 CREATE API KEY
// ==========================
app.post('/create', (req, res) => {
  try {
    const apiKey = `sk-sm-v1-${crypto.randomBytes(16).toString('hex').toUpperCase()}`

    // 🔹 Simpan ke database + waktu sekarang
    const query = 'INSERT INTO apikey (`key`, `createdAt`) VALUES (?, NOW())'
    db.query(query, [apiKey], (err, result) => {
      if (err) {
        console.error('❌ Gagal menyimpan API key:', err)
        return res.status(500).json({ success: false, message: 'Gagal menyimpan API key' })
      }

      console.log('✅ API Key disimpan:', apiKey)
      res.json({ success: true, apiKey })
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: 'Gagal membuat API key' })
  }
})

// ==========================
// 🔹 CEK VALIDITAS API KEY
// ==========================
app.post('/cekapi', (req, res) => {
  const { apiKey } = req.body

  if (!apiKey) {
    return res.status(400).json({ success: false, message: 'API key tidak dikirim' })
  }

  const query = 'SELECT * FROM apikey WHERE `key` = ?'
  db.query(query, [apiKey], (err, results) => {
    if (err) {
      console.error('❌ Error saat cek API key:', err)
      return res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengecek API key' })
    }

    if (results.length > 0) {
      res.json({
        success: true,
        message: 'API key valid',
        createdAt: results[0].createdAt
      })
    } else {
      res.status(401).json({ success: false, message: 'API key tidak valid' })
    }
  })
})

app.listen(port, () => {
  console.log(`🚀 Server berjalan di http://localhost:${port}`)
})
