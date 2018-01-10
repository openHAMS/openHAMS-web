'use strict'

const jsonfile = require('jsonfile');

function pick(o, ...fields) {
    return fields.reduce((a, x) => {
        if(o.hasOwnProperty(x)) a[x] = o[x];
        return a;
    }, {});
}

function distinct(list) {
    // distinct - get unique values
    return list.filter((v, i, a) => a.indexOf(v) === i);
}


class ConfigHandler {
    constructor(filename) {
        this.config = jsonfile.readFileSync(filename, 'utf8');
        this.cards = this.config.cards;
        let dirtyChannels = this.cards.map(card => card.cardData.channel);
        this.allChannels = distinct(dirtyChannels);
    }

    getAllChannels() {
        return this.allChannels;
    }

    getCardInfos() {
        // filter everything except name, type and cardData
        let cardInfos = this.cards.map(card => pick(card, 'name', 'type', 'cardData'));
        return cardInfos;
    }

    getMqttChannel(cardname) {
        let selectedCards = this.config.cards
            .filter(card => card.name === cardname);
        return selectedCards.length === 1 ? selectedCards[0].cardData.channel : null;
    }
}

module.exports = ConfigHandler;