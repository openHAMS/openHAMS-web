'use strict'
const express = require('express');
const router = express.Router();
const path = require('path');

function pick(o, ...fields) {
    return fields.reduce((a, x) => {
        if(o.hasOwnProperty(x)) a[x] = o[x];
        return a;
    }, {});
}

function generateCardRouter(config, db) {
    let router = express.Router();
    let cards = config.cards;
    let subscribes = config.subscribes;
    // adding card info
	// router/
    router.get('/', function(req, res) {
        let cardInfos = cards.map(card => pick(card, 'name', 'type', 'cardData'));
        res.jsonp(cardInfos);
    })
    // adding card-specific routes
    cards.forEach(card => {
        // router/cardname
        router.get(path.join('/', card.name), function(req, res) {
            let cardData = card.cardData;
            res.jsonp(cardData);
        });
        // router/cardname/data
        router.get(path.join('/', card.name, 'data'), function(req, res) {
            var start = req.query.start;
            var end = req.query.end;
            db.getInfluxDataAsync(subscribes, start, end)
                .then(data => {
                    res.jsonp(data);
                })
                .catch(console.error);
        });
        // router/cardname/extremes
        router.get(path.join('/', card.name, 'extremes'), function(req, res) {
            db.getInfluxExtremesAsync(subscribes)
                .then(extremes => {
                    res.jsonp(extremes);
                })
                .catch(console.error);
        });
        // router/cardname/data2
        router.get(path.join('/', card.name, 'data2'), function(req, res) {
            var start = req.query.start;
            var end = req.query.end;
            db.getInfluxData2Async(subscribes, start, end)
                .then(data => {
                    res.jsonp(data);
                })
                .catch(console.error);
        });
    });
    return router;
}

exports.CardRouter = generateCardRouter;
