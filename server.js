#!/usr/bin/env node

const Bundler = require('parcel-bundler')
const express = require('express')

const app = express()

app.get('/api/message', (req, res) => {
  res.json({ message: 'message from server' })
})

app.use('/app1', express.static('./app1/dist'))
app.use('/app2', express.static('./app2/dist'))

const bundler = new Bundler('index.html')
app.use(bundler.middleware())

app.listen(8080)
