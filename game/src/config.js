export const GameConfig = {
    // In production (Docker/Nginx), use relative path to let Nginx proxy handle it
    // In development, use specific server URL
    SERVER_URL: import.meta.env.PROD ? '' : 'http://192.168.1.145:3000'
};
