'use strict'

//--------------------------------------------------------------------------
//
//  Dependencies
//
//--------------------------------------------------------------------------

const nodeimu = require('nodeimu')
const io = require('socket.io')(3000)
const mongoose = require('mongoose')

//--------------------------------------------------------------------------
//
//  Constants
//
//--------------------------------------------------------------------------

const TIMEOUT = 1000
const TOTAL_MEASURES = 50

//--------------------------------------------------------------------------
//
//  Database connection
//
//--------------------------------------------------------------------------

mongoose.connect('mongodb://localhost/home-sensors')

const Measure = mongoose.model('Measure', {
  date: Date,
  temperature: Number,
  pressure: Number,
  humidity: Number
})

function saveToDatabase(data) {
  const record = new Measure(data)
  record.save()
}

//--------------------------------------------------------------------------
//
//  NodeIMU
//
//--------------------------------------------------------------------------

var IMU = new nodeimu.IMU()
let tic = new Date()
let lastMeasures = []

requestData()

function getSensorsData(e, data) {
  if (e) {
    return
  }

  const measure = createPayload(data)

  if (lastMeasures.length === TOTAL_MEASURES) {
    lastMeasures.shift()
  }
  lastMeasures.push(measure)

  emitToSocket(measure)
  saveToDatabase(measure)

  requestData()
}

function requestData() {
  setTimeout(() => {
    tic = new Date()
    IMU.getValue(getSensorsData)
  }, TIMEOUT - (new Date() - tic))
}

function createPayload(data) {
  const { timestamp, temperature, pressure, humidity } = data

  return {
    date: timestamp.toISOString(),
    temperature,
    pressure,
    humidity
  }
}

//--------------------------------------------------------------------------
//
//  Socket.io events
//
//--------------------------------------------------------------------------

function emitToSocket(measure) {
  io.sockets.emit('new measure', measure)
}

function handleClientConnected(socket) {
  console.log('client connected')
  socket.emit('last measures', lastMeasures)
}

function handleClientDisconnected(socket) {
  console.log('client disconnected')
}

io.on('connection', handleClientConnected)
io.on('disconnection', handleClientDisconnected)
