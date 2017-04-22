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

function measToQ(availableMeasurement, start, end) {
    // return 'SELECT value FROM ' + availableMeasurement + ' WHERE time > now() - 3h';
    if (start == null || end == null) {
        return 'SELECT MEAN(value) AS value FROM ' +
            availableMeasurement +
            ' WHERE time > now() - 6h GROUP BY time(5m) fill(none)';
    } else {
        var duration = end - start;
        start = String(start + "0000000000000000000").substring(0, 19);
        end = String(end + "0000000000000000000").substring(0, 19);
        if (duration < 30 * 60 * 1000) {
            // 1m
            return 'SELECT value FROM ' + availableMeasurement + ' WHERE time > now() - 3h';
        } else {
            var q = 'SELECT MEAN(value) AS value FROM ' + availableMeasurement +
                ' WHERE time > ' + start + ' AND time < ' + end;
            if (duration < 2 * 60 * 60 * 1000) {
                // 1h - 1.25m
                q += ' GROUP BY time(75s)';
            } else if (duration < 4.5 * 60 * 60 * 1000) {
                // 3h - 3.75m
                q += ' GROUP BY time(225s)';
            } else if (duration < 9 * 60 * 60 * 1000) {
                // 6h - 7.5m
                q += ' GROUP BY time(450s)';
            } else if (duration < 18 * 60 * 60 * 1000) {
                // 12h - 15m
                q += ' GROUP BY time(900s)';
            } else {
                // 24h - 30m
                q += ' GROUP BY time(1800s)';
            }
            q += " fill(none)";
            console.log('q: ', q);
            return q;
        }
    }
}

function makeQueries(measurements, start, end) {
    return Promise.all([measurements, measurements.map(m => {
        return measToQ(m, start, end);
    })]);
}

function queryInflux(measurements, queries) {
    return Promise.all([influx.query(queries), measurements]);
}

function transformInfluxData(results, measurements) {
    if (typeof results.group != "undefined") {
        results = [results];
    }
    var data = {};
    for (var i = 0; i < results.length; i++) {
        data[measurements[i]] = results[i].map(result => {
            return [parseInt(result.time.getNanoTime().slice(0, 13)), parseFloat(Math.round(result.value * 100) / 100)];
        });
    }
    return data;
}

function getInfluxData(start, end) {
    return influx.getMeasurements()
        .then(filterMeasurements)
        .then(m => {
            return makeQueries(m, start, end);
        })
        .then(pList => {
            var measurements = pList[0];
            var queries = pList[1];
            return queryInflux(measurements, queries);
        })
        .then(pList => {
            var results = pList[0]
            var measurements = pList[1];
            return transformInfluxData(results, measurements);
        });

}

io.on('connection', function(socket) {
    getInfluxData().then(data => {
        io.emit('server/history', data);
    });
});

app.use(express.static('public'));
app.use('/static', express.static('public'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/jsonp', function(req, res) {
    console.log('jsonp');
    var start = req.query.start;
    var end = req.query.end;
    getInfluxData(start, end).then(data => {
        res.jsonp(data);
    });
});


var PING_URL = "http://ipecho.net/plain";
var OWN_URL = "http://racerzeroone.duckdns.org/";
http.get(PING_URL, function(res) {
    res.on("data", function(data) {
        console.log("================================================================================");
        console.log("    ip:  " + data + ":8081");
        console.log("    url: " + OWN_URL);
        console.log("================================================================================");
    }).setEncoding("utf8");
});


server.listen(8081, function() {
    console.log('listening');
});
