'use strict'

const micro = require('micro');
const microrouter = require('microrouter');
const path = require("path");

const rp = require('request-promise');

// connecting to InfluxDB
const DbHandler = require(path.join(__dirname, 'db-handler.js'));
const dbHandler = (() => {
    const connection = require(path.join(__dirname, 'db-connection-provider')).getConnection();
    return new DbHandler(connection);
})();


const service = microrouter.router(
    microrouter.get('/:cardname/extremes', async (req, res) => {
        const cardname = req.params.cardname;
        console.log(`/${req.params.cardname}/extremes`);
        const mqttChannel = await rp({uri: `http://localhost:8001/${cardname}/channel`, simple: false})
            .then(mqttChannel => {
                if (mqttChannel === null || mqttChannel === "") {
                    micro.send(res, 404);
                    return null;
                }
                return mqttChannel;
            })
            .catch((err) => {
                micro.send(res, 500);
            });
        if (mqttChannel) {
            let extremes = await dbHandler.getInfluxExtremesAsync(mqttChannel);
            micro.send(res, 200, extremes);
        }
    }),
    microrouter.get('/:cardname/data', async (req, res) => {
        const cardname = req.params.cardname;
        const mqttChannel = await rp({uri: `http://localhost:8001/${cardname}/channel`, simple: false})
            .catch((err) => null );
        const start = req.query.start;
        const end = req.query.end;
        const data = await dbHandler.getInfluxDataAsync(mqttChannel, start, end);
        console.log(`/${req.params.cardname}/data`);
        micro.send(res, 200, data);
    }),
    microrouter.get('/*', (req, res) => micro.send(res, 404))
);

const server = micro(service);
server.listen(8001);
console.log('Data service started.');
