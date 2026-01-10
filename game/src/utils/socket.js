import { io } from "socket.io-client";
import { EVENTS } from "../constants/events";
import { GameConfig } from "../config";

class SocketClient {
    constructor() {
        this.socket = null;
        this.mapSeed = null;
        this.bufferedPlayers = null;
        this.bufferedObstacles = null;
        this.bufferedPowerUps = null;
    }

    connect(playerName) {
        // Use the configured server URL
        const serverUrl = GameConfig.SERVER_URL;
        
        // Detect device type
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const deviceType = isMobile ? 'mobile' : 'pc';

        this.socket = io(serverUrl, {
            transports: ['polling', 'websocket'],
            upgrade: true,
            reconnectionAttempts: 5,
            query: {
                name: playerName,
                deviceType: deviceType
            }
        });
        
        // Buffer MAP_SEED to avoid race condition before game scene registers listeners
        this.socket.on(EVENTS.MAP_SEED, (seed) => {
            this.mapSeed = seed;
        });
        
        // Buffer initial state payloads
        this.socket.on(EVENTS.CURRENT_PLAYERS, (players) => {
            this.bufferedPlayers = players;
        });
        this.socket.on(EVENTS.CURRENT_OBSTACLES, (obstacles) => {
            this.bufferedObstacles = obstacles;
        });
        this.socket.on(EVENTS.CURRENT_POWERUPS, (powerUps) => {
            this.bufferedPowerUps = powerUps;
        });
        return this.socket;
    }

    getSocket() {
        return this.socket;
    }
    
    getMapSeed() {
        return this.mapSeed;
    }
    
    consumeInitialState() {
        const state = {
            players: this.bufferedPlayers,
            obstacles: this.bufferedObstacles,
            powerUps: this.bufferedPowerUps,
            mapSeed: this.mapSeed
        };
        // Clear buffers after consuming
        this.bufferedPlayers = null;
        this.bufferedObstacles = null;
        this.bufferedPowerUps = null;
        return state;
    }

    emit(event, data) {
        if (this.socket) this.socket.emit(event, data);
    }

    on(event, callback) {
        if (this.socket) this.socket.on(event, callback);
    }
}

export const socketClient = new SocketClient();
