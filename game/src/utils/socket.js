import { io } from "socket.io-client";
import { EVENTS } from "../constants/events";
import { GameConfig } from "../config";

class SocketClient {
    constructor() {
        this.socket = null;
    }

    connect(playerName) {
        // Use the configured server URL
        const serverUrl = GameConfig.SERVER_URL || 'http://localhost:3000';
        
        this.socket = io(serverUrl, {
            transports: ['polling', 'websocket'],
            upgrade: true,
            reconnectionAttempts: 5,
            query: {
                name: playerName
            }
        });
        return this.socket;
    }

    getSocket() {
        return this.socket;
    }

    emit(event, data) {
        if (this.socket) this.socket.emit(event, data);
    }

    on(event, callback) {
        if (this.socket) this.socket.on(event, callback);
    }
}

export const socketClient = new SocketClient();
