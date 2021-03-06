'use strict'
const _ = require('lodash')
const axios = require('axios')
const DEFAULT_CONFIG = require('../config/gameworld')
const API = require('../constants/api')
const GAME_STATE = require('../constants/gamestate')
const gameEvents = require('../constants/events')
const GameManager = require('../managers/game')
const GameWorld = require('../managers/gameworld')

module.exports = class {
    constructor(io, name, id,config=DEFAULT_CONFIG) {
        this.io = io
        this.name = name
        this.id = id
        this.gameWorld = new GameWorld(this.io, config,this.id)
    }

    addPlayer(player) {
        this.gameWorld.players[player.playerID] = player
    }

    removePlayer(playerID) {
        delete this.gameWorld.players[playerID]

        if (!this.isFull() && this.gameWorld.isCountdown()) {
            this.gameWorld.setState(GAME_STATE.OPEN)
        }

        if (this.isEmpty()) {
            this.gameWorld.reset()
        }
    }

    canStartMatch() {
        let maxPlayer = this.gameWorld.getMaxPlayers()
        let numberOfplayerInRoom = _.size(this.getPlayers())
        let morethan_80 = numberOfplayerInRoom >= Math.floor(0.8 * (maxPlayer))
        return (morethan_80 && numberOfplayerInRoom >= 2 || this.isFull()) 
        && this.gameWorld.isOpen()
    }

    getPlayers() {
        return this.gameWorld.players
    }

    getPlayer(playerID) {
        return this.gameWorld.players[playerID]
    }

    isFull() {
        return _.size(this.getPlayers()) === this.gameWorld.getMaxPlayers()
    }

    isEmpty() {
        return _.size(this.getPlayers()) === 0
    }

    onCountdown() {
        let timeLeft = 10
        this.countdownInterval = setInterval(() => {
            if (!this.gameWorld.isCountdown()) {
                this.gameWorld.io.to(this.gameWorld.roomID).emit(gameEvents.interruptCountdown)
                return clearInterval(this.countdownInterval)
            }

            timeLeft -= 1
            this.gameWorld.io.to(this.gameWorld.roomID).emit(gameEvents.countdown, { d: [timeLeft] })
            if (timeLeft <= 0) this.prepareStartGame()
        }, this.gameWorld.config.countdownInterval)
    }

    prepareStartGame() {
        clearInterval(this.countdownInterval)
        this.gameWorld.io.to(this.gameWorld.roomID).emit(gameEvents.finishCountdown)
        this.gameWorld.setState(GAME_STATE.INGAME)
        this.gameWorld.duration = Date.now()
        this.onUpdateRoomInfo()

        let p = _.map(this.getPlayers(), player => {
            return player.userID
        })

        axios.post(API.MATCH, {
            players: p
        })
            .then((res) => {
                this.gameWorld.matchID = res.data.matchID
            })
            .catch((err) => {
                console.error(err)
            })
    }

    onUpdateRoomInfo() {
        let sendData = []
        _.map(GameManager.getRooms(), room => {
            let data = [
                room.id,
                room.name,
                _.size(room.getPlayers()),
                room.gameWorld.getMaxPlayers(),
                room.gameWorld.getState()
            ]

            sendData.push(data)
        })

        this.io.emit(gameEvents.updateRoom, { d: sendData })
    }
}