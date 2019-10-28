#!/usr/bin/env node

const Bundler = require('parcel-bundler')
const express = require('express')
const http = require('http')
const WebSocket = require('ws')

const app = express()

const server = http.createServer(app)

const wss = new WebSocket.Server({ server })

wss.on('connection', ws => {
  console.log('WebSocket opened')
  const timer = setInterval(() => { ws.send(JSON.stringify({ timestamp: new Date().toISOString() })) }, 1000)
  ws.on('close', () => {
    console.log('WebSocket closed')
    clearInterval(timer)
  })
})

app.get('/api/message', (req, res) => {
  res.json({ message: 'message from server' })
})

app.use('/app1', express.static('./app1/dist'))
app.use('/app2', express.static('./app2/dist'))

const bundler = new Bundler('index.html')
app.use(bundler.middleware())

server.listen(8080)
