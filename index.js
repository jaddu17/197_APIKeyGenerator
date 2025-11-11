const express = require('express')
const path = require('path')
const crypto = require('crypto')
const app = express()
const port = 3000

// Middleware untuk parsing JSON body
app.use(express.json())

// Middleware untuk melayani file statis dari folder "public"
app.use(express.static(path.join(__dirname, 'public')))

// Variabel untuk menyimpan API key yang terakhir dibuat
let myApiKey = null

// Endpoint contoh
app.get('/test', (req, res) => {
  res.send('Hello World!')
})

// Rute utama: kirim file index.html dari folder public
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

