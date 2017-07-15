'use strict';

class Chart {
    constructor(cardData, url) {
        // variable containing Highstock chart object
        this.chart;
        this.cardData = cardData;
        this.url = String(url);
        // name of render place
        //this.containerID = containerID;
    }

    initChart() {
        // MUST init with data
        $.getJSON(this._getJsonpUrl(), data => {
            // copy default settings
            let settings = JSON.parse(JSON.stringify(defaultChartSettings));

            settings.chart.renderTo = String(this.cardData.chart.name);
            settings.rangeSelector.selected = 3;
            settings.series = this._generateSeriesSettings(this.cardData, data);
            settings.yAxis = this._generateYAxisSettings(this.cardData);
            //chartSettings.xAxis.events.afterSetExtremes = afterSetExtremes;
            this.chart = new Highcharts.StockChart(settings);
        });
    }

    loadData() {
        this.chart.showLoading('Loading data from server...');
        $.getJSON(this._getJsonpUrl, data => {
            this._setData(data);
            this.chart.hideLoading();
            this.chart.reflow();
        });
    }

    _getJsonpUrl(argsObj) {
        // 'jsonp' + '?' + (arg0 + '&') + (arg1 + '&') + 'callback=?'
        argsObj = new Object(argsObj);
        Object.assign(argsObj, { callback: '?' });
        return (this.url + '?' + (
            Object.keys(argsObj)
            .map(argKey => {
                return `${argKey}=${argsObj[argKey]}`;
            })
            .join('&')));
    }

    _setData(data, allSeries) {
        this.cardData.fields.forEach(field => {
            let allSeries = this.chart.series;
            let lcname = field.name.toLowerCase();
            let series = this._getSeriesByName(allSeries, lcname);
            series.setData(data[lcname]);
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
    

    _generateSeriesSettings(cardData, data) {
        let seriesSettings = [];
        cardData.fields.forEach(field => {
            let yAxisID = this._getAxisIDByTitle(cardData.chart.yAxis, field.id);
            seriesSettings.push({
                colorIndex: cardData.chart.yAxis[yAxisID].color,
                data: data[field.name.toLowerCase()],
                name: field.name,
                tooltip: {
                    valueSuffix: ` ${field.unit}`
                },
                yAxis: yAxisID
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
                title: { text: field.name },
                opposite: !(index % 2)
            });
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
