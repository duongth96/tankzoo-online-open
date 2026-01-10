class MapManager {
    constructor() {
        this.mapSeed = Math.random();
        this.maps = [
            { id: 'map_default', name: 'Default Map', seed: this.mapSeed, width: 4000, height: 4000 },
            { id: 'map_desert', name: 'Desert Storm', seed: 0.123456, width: 4000, height: 4000 },
            { id: 'map_forest', name: 'Deep Forest', seed: 0.987654, width: 4000, height: 4000 }
        ];
    }

    getMapSeed() {
        return this.mapSeed;
    }

    regenerateSeed() {
        this.mapSeed = Math.random();
        // Update default map seed
        this.maps[0].seed = this.mapSeed;
        return this.mapSeed;
    }

    getAvailableMaps() {
        return this.maps;
    }

    generateMapMatrix(seed, width = 4000, height = 4000, tileSize = 40) {
        let currentSeed = seed;
        // Linear Congruential Generator (LCG) matching client logic
        const random = () => {
            const a = 1664525;
            const c = 1013904223;
            const m = 4294967296;
            currentSeed = (a * currentSeed + c) % m;
            return currentSeed / m;
        };

        const matrix = [];
        const cols = Math.floor(width / tileSize);
        const rows = Math.floor(height / tileSize);

        for (let x = 0; x < cols; x++) {
            const row = [];
            for (let y = 0; y < rows; y++) {
                const r = random();
                let type = 'ground_grass';
                if (r > 0.8) type = 'ground_dirt';
                else if (r > 0.95) type = 'ground_sand';
                row.push(type);
            }
            matrix.push(row);
        }
        return matrix;
    }
}

module.exports = MapManager;
