const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');
const Influx = require('influx');


function writeDatabase(measurement, room, value) {
    influx.writePoints([{
        measurement: measurement,
        tags: {
            room: room
        },
        fields: {
            value: value
        },
    }]).catch(err => {
        console.error(`Error saving data to InfluxDB! ${err.stack}`);
    });
}

function messageCallback(topic, message) {
    let arr = topic.toString().split('/');
    // home, rcr, sensors, bmp180, temperature
    writeDatabase(arr[4], arr[1], message);
}


client.on('connect', function() {
    client.subscribe('home/#');
})

const influx = new Influx.InfluxDB({
    host: 'localhost',
    database: 'sensors',
    schema: [{
            measurement: 'pressure',
            fields: {
                value: Influx.FieldType.FLOAT
            },
            tags: [
                'room'
            ]
        },
        {
            measurement: 'temperature',
            fields: {
                value: Influx.FieldType.FLOAT
            },
            tags: [
                'room'
            ]
        },
        {
            measurement: 'rgbled',
            fields: {
                value: Influx.FieldType.STRING
            },
            tags: [
                'room'
            ]
        }
    ]
});

async function createDatabase() {
    return influx.createDatabase('sensors')
        .then();
}

influx.getDatabaseNames()
    .then(names => {
        if (!names.includes('sensors')) {
            return createDatabase();
        }
    })
    .then(() => {
        console.log("listening...");
        client.on('message', messageCallback);
    })
    .catch(err => {
        console.error(`Error creating Influx database!`);
    });
