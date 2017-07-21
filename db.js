const Influx = require('influx');

class db {
    constructor(host, database) {
        this.influx = new Influx.InfluxDB({
            host: host,
            database: database
        });
    }

    _filterMeasurements(subscribeList, names) {
    // Returns intersection between monitored and available measurements
        let availableMeasurements = subscribeList.map(mqttAddr => {
            // Getting measurement names from mqtt addresses
            let mqttSplit = mqttAddr.split('/');
            return mqttSplit[mqttSplit.length - 1];
        }).filter(queryMeasurement => {
            return names.includes(queryMeasurement);
        });
        return availableMeasurements;
    }

    async _getMeasurements(subscribeList) {
    // Returns measurements, which are both available & monitored
        let measurements = await this.influx.getMeasurements()
            .then(names => {
                return this._filterMeasurements(subscribeList, names);
            });
        return measurements;
    }

    _getResolution(start, end) {
    // Returns data resolution in sec from data duration
        // duration conversion ns to h
        let duration = (end - start) / (60 * 60 * 1000);
        let res = 75;
        if (duration < 0.5) {
            // 1m - raw data
            return 0;
        } else if (duration < 2.25) {
            // 1h - 1.25m
            return 1 * res;
        } else if (duration < 4.5) {
            // 3h - 3.75m
            return 3 * res;
        } else if (duration < 9) {
            // 6h - 7.5m
            return 9 * res;
        } else if (duration < 18) {
            // 12h - 15m
            return 12 * res;
        } else {
            // 24h - 30m
            return 24 * res;
        }
    }

    _makeDataQuery(measurement, start, end) {
    // Generates query string for getting data with proper resolution
        if (start == null || end == null) {
            return `SELECT MEAN(value) AS value FROM ${measurement} ` +
                `WHERE time > now() - 6h ` +
                `GROUP BY time(5m) fill(none)`;
        }
        start = parseInt(start);
        end = parseInt(end);
        // right padding
        let startStr = String(start + '0000000000000000000').substring(0, 19);
        let endStr = String(end + '0000000000000000000').substring(0, 19);

        let t = this._getResolution(start, end);
        let q;
        if (t === 0) {
            // 1m - raw data
            q = `SELECT value FROM ${measurement} ` +
                `WHERE time > now() - 1h`;
        } else {
            q = `SELECT MEAN(value) AS value FROM ${measurement} ` +
                `WHERE time > ${startStr} AND time < ${endStr} ` +
                `GROUP BY time(${t}s) fill(none)`;
        }
        return q;
    }

    _makeEdgeQuery(measurement, t, isStart) {
    // Generates query for getting first or last avg data depending on isStart
        let order = isStart ? 'asc' : 'desc';
        let q = `SELECT MEAN(value) AS value ` +
            `FROM (SELECT value FROM ${measurement} ORDER BY ${order} LIMIT 3000) ` +
            `WHERE time <= now() ` +
            `GROUP BY time(${t}s) fill(none) LIMIT 1`;
        return q;
    }

    async _transformInfluxData(resultsPromise, measurements) {
    // Transforms data to simpler format, cutting the irrelevant parts out
        let results = await resultsPromise;
        if (typeof results.group != 'undefined') {
            // fixing single-query objects by putting it into an array of 1
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

///////////////////////////////////////////////////////////////
    async getInfluxDataAsync(subscribeList, dataStart, dataEnd) {
        // measurements
        let measurements = await this._getMeasurements(subscribeList);

        // queries
        let duration = this._getResolution(dataStart, dataEnd);
        let qStart = measurements.map(m => {
            return this._makeEdgeQuery(m, duration, true);
        });
        let qEnd = measurements.map(m => {
            return this._makeEdgeQuery(m, duration, false);
        });
        let qData = measurements.map(m => {
            return this._makeDataQuery(m, dataStart, dataEnd);
        });

        // data
        let dbData;
        if ((typeof dataStart !== 'undefined') && (typeof dataStart !== 'undefined')) {
            let dbStart;
            let dbEnd;
            [dbData, dbStart, dbEnd] = await Promise.all([
                this._transformInfluxData(this.influx.query(qData), measurements),
                this._transformInfluxData(this.influx.query(qStart), measurements),
                this._transformInfluxData(this.influx.query(qEnd), measurements)
            ]);
            Object.keys(dbStart).forEach(function(key) {
                dbStart[key][0][1] = null;
            });
            Object.keys(dbEnd).forEach(function(key) {
                dbEnd[key][0][0] = Math.ceil(dbEnd[key][0][0]/1000000)*1000000
                dbEnd[key][0][1] = null;
            });

            Object.keys(dbData).forEach(function(key) {
                dbData[key] = dbStart[key].concat(dbData[key]).concat(dbEnd[key]);
            });
        } else {
            let dbStart;
            [dbData, dbStart] = await Promise.all([
                this._transformInfluxData(this.influx.query(qData), measurements),
                this._transformInfluxData(this.influx.query(qStart), measurements)
            ]);
            Object.keys(dbData).forEach(function(key) {
                dbData[key] = dbStart[key].concat(dbData[key]);
            });
        }
        return dbData;
    }
}

module.exports = db;