'use strict';

class SensorCard {
    constructor(socket, name, config, url) {
        this.name = name;
        this.config = config;
        this.url = url;
        
        // chart
        if (this.config.hasOwnProperty('chart')) {
            this.chartHandler = new ChartHandler(`${this.name}-chart`, this.config.chart, url);
            this.chartHandler.initChart();
        }
        // fab
        if (this.config.hasOwnProperty('fab')) {
            this.fabAction = new Function('self', this.config.fab.function);
            document.getElementById(`${name}-fab`).addEventListener('click', () => { this.fabAction(this.chartHandler); });
        }
        // fields
        if (this.config.hasOwnProperty('fields')) {
            config.fields.forEach(field => {
                socket.on(field.channel, function(t) {
                    document.getElementById(field.id).textContent = parseFloat(t).toFixed(1);
                });
            });
        }
    }
}

// global chart settings
Highcharts.setOptions({
    global: {
        useUTC: false
    }
});

class ChartHandler {
    constructor(chartContainer, chartData, url) {
        // variable containing Highstock chart object
        this.chart;
        this.chartContainer = chartContainer;
        this.chartData = chartData;
        this.url = url;
        this.loaded = false;
    }

// PUBLIC functions
    initChart() {
        // MUST init with data
        $.getJSON(this._getExtremesUrl(), extremes => {
            // copy default settings
            let settings = JSON.parse(JSON.stringify(defaultChartSettings));
            // settings
            settings.chart.renderTo = this.chartContainer;
            settings.chart.events.load = () => {
                this.loaded = true;
            };
            settings.rangeSelector.selected = 3;
            settings.yAxis = this._generateYAxisSettings(this.chartData);
            settings.series = this._generateSeriesSettings(this.chartData, extremes);
            // bind to 'this'
            settings.xAxis.events.afterSetExtremes = this._afterSetExtremesHandler.bind(this);
            this.chart = new Highcharts.StockChart(settings);
            this.loadData();
        });
    }
    
    loadData(jsonArgsObj) {
        this.chart.showLoading('Loading data from server...');
        console.log("http://racerzeroone.duckdns.org/" + this._getDataUrl(jsonArgsObj));
        $.getJSON(this._getDataUrl(jsonArgsObj), data => {
            this._setData(data);
            this.chart.hideLoading();
            //this.chart.reflow();
            console.log("loaded")
        });
    }
    
// URL generators
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
        return `${this.url}/data?${args}`;
    }
    
    _getExtremesUrl() {
        return `${this.url}/extremes`;
    }

// SETTINGS generators
    _generateSeriesSettings(chartData, extremes) {
        let seriesSettings = [];
        chartData.series.forEach((series, index) => {            
            // add real series for visible chart
            seriesSettings.push({
                colorIndex: parseInt(series.color),
                cropThreshold: 1000000,
                data: [],
                name: series.name,
                tooltip: {
                    valueSuffix: ` ${series.unit}`
                },
                yAxis: index
            });
        });
        chartData.series.forEach((series, index) => {
            // add hidden series (on hidden yAxis) for extremes
            seriesSettings.push({
                data: extremes[series.name.toLowerCase()],
                visible: false,
                yAxis: chartData.series.length + index
            });
        });
        return seriesSettings;
    }

    _generateYAxisSettings(chartData) {
        let yAxisSettings = [];
        chartData.series.forEach((series, index) => {
            // add real, visible axes for visible series
            yAxisSettings.push({
                className: `highcharts-color-${series.color}`,
                labels: {
                    align: index % 2 ? 'left' : 'right',
                    format: `{value:.1f}${series.unit}`,
                    reserveSpace: false,
                    x: 0
                },
                minRange: 2,
                title: {
                    text: series.name
                },
                opposite: !(index % 2)
            });
        });
        chartData.series.forEach(() => {
            // add hidden axes for extremes
            yAxisSettings.push({
                visible: false
            });
        });

        return yAxisSettings;
    }

// EVENT handlers
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

// CHART SETTERS
    _setData(data) {
        this.chartData.series.forEach((series, index) => {
            this.chart.series[index].setData(data[series.name.toLowerCase()]);
            this.chart.reflow();
            this.chart.redraw();
        });
    }
}
