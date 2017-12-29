'use strict';

const socket = io();
function changeStatus(text, style) {
    document.getElementById('conntext').textContent = text;
    document.getElementById('conntext').className = style;
    document.getElementById('connbull').className = style;
}
socket.on('connect', function() {
    changeStatus('Connected', 'connect');
});
socket.on('connect_error', function() {
    changeStatus('Disconnected.', 'connect_error');
});
socket.on('reconnect_attempt', function() {
    changeStatus('Reconnecting...', 'reconnect_attempt');
});

const cards = [];

$(document).ready(function() {
    // the "href" attribute of .modal-trigger must specify the modal ID that wants to be triggered
    //$('.modal').modal({
    //    ready: function(modal, trigger) {
    //        console.log(modal, trigger);
    //    },
    //    complete: function() {
    //        console.log('closed');
    //    }
    //});
    let cardUrl = 'api/cards';
    $.getJSON(cardUrl, cards => {
        cards.forEach(card => {
            let newCard;
            switch (card.type) {
                case 'sensor':
                    newCard = new SensorCard(socket, card.name, card.cardData, `${cardUrl}/${card.name}`);
                    break;
                case 'led':
                    newCard = new LedCard(socket);
                    break;
                default:
                    console.log('unknown card type');
                    break;
            }
        });
    });
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
