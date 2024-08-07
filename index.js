"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sdk = void 0;
const api_1 = require("@simrail-sdk/api");
const Common = require("./common");
const server_1 = require("./server");
const station_1 = require("./station");
const train_1 = require("./train");
class Sdk {
    constructor(config) {
        this.serverMap = {};
        this.api = config.api instanceof Sdk.Api ? config.api : new Sdk.Api(config.api);
    }
    async server(serverCode) {
        let server;
        if (this.serverMap === undefined) {
            await this.servers();
        }
        server = this.serverMap[serverCode];
        if (server !== undefined) {
            return server;
        }
        try {
            const data = await this.api.getActiveServer(serverCode);
            return this.serverMap[serverCode] = await Sdk.Server.get({ data, sdk: this, code: serverCode });
        }
        catch (error) {
            throw Common.exception("InvalidServerCodeError", `Server with code "${serverCode}" doesn't exist!`);
        }
    }
    async servers() {
        const servers = this.serverMap;
        const results = await this.api.getActiveServers();
        for (const data of results) {
            const serverCode = data.serverCode;
            if (servers[serverCode] === undefined) {
                servers[serverCode] = await Sdk.Server.get({ data, sdk: this, code: serverCode });
            }
        }
        this.serverMap = servers;
        return Object.freeze(Object.assign({}, servers));
    }
    async station(serverCode, stationCode) {
        return await (await this.server(serverCode)).station(stationCode);
    }
    async stations(serverCode) {
        return await (await this.server(serverCode)).stations();
    }
    async train(serverCode, trainNumber) {
        return await (await this.server(serverCode)).train(trainNumber);
    }
}
exports.Sdk = Sdk;
(function (Sdk) {
    Sdk.VERSION = "0.1.0";
    Sdk.Api = api_1.default;
    Sdk.Server = server_1.default;
    Sdk.Station = station_1.default;
    Sdk.Train = train_1.default;
})(Sdk || (exports.Sdk = Sdk = {}));
exports.default = Sdk;
//# sourceMappingURL=index.js.map