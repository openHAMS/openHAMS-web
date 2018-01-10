'use strict';
const path = require('path');

const express = require('express');
const app = express();
const favicon = require('serve-favicon');
const http = require('http');
const pug = require('pug');

const syncRequest = require('sync-request');
const server = http.Server(app);
const io = require('socket.io')(server);

const cardrouter = require(path.join(__dirname, './routers/card-router.js'));

// connecting to MQTT
const Mqtt = require('mqtt');
const mqtt = Mqtt.connect('mqtt://127.0.0.1:1883');

// loading config & MQTT channels
const config = JSON.parse(syncRequest('GET', 'http://localhost:8000/cards').getBody('utf8'));
const channels = JSON.parse(syncRequest('GET', 'http://localhost:8000/channels').getBody('utf8'));


mqtt.on('connect', function() {
    console.log('mqtt conn:');
    channels.forEach(s => {
        console.log(`    ${s}`);
        mqtt.subscribe(s);
    });
});

mqtt.on('message', function(topic, message) {
    io.sockets.emit(topic, message.toString());
});


app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, '/public/icons/favicon.ico')));
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '/views'));

app.get('/', function(req, res) {
    res.render('index', {cards: config});
});

app.use('/api/cards', cardrouter);


server.listen(8081, function() {
    console.log('================================');
    console.log('           listening            ');
    console.log('================================');
});
