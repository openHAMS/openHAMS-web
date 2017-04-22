var chart;

Highcharts.setOptions({
    global: {
        useUTC: false
    }
});

var stillUpdating = false;

function addFirst(data) {
    data.splice(0, 0, [1492300800000, null]);
    return data;
}

function afterSetExtremes(e) {
    if (!stillUpdating) {
        var currExMin = (Math.round(e.min / 1000) * 1000);
        var currExMax = (Math.round(e.max / 100) * 100);
        stillUpdating = true;
        chart.showLoading('Loading data from server...');
        $.getJSON('jsonp?start=' + currExMin +
            '&end=' + currExMax + '&callback=?',
            function(data) {
                chart.series[0].setData(addFirst(data["pressure"]));
                chart.series[1].setData(addFirst(data["temperature"]));
                chart.hideLoading();
                stillUpdating = false;
            });
    }
}

function loadGraph(history) {
    var seriesOptions = [];
    seriesOptions[0] = {
        color: Highcharts.getOptions().colors[1],
        data: addFirst(history["pressure"]),
        name: 'Pressure',
        tooltip: {
            valueSuffix: ' hPa'
        },
        yAxis: 0
    };
    seriesOptions[1] = {
        color: Highcharts.getOptions().colors[0],
        data: addFirst(history["temperature"]),
        name: 'Temperature',
        tooltip: {
            valueSuffix: ' ℃'
        },
        yAxis: 1
    };
    chartSettings.series = seriesOptions;
    chartSettings.xAxis['events']['afterSetExtremes'] = afterSetExtremes;
    chart = new Highcharts.StockChart(chartSettings);
}
