#!/usr/bin/env node

const Bundler = require('parcel-bundler')
const express = require('express')
const http = require('http')
const WebSocket = require('ws')

const app = express()

const server = http.createServer(app)

const wss = new WebSocket.Server({ server })

// example WebSocket implementation that sends
// current timestamp every second
wss.on('connection', ws => {
  console.log('WebSocket opened')

  const timer = setInterval(() => {
    const payload = { timestamp: new Date().toISOString() }
    ws.send(JSON.stringify(payload))
  }, 1000)

  ws.on('close', () => {
    console.log('WebSocket closed')
    clearInterval(timer)
  })
})

// example restful api
app.get('/api/message', (req, res) => {
  res.json({ message: 'message from server' })
})

// serve statically app1 and app2 so that
// both of them are on the same origin
app.use('/app1', express.static('./app1/dist'))
app.use('/app2', express.static('./app2/dist'))

// build and serve the host app using Parcel
const bundler = new Bundler('index.html')
app.use(bundler.middleware())

server.listen(8080)
