'use strict';

const cards = [];


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
    let cardUrl = 'api/cards';
    $.getJSON(cardUrl, cards => {
        cards.forEach(card => {
            if (card.type === 'sensor') {
                let newCard = new SensorCard(card.name, card.cardData, `${cardUrl}/${card.name}`);
            }
        });
    });
});

const socket = io();
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
//socket.on('home/rcr/sensors/bmp180/pressure', function(a) {
//    document.getElementById('atm').textContent = parseFloat(a).toFixed(1);
//    //if (charts[0].loaded) {
//    //    var asd = Date.now();
//    //    charts[0].chart.series[1].addPoint([Date.now(), parseFloat(a)], false, false);
//    //    //charts[0].chart.redraw();
//    //}
//});
//socket.on('home/rcr/sensors/bmp180/temperature', function(t) {
//    document.getElementById('temp').textContent = parseFloat(t).toFixed(1);
//});
//socket.on('home/rcr/sensors/tsl2561/light', function(t) {
//    document.getElementById('lgt').textContent = parseFloat(t).toFixed(1);
//});


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
