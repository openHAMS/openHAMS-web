"use strict";
const express = require('express');
const app = express();
const http = require('http');
const jsonfile = require('jsonfile')
const server = http.Server(app);
const io = require('socket.io')(server);

const Mqtt = require('mqtt');
const mqtt = Mqtt.connect('mqtt://localhost:1883');

const Influx = require('influx');
const influx = new Influx.InfluxDB({
    host: 'localhost',
    database: 'sensors'
});


var ledColor = '#00000000';
var subscribeList = [
    'home/rcr/sensors/bmp180/pressure',
    'home/rcr/sensors/bmp180/temperature'
];


mqtt.on('connect', function() {
    console.log('mqtt conn');
    subscribeList.forEach(s => {
        console.log(s);
        mqtt.subscribe(s);
    });
});

mqtt.on('message', function(topic, message) {
    io.sockets.emit(topic, message.toString());
});

function filterMeasurements(names) {
    var availableMeasurements = subscribeList.map(mqttAddr => {
        var mqttSplit = mqttAddr.split('/');
        return mqttSplit[mqttSplit.length - 1];
    }).filter(queryMeasurement => {
        return names.includes(queryMeasurement);
    });
    return availableMeasurements;
}

function measToQ(measurements, start, end) {
    return measurements.map(availableMeasurement => {
        // return 'SELECT value FROM ' + availableMeasurement + ' WHERE time > now() - 3h';
        return 'SELECT MEAN(value) AS value FROM ' + availableMeasurement + ' WHERE time > now() - 3h GROUP BY time(5m)'
    });
}

function transformInfluxData(results) {
    // [0] influx.query
    // [1] measurement names
    if(typeof results[0].group != "undefined") {
        results[0] = [results[0]];
    }
    var data = {};
    for(var i = 0; i < results[0].length; i++) {
        data[results[1][i]] = results[0][i].map(result => {
            return [parseInt(result.time.getNanoTime().slice(0, 13)), parseFloat(result.value)];
        });
    }
    return data;
}

function getInfluxData(measurements) {
    var q = measToQ(measurements);
    return Promise.resolve(Promise.all([influx.query(q), measurements]).then(transformInfluxData));
}

function sendInfluxData(data) {
    io.emit('server/history', data);
}

function sendInfluxHistory() {
}


io.on('connection', function(socket) {
    influx.getMeasurements().then(filterMeasurements).then(getInfluxData).then(sendInfluxData);
    // influx.getMeasurements().then(names => {
    //         var availableMeasurements = subscribeList.map(mqttAddr => {
    //             var mqttSplit = mqttAddr.split('/');
    //             return mqttSplit[mqttSplit.length - 1];
    //         }).filter(queryMeasurement => {
    //             return names.includes(queryMeasurement);
    //         });
    //         var q = availableMeasurements.map(availableMeasurement => {
    //             // return 'SELECT value FROM ' + availableMeasurement + ' WHERE time > now() - 3h';
    //             return 'SELECT MEAN(value) AS value FROM ' + availableMeasurement + ' WHERE time > now() - 3h GROUP BY time(5m)'
    //         });
    //         influx.query(q).then(results => {
    //             if(typeof results.group != "undefined") results = [results];
    //             var data = {};
    //             for(var i = 0; i < results.length; i++) {
    //                 console.log(results[i]);
    //                 data[availableMeasurements[i]] = results[i].map(result => {
    //                     return [parseInt(result.time.getNanoTime().slice(0, 13)), parseFloat(result.value)];
    //                 });
    //             }
    //             io.emit('server/history', data);
    //         });
    // });
});

app.use(express.static('public'));
app.use('/static', express.static('public'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});


var PING_URL = "http://ipecho.net/plain";
var OWN_URL = "http://racerzeroone.duckdns.org/";
http.get(PING_URL, function(res) {
    res.on("data", function(data) {
        console.log("================================================================================");
        console.log("    " + "ip:  " + data + ":8081");
        console.log("    " + "url: " + OWN_URL);
        console.log("================================================================================");
    }).setEncoding("utf8");
});


server.listen(8081, function() {
    console.log('listening');
});
