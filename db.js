const Influx = require('influx');

class db {
    constructor(host, database) {
        this.influx = new Influx.InfluxDB({
            host: host,
            database: database
        });
    }

    _getMeasurementName(subscribe) {
        // Getting measurement names from mqtt addresses
        let mqttSplit = mqttAddr.split('/');
        return mqttSplit[mqttSplit.length - 1];
    }

    _filterMeasurements(subscribeList, existingMeasurementList) {
        // Returns intersection between monitored and available measurements
        let availableMeasurements = subscribeList
            .map(mqttAddr => this._getMeasurementName)
            .filter(subscribedMeasurement => {
                return existingMeasurementList.includes(subscribedMeasurement);
            });
        return availableMeasurements;
    }

    async _getAvailableMeasurements(subscribeList) {
        // filtering measurements - intersection of measurements existing in InfluxDB and subscribed measurements
        let measurements = await this.influx.getMeasurements()
            .then(existingMeasurementList => {
                // filter not-subscribed measurements
                return this._filterMeasurements(subscribeList, existingMeasurementList);
            });
    }

    _getResolution(duration) {
        // Returns data resolution in sec from data duration (in h)
        // inverse resolution factor - the smaller this number, the bigger the resolution
        let res = 60;
        switch (true) {
            case (duration < 0.5):
                // 1m - raw data
                return 0;
                break;
            case (duration < 2.25):
                // 1h - 1.25m
                return 1 * res;
                break;
            case (duration < 4.5):
                // 3h - 3.75m
                return 3 * res;
                break;
            case (duration < 9):
                // 6h - 7.5m
                return 6 * res;
                break;
            case (duration < 18):
                // 12h - 15m
                return 12 * res;
                break;
            default:
                // 24h - 30m
                return 24 * res;
                break;
        }
    }

    _getDuration(start, end) {
        // duration conversion ns to h
        return (end - start) / (60 * 60 * 1000);
    }

    _makeDataQuery(measurement, start, end) {
        // Generates query string for getting data with proper resolution
        if (start == null || end == null) {
            let t = this._getResolution(6);
            return `SELECT MEAN(value) AS value ` +
                `FROM ${measurement} ` +
                `WHERE time > now() - 6h ` +
                `GROUP BY time(${t}s) fill(none)`;
        }
        let t = this._getResolution(this._getDuration(start, end));
        start = parseInt(start);
        end = parseInt(end);
        // making upper time inclusive by adding time of one extra value
        end += t;
        // right padding
        let startStr = String(start + '0000000000000000000').substring(0, 19);
        let endStr = String(end + '0000000000000000000').substring(0, 19);

        let q;
        if (t === 0) {
            // 1m - raw data
            q = `SELECT value ` +
                `FROM ${measurement} ` +
                `WHERE time > now() - 1h`;
        } else {
            q = `SELECT MEAN(value) AS value ` +
                `FROM ${measurement} ` +
                `WHERE time > ${startStr} AND time < ${endStr} ` +
                `GROUP BY time(${t}s) fill(none)`;
        }
        return q;
    }

    async _transformInfluxData(resultsPromise, measurements) {
        // Transforms data to simpler format, cutting the irrelevant parts out
        let results = await resultsPromise;
        // fixing single-query objects by putting it into an array of 1
        if (typeof results.group != 'undefined') {
            results = [results];
        }
        let data = {};
        for (let i = 0; i < results.length; i++) {
            data[measurements[i]] = results[i].map(result => {
                return [parseInt(result.time.getNanoTime().slice(0, 13)), parseFloat(Math.round(result.value * 100) / 100)];
            });
        }
        return data;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    async getInfluxExtremesAsync(subscribeList) {
        let measurements = this._getAvailableMeasurements(subscribeList);

        // making queries
        let qStart = measurements.map(m => {
            return `SELECT value ` +
                `FROM ${m} ` +
                `ORDER BY asc LIMIT 1`;
        });
        let qEnd = measurements.map(m => {
            return `SELECT value ` +
                `FROM ${m} ` +
                `ORDER BY desc LIMIT 1`;
        });

        // array check
        if (!Array.isArray(qStart) || !qStart.length || !Array.isArray(qEnd) || !qEnd.length) {
            return {};
        }

        // getting extremes
        let [dbStart, dbEnd] = await Promise.all([
            this._transformInfluxData(this.influx.query(qStart), measurements),
            this._transformInfluxData(this.influx.query(qEnd), measurements)
        ]);
        // setting values to null
        Object.keys(dbStart).forEach(function(key) {
            // [key] iterating through measurements
            // [0]   the sole value of that measurement
            // [1]   the value of that sole measurement (other [0] is timestamp)
            dbStart[key][0][1] = null;
            dbEnd[key][0][1] = null;
            // concat end to start
            dbStart[key] = dbStart[key].concat(dbEnd[key]);
        });
        return dbStart;
    }

    async getInfluxDataAsync(subscribeList, dataStart, dataEnd) {
        let measurements = this._getAvailableMeasurements(subscribeList);

        // making queries
        let qData = measurements.map(m => {
            return this._makeDataQuery(m, dataStart, dataEnd);
        });

        // array check
        if (!Array.isArray(qData) || !qData.length) {
            return {};
        }

        // getting data
        let dbData = await this._transformInfluxData(this.influx.query(qData), measurements);
        return dbData;
    }
}

module.exports = db;
