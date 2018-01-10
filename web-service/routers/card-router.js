'use strict'

const express = require('express');
const router = express.Router();

const rp = require('request-promise');

const configUrl = 'http://localhost:8000';
const dataUrl = 'http://localhost:8001';

router.get('/', async function(req, res) {
    console.log(`${configUrl}/cards`);
    rp(`${configUrl}/cards`)
        .then(JSON.parse)
        .then(res.status(200).jsonp.bind(res))
        .catch(console.error);
});

//router.get('/:cardname', function(req, res) {
//    //let cardname = req.params.cardname;
//    //let card = cards.find(c => c.name === cardname);
//    //res.jsonp(card.cardData);
//    console.log(`/${req.params.cardname}`)
//});

router.get('/:cardname/extremes', async function(req, res) {
    console.log(`${dataUrl}/${req.params.cardname}/extremes`);
    rp({uri: `${dataUrl}/${req.params.cardname}/extremes`, simple: false})
        .then(JSON.parse)
        .then(res.status(200).jsonp.bind(res))
        .catch(console.error);
});

router.get('/:cardname/data', async function(req, res) {
    console.log(`${dataUrl}/${req.params.cardname}/data`);
    rp({uri: `${dataUrl}/${req.params.cardname}/data`, simple: false})
        .then(JSON.parse)
        .then(res.status(200).jsonp.bind(res))
        .catch(console.error);
});


module.exports = router;