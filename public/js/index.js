'use strict';

var charts = [];

$(document).ready(function() {
    // the "href" attribute of .modal-trigger must specify the modal ID that wants to be triggered
    $('.modal').modal({
        ready: function(modal, trigger) {
            console.log(modal, trigger);
        },
        complete: function() {
            console.log('closed');
        }
    });
    // TEMPORARY - while proper GET is not implemented
    const CDs = JSON.parse('[{"name":"rcr/bmp180","fields":[{"id":"temp","name":"Temperature","unit":"℃"},{"id":"atm","name":"Pressure","unit":"hPa"}],"chart":{"name":"container","yAxis":[{"color":"1","fieldID":"atm"},{"color":"0","fieldID":"temp"}]},"fab":{"icon":"loop","function":"alert()"}}]')    
    CDs.forEach(cardData => {
        let chart = new Chart(cardData, 'jsonp');
        chart.initChart();
        charts.push(chart);
    });
});

var socket = io();
socket.on('connect', function() {
    changeStatus('Connected', 'connect');
});
socket.on('connect_error', function() {
    changeStatus('Disconnected.', 'connect_error');
});
socket.on('reconnect_attempt', function() {
    changeStatus('Reconnecting...', 'reconnect_attempt');
});

function changeStatus(text, style) {
    document.getElementById('conntext').textContent = text;
    document.getElementById('conntext').className = style;
    document.getElementById('connbull').className = style;
}
socket.on('home/rcr/sensors/bmp180/pressure', function(a) {
    document.getElementById('atm').textContent = parseFloat(a).toFixed(1);
});
socket.on('home/rcr/sensors/bmp180/temperature', function(t) {
    document.getElementById('temp').textContent = parseFloat(t).toFixed(1);
});


function j(o) {
    let cache = [];
    let json = JSON.stringify(o, function(key, value) {
        if (typeof value === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) {
                return;
            }
            cache.push(value);
        }
        return value;
    });
    cache = null;
    return json;
}
