'use strict'
const express = require('express');
const router = express.Router();
const path = require('path');

function generateCardRouter(config, db) {
    let router = express.Router();
    let cards = config['cards'];
    // adding card info
    router.get('/', function (req, res) {
        let cardInfos = cards.map(card => (({name, cardData}) => ({name, cardData}))(card));
        res.jsonp(cardInfos);
    })
    // adding card-specific routes
    cards.forEach(card => {
        // url.org/api/cards/cardname
        router.get(path.join('/', card.name), function (req, res) {
            let cardData = card.cardData;
            res.jsonp(cardData);
        });
        // url.org/api/cards/cardname/data
        router.get(path.join('/', card.name, 'data'), function (req, res) {
            var start = req.query.start;
            var end = req.query.end;
            db.getInfluxDataAsync(card.subscribes, start, end)
                .then(data => {
                    res.jsonp(data);
                })
                .catch(console.error);
        });
    });
    return router;
}

exports.CardRouter = generateCardRouter;
