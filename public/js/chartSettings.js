var defaultChartSettings = {
    chart: {
        defaultSeriesType: 'spline',
        margin: [10, 25, 15, 25],
        style: {
            fontFamily: 'Roboto',
            fontWeight: 400
        },
        events: {}
    },
    credits: {
        position: {
            align: 'left',
            x: 20
        }
    },
    navigator: {
        enabled: false
    },
    rangeSelector: {
        allButtonsEnabled: true,
        buttons: [{
                type: 'minute',
                count: 1,
                text: '1m'
            },
            {
                type: 'minute',
                count: 60,
                text: '1h'
            },
            {
                type: 'minute',
                count: 180,
                text: '3h'
            },
            {
                type: 'minute',
                count: 360,
                text: '6h'
            },
            {
                type: 'minute',
                count: 720,
                text: '12h'
            },
            {
                type: 'day',
                count: 1,
                text: '24h'
            },
            {
                type: 'week',
                count: 1,
                text: 'week'
            }
        ]
    },
    plotOptions: {
        series: {
            gapSize: 0
        }
    },
    scrollbar: {
        enabled: true
    },
    xAxis: {
        events: {},
        ordinal: true
    },
    tooltip: {
        valueDecimals: 2
    },
    yAxis: []
};
