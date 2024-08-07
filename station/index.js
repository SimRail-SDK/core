"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Station = void 0;
const Common = require("../common");
const server_1 = require("../server");
class Station {
    get dispatchers() {
        return this._dispatchers;
    }
    get data() {
        return {
            code: this.code,
            difficultyLevel: this.difficultyLevel,
            dispatchers: this.dispatchers,
            id: this.id,
            images: this.images,
            latitude: this.latitude,
            longitude: this.longitude,
            name: this.name,
            prefix: this.prefix,
            serverCode: this.serverCode,
        };
    }
    constructor(config, callback) {
        this.difficultyLevel = null;
        this.id = null;
        this.images = null;
        this.latitude = null;
        this.longitude = null;
        this.name = null;
        this.prefix = null;
        this._dispatchers = null;
        this.sdk = config.sdk;
        this.code = config.code;
        this.serverCode = config.serverCode;
        if (config.data === undefined) {
            this.update().then(callback);
        }
        else {
            this.updateData(config.data);
            callback(this);
        }
    }
    async server() {
        return await this.sdk.server(this.serverCode);
    }
    async switchServer(serverCode) {
        return await (await this.sdk.server(serverCode)).station(this.code);
    }
    toJson() {
        return JSON.stringify(this.data);
    }
    async update() {
        this.updateData(await this.sdk.api.getActiveStation(this.serverCode, this.code));
        return this;
    }
    updateData(data) {
        if (this.id === null) {
            this.difficultyLevel = data.difficultyLevel;
            this.id = data.id;
            this.latitude = data.latitude;
            this.longitude = data.longitude;
            this.name = data.name;
            this.prefix = data.prefix;
            this.images = {
                primary: data.mainImageURL,
                secondary: [
                    data.additionalImage1URL,
                    data.additionalImage2URL,
                ],
            };
        }
        else if (this.id !== data.id) {
            throw Common.exception("StationIdMismatchError", `Station ID has changed since last update!`);
        }
        if (data.dispatchedBy !== undefined && data.dispatchedBy.length > 0) {
            this._dispatchers = [];
            data.dispatchedBy.forEach((dispatcher) => this._dispatchers.push({ steamId: dispatcher.steamId }));
        }
    }
}
exports.Station = Station;
(function (Station) {
    Station.Server = server_1.default;
    async function get(config) {
        return new Promise((resolve, reject) => { try {
            new Station(config, resolve);
        }
        catch (error) {
            reject(error);
        } });
    }
    Station.get = get;
})(Station || (exports.Station = Station = {}));
exports.default = Station;
//# sourceMappingURL=index.js.map