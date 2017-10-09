var defaultChartSettings = {
    chart: {
        alignTicks: false,
        ignoreHiddenSeries: false,
        margin: [10, 25, 15, 25],
        type: 'spline',
        pinchType: 'none',
        zoomType: 'none',
        events: {}
    },
    credits: false,
    navigator: {
        enabled: false
    },
    plotOptions: {
        //connectNulls: false,
        series: {
            dataGrouping: { enabled: false },
            gapSize: 4
        }
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
    scrollbar: {
        enabled: true,
        liveRedraw: false
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
