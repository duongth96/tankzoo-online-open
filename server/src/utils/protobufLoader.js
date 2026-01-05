const protobuf = require('protobufjs');
const path = require('path');

let Movement, Shoot;

// Adjust path to where the proto file is located relative to this file
// server/src/utils -> ../../../public/assets/game.proto
const PROTO_PATH = path.join(__dirname, '../../../public/assets/game.proto');

const loadProtobufs = () => {
    return new Promise((resolve, reject) => {
        protobuf.load(PROTO_PATH, (err, root) => {
            if (err) {
                console.error("Failed to load protobuf:", err);
                return reject(err);
            }
            Movement = root.lookupType("game.Movement");
            Shoot = root.lookupType("game.Shoot");
            console.log("Protobuf definitions loaded.");
            resolve({ Movement, Shoot });
        });
    });
};

module.exports = {
    loadProtobufs,
    getMovement: () => Movement,
    getShoot: () => Shoot
};
