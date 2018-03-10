'use strict'
const _ = require('lodash')
const gameWorldConfig = require('../config/gameworld')
const GameWorld = require('../managers/gameworld')

module.exports = class {

    constructor(name, socket) {
        this.name = name
        this.gameWorld = new GameWorld(socket, gameWorldConfig)
    }

    addPlayer(player) {
        // this.randomInt(-250, 250), 500, this.randomInt(-250, 200)
        this.gameWorld.players.push(player)
        console.log('Player', player.playerID, 'has joined', this.name)
    }

    removePlayer() {
        _.remove(this.gameWorld.players, player => player.playerID === this.socket.playerID)
    }
}