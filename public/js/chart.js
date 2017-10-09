'use strict';

class Chart {
    constructor(cardData, url) {
        // variable containing Highstock chart object
        this.chart;
        this.cardData = cardData;
        this.url = String(url);
        this.loaded = false;
        // name of render place
        //this.containerID = containerID;
    }

    initChart() {
        // MUST init with data
        $.getJSON(this._getExtremesUrl(), extremes => {
            // copy default settings
            let settings = JSON.parse(JSON.stringify(defaultChartSettings));
            // settings
            settings.chart.renderTo = String(this.cardData.chart.name);
            settings.chart.events.load = () => {
                this.loaded = true;
            };
            settings.rangeSelector.selected = 3;
            settings.series = this._generateSeriesSettings(this.cardData, extremes);
            settings.yAxis = this._generateYAxisSettings(this.cardData);
            // bind to 'this'
            settings.xAxis.events.afterSetExtremes = this._afterSetExtremesHandler.bind(this);
            this.chart = new Highcharts.StockChart(settings);
            this.loadData();
        });
    }

    fabHandler() {
        if (typeof this.cardData.fab !== 'undefined' && typeof this.cardData.fab.function !== 'undefined') {
            let fabAction = new Function('self', this.cardData.fab.function);
            fabAction(this);
        }
    }

    loadData(jsonArgsObj) {
        this.chart.showLoading('Loading data from server...');
        console.log("http://racerzeroone.duckdns.org/" + this._getDataUrl(jsonArgsObj));
        $.getJSON(this._getDataUrl(jsonArgsObj), data => {
            this._setData(data, true, false, false);
            this.chart.hideLoading();
            //this.chart.reflow();
            console.log("loaded")
        });
    }

    _afterSetExtremesHandler(e) {
        console.log(e.trigger);
        if (e.trigger !== undefined) {
            let start = new Date(e.min);
            let end = new Date(e.max);
            console.log(`min: ${start.getHours()}:${start.getMinutes()}:${start.getSeconds()} : ${e.min}`);
            console.log(`max: ${  end.getHours()}:${  end.getMinutes()}:${  end.getSeconds()} : ${e.max}`)
            let rangeStart = (Math.ceil(e.min / 10) * 10);
            let rangeEnd = (Math.ceil(e.max / 10) * 10);
            let argsObj = {
                start: rangeStart,
                end: rangeEnd
            };
            this.loadData(argsObj);
        }
    }

    _getDataUrl(argsObj) {
        // 'jsonp' + '?' + (arg0 + '&') + (arg1 + '&') + 'callback=?'
        argsObj = new Object(argsObj);
        Object.assign(argsObj, {
            callback: '?'
        });
        let args = Object.keys(argsObj)
            .map(argKey => {
                return `${argKey}=${argsObj[argKey]}`;
            })
            .join('&');
        return `${this.url}/data2?${args}`;
    }

    _getExtremesUrl() {
        return `${this.url}/extremes`;
    }

    _setData(data, allSeries) {
        this.cardData.fields.forEach(field => {
            let allSeries = this.chart.series;
            let lcname = field.name.toLowerCase();
            let series = this._getSeriesByName(allSeries, lcname);
            //series.setData(data[lcname].slice(1, -1));
            //series.setData(data[lcname]);
            //this.chart.series[0].setData(data[lcname], true, false, false);
            this.chart.series[0].setData(data[lcname]);
            this.chart.reflow();
            this.chart.redraw();
        });
    }

    _getAxisIDByTitle(axesData, title) {
        return axesData.findIndex(axisData => {
            return axisData.fieldID === title;
        });
    }

    _getFieldByID(fields, id) {
        return fields.find(field => {
            return field.id === id;
        });
    }

    _getSeriesByName(allSeries, name) {
        return allSeries.find(series => {
            return series.name.toLowerCase() === name.toLowerCase();
        });
    }

    _generateSeriesSettings(cardData, extremes) {
        let seriesSettings = [];
        cardData.fields.forEach(field => {
            let yAxisID = this._getAxisIDByTitle(cardData.chart.yAxis, field.id);
            seriesSettings.push({
                colorIndex: parseInt(cardData.chart.yAxis[yAxisID].color),
                cropThreshold: 10000,
                //data: data[field.name.toLowerCase()].slice(1, -1),
                data: [],
                name: field.name,
                tooltip: {
                    valueSuffix: ` ${field.unit}`
                },
                yAxis: yAxisID
            });
        });
        // adding hidden series (on hidden yAxis) for extremes
        cardData.fields.forEach(field => {
            //let edges = data[field.name.toLowerCase()].slice(0, 1).concat(data[field.name.toLowerCase()].slice(-2, -1));
            seriesSettings.push({
                data: extremes[field.name.toLowerCase()],
                visible: false,
                yAxis: cardData.fields.length
            });
        });
        return seriesSettings;
        //seriesOptions[0] = {
        //    colorIndex: 1,
        //    data: data["pressure"],
        //    name: 'Pressure',
        //    tooltip: {
        //        valueSuffix: ' hPa'
        //    },
        //    yAxis: 0
        //};
        //seriesOptions[1] = {
        //    colorIndex: 0,
        //    data: data["temperature"],
        //    name: 'Temperature',
        //    tooltip: {
        //        valueSuffix: ' ℃'
        //    },
        //    yAxis: 1
        //};
    }

    _generateYAxisSettings(cardData) {
        let yAxisSettings = [];
        cardData.chart.yAxis.forEach((axis, index) => {
            const field = this._getFieldByID(cardData.fields, axis.fieldID);
            yAxisSettings.push({
                className: `highcharts-color-${axis.color}`,
                labels: {
                    align: index % 2 ? 'left' : 'right',
                    format: `{value:.1f}${field.unit}`,
                    reserveSpace: false,
                    x: 0
                },
                minRange: 2,
                title: {
                    text: field.name
                },
                opposite: !(index % 2)
            });
        });
        // adding hidden axis for extremes
        yAxisSettings.push({
            visible: false
        });
        return yAxisSettings;
        //yAxis[0] = {
        //    className: 'highcharts-color-1',
        //    labels: {
        //        align: 'right',
        //        format: '{value:.1f}hPa',
        //        reserveSpace: false,
        //        x: 0
        //    },
        //    minRange: 2,
        //    title: { text: 'Pressure' },
        //    opposite: true
        //};
        //yAxis[1] = {
        //    className: 'highcharts-color-0',
        //    labels: {
        //        align: 'left',
        //        format: '{value:.1f}°C',
        //        reserveSpace: false,
        //        x: 0
        //    },
        //    minRange: 2,
        //    title: { text: 'Temperature' },
        //    opposite: false
        //};
    }
}
