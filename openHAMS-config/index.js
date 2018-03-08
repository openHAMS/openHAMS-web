'use strict'

const micro = require('micro');
const microrouter = require('microrouter');
const path = require("path");

const ConfigHandler = require(path.join(__dirname, 'config-handler'));
const configHandler = new ConfigHandler(path.join(__dirname, './config.json'));


const service = microrouter.router(
    microrouter.get('/cards', (req, res) => {
        let cardInfos = configHandler.getCardInfos();
        console.log('/cards');
        micro.send(res, 200, cardInfos);
    }),
    microrouter.get('/channels', (req, res) => {
        let channels = configHandler.getAllChannels();
        console.log('/channels');
        micro.send(res, 200, channels);
    }),
    microrouter.get('/:cardname/channel', (req, res) => {
        let cardname = req.params.cardname;
        let channel = configHandler.getMqttChannel(cardname);
        console.log(`/${req.params.cardname}/channel`);
        if (channel) {
            micro.send(res, 200, channel);
        } else {
            micro.send(res, 404);
        }
    }),
    microrouter.get('/*', (req, res) => micro.send(res, 404))
);

const server = micro(service);
server.listen(8000);
console.log('Config service started.');
