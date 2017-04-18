var chart;

Highcharts.setOptions({
    global: {
        useUTC: false
    }
});

function afterSetExtremes(e) {
    console.log(e.min, e.max);
}

function loadGraph(history) {
    var seriesOptions = [];
    seriesOptions[0] = {
        color: Highcharts.getOptions().colors[1],
        data: history["pressure"],
        name: 'Pressure',
        tooltip: { valueSuffix: ' hPa' },
        yAxis: 0
    };
    seriesOptions[1] = {
        color: Highcharts.getOptions().colors[0],
        data: history["temperature"],
        name: 'Temperature',
        tooltip: { valueSuffix: ' ℃' },
        yAxis: 1
    };
    chartSettings.series = seriesOptions;
    chartSettings.xAxis['events']['afterSetExtremes'] = afterSetExtremes;
    chart = new Highcharts.StockChart(chartSettings);
}
