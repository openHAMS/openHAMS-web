"use strict";
var chart;

Highcharts.setOptions({
    global: {
        useUTC: false
    }
});

var stillUpdating = false;

function afterSetExtremes(e) {
    console.log(e.trigger);
    if (e.trigger != 'undefined') {
        if (!stillUpdating) {
            let currExMin = (Math.round(e.min / 1000) * 1000);
            let currExMax = (Math.round(e.max / 100) * 100);
            stillUpdating = true;
            chart.showLoading('Loading data from server...');
            let jsonp = `jsonp?start=${currExMin}&end=${currExMax}&callback=?`;
            console.log(jsonp);
            $.getJSON(jsonp,
                function(data) {
                    chart.series[0].setData(data["pressure"]);
                    chart.series[1].setData(data["temperature"]);
                    chart.hideLoading();
                    chart.reflow();
                    stillUpdating = false;
                });
        }
    }
}

//var options = [
//    {name: 'Pressure', color: window.materialColors.brown['500'], unit: 'hPa'},
//    {name: 'Temperature', color: window.materialColors.indigo['500'], unit: '℃'}];
var chartID = 'container';

function loadGraph(data) {
    let seriesOptions = [];
    //options.forEach(function (option, index){
    //    seriesOptions.push({
    //
    //    });
    //});
    seriesOptions[0] = {
        colorIndex: 1,
        data: data["pressure"],
        name: 'Pressure',
        tooltip: {
            valueSuffix: ' hPa'
        },
        yAxis: 0
    };
    seriesOptions[1] = {
        colorIndex: 0,
        data: data["temperature"],
        name: 'Temperature',
        tooltip: {
            valueSuffix: ' ℃'
        },
        yAxis: 1
    };

    let yAxis = [];
    yAxis[0] = {
        className: 'highcharts-color-1',
        labels: {
            align: 'right',
            format: '{value:.1f}hPa',
            reserveSpace: false,
            x: 0
        },
        minRange: 2,
        title: { text: 'Pressure' },
        opposite: true
    };
    yAxis[1] = {
        className: 'highcharts-color-0',
        labels: {
            align: 'left',
            format: '{value:.1f}°C',
            reserveSpace: false,
            x: 0
        },
        minRange: 2,
        title: { text: 'Temperature' },
        opposite: false
    };

    // copying default settings
    let chartSettings = JSON.parse(JSON.stringify(defaultChartSettings));
    chartSettings.chart.renderTo = 'container';
    chartSettings.rangeSelector.selected = 3;

    chartSettings.series = seriesOptions;
    chartSettings.yAxis = yAxis;
    chartSettings.xAxis.events.afterSetExtremes = afterSetExtremes;
    chart = new Highcharts.StockChart(chartSettings);
}

class Chart {
    constructor(opts) {
        // variable containing Highstock chart object
        this.chart;
        // name of render place
        this.container;
        //
        this.settings;
    }

    _getFieldById(fields, id) {
        for (var field in fields) {
            if (field.id === id) {
                return field;
            }
        }
        return null;
    }

    _generateSeriesSettings(cardData, data) {
        let seriesSettings = [];
        cardData.fields.forEach((field) => {
            seriesSettings.push({
                colorIndex: 1,  // TODO: chart.yAxis ?? color
                data: field.name.toLowerCase(),  // change to data[]
                name: field.name,
                tooltip: {
                    valueSuffix: ` ${field.unit}`
                },
                yAxis: 0  // TODO: chart.yAxix ??
            });
        });
        return seriesSettings;
    }

    _generateYAxisSettings(cardData) {
        let yAxisSettings = [];
        const self = this;
        cardData.chart.yAxis.forEach((axis, index) => {
            const field = self._getFieldById(cardData.fields, axis.fieldId);
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
