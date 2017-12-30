'use strict';
const path = require('path');

const express = require('express');
const app = express();
const favicon = require('serve-favicon');
const http = require('http');
const pug = require('pug');

const jsonfile = require('jsonfile')
const server = http.Server(app);
const io = require('socket.io')(server);

const routegen = require('./route-generator.js');

// connecting to MQTT
const Mqtt = require('mqtt');
const mqtt = Mqtt.connect('mqtt://127.0.0.1:1883');

// connecting to InfluxDB
const DB = require('./db.js');
const db = new DB('127.0.0.1', 'sensors');

// loading config & MQTT subscribes
const config = jsonfile.readFileSync('config.json', 'utf8');
const subscribes = config.subscribes
	.filter((v, i, a) => a.indexOf(v) === i);


mqtt.on('connect', function() {
    console.log('mqtt conn:');
    subscribes.forEach(s => {
        console.log(`    ${s}`);
        mqtt.subscribe(s);
    });
});

mqtt.on('message', function(topic, message) {
    io.sockets.emit(topic, message.toString());
});


app.use(express.static('public'));
app.use('/static', express.static('public'));
app.use(favicon(path.join(__dirname, '/public/icons/favicon.ico')));

app.set('view engine', 'pug');

app.get('/', function(req, res) {
    res.render('index', config);
});

app.use('/api/cards', routegen.CardRouter(config, db));


server.listen(8080, function() {
    console.log('================================');
    console.log('           listening            ');
    console.log('================================');
});
