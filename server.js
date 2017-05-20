"use strict";
const express = require('express');
const app = express();
const http = require('http');
const pug = require('pug');

const jsonfile = require('jsonfile')
const server = http.Server(app);
const io = require('socket.io')(server);

const Mqtt = require('mqtt');
const mqtt = Mqtt.connect('mqtt://127.0.0.1:1883');

const Influx = require('influx');
const influx = new Influx.InfluxDB({
    host: '127.0.0.1',
    database: 'sensors'
});


// var ledColor = '#00000000';
const subscribeList = [
    'home/rcr/sensors/bmp180/pressure',
    'home/rcr/sensors/bmp180/temperature'
];


mqtt.on('connect', function() {
    console.log('mqtt conn:');
    subscribeList.forEach(s => {
        console.log(`    ${s}`);
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
    if (start == null || end == null) {
        return `SELECT MEAN(value) AS value FROM ${availableMeasurement} ` +
            `WHERE time > now() - 6h ` +
            `GROUP BY time(5m) fill(none)`
    }
    start = parseInt(start);
    end = parseInt(end);
    // duration conversion ns to h
    var duration = (end - start) / (60 * 60 * 1000);
    start = String(start + '0000000000000000000').substring(0, 19);
    end = String(end + '0000000000000000000').substring(0, 19);
    if (duration < 0.5) {
        // 1m - raw data
        var q = `SELECT value FROM ${availableMeasurement} ` +
            `WHERE time > now() - 3h`;
    } else {
        if (duration < 2.25) {
            // 1h - 1.25m
            var t = 75;
        } else if (duration < 4.5) {
            // 3h - 3.75m
            var t = 225;
        } else if (duration < 9) {
            // 6h - 7.5m
            var t = 450;
        } else if (duration < 18) {
            // 12h - 15m
            var t = 900;
        } else {
            // 24h - 30m
            var t = 1800;
        }
        var q = `SELECT MEAN(value) AS value FROM ${availableMeasurement} ` +
            `WHERE time > ${start} AND time < ${end} ` +
            `GROUP BY time(${t}s) fill(none)`;
    }
    return q;
}

async function transformInfluxData(resultsPromise, measurements) {
    var results = await resultsPromise;
    if (typeof results.group != 'undefined') {
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

async function getInfluxDataAsync(hasLimits, start, end) {
    var measurements = await influx.getMeasurements().then(filterMeasurements);
    var qStart = measurements.map(m => {
        return `SELECT value FROM ${m} ORDER BY asc LIMIT 1`;
    });
    var qEnd = measurements.map(m => {
        return `SELECT value FROM ${m} ORDER BY desc LIMIT 1`;
    });
    var qData = measurements.map(m => {
        return measToQ(m, start, end);
    });

    if (hasLimits) {
        var [dbData, dbStart, dbEnd] = await Promise.all([
            transformInfluxData(influx.query(qData), measurements),
            transformInfluxData(influx.query(qStart), measurements),
            transformInfluxData(influx.query(qEnd), measurements)
        ]);
        Object.keys(dbData).forEach(function(key) {
            dbData[key] = dbStart[key].concat(dbData[key]).concat(dbEnd[key]);
        });
    } else {
        var dbData = await transformInfluxData(influx.query(qData), measurements);
    }
    return dbData;
}




io.on('connection', function(socket) {
    getInfluxDataAsync(true)
        .then(data => {
            io.emit('server/history', data);
        });
});

app.use(express.static('public'));
app.use('/static', express.static('public'));

app.set('view engine', 'pug');

app.get('/', function(req, res) {
    // res.sendFile(__dirname + '/index.html');
    res.render('index');
});

app.get('/jsonp', function(req, res) {
    console.log('jsonp');
    var start = req.query.start;
    var end = req.query.end;
    getInfluxDataAsync(true, start, end).then(data => {
        res.jsonp(data);
    });
});


var PING_URL = 'http://ipecho.net/plain';
var OWN_URL = 'http://racerzeroone.duckdns.org/';
http.get(PING_URL, function(res) {
    res.on('data', function(data) {
        console.log('================================================================================');
        console.log(`    ip:  ${data}:8081`);
        console.log(`    url: ${OWN_URL}`);
        console.log('================================================================================');
    }).setEncoding('utf8');
});


server.listen(8081, function() {
    console.log('listening');
});
