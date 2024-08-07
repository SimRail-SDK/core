"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const __1 = require("..");
const Common = require("../common");
const train_1 = require("../train");
class Server {
    get data() {
        const { code, id, isActive, name, region } = this;
        return { code, id, isActive, name, region };
    }
    get isActive() {
        return this._isActive;
    }
    constructor(config, callback) {
        this.id = null;
        this.name = null;
        this.region = null;
        this.stationMap = {};
        this._isActive = false;
        this.sdk = config.sdk;
        this.code = config.code;
        if (config.data === undefined) {
            this.update().then(callback);
        }
        else {
            this.updateData(config.data);
            callback(this);
        }
    }
    async activeTrainNumbers() {
        const trainNumbers = [];
        const trains = await this.sdk.api.getActiveTrains(this.code);
        trains.forEach((train) => trainNumbers.push(train.trainNoLocal));
        return trainNumbers;
    }
    async station(stationCode) {
        let station;
        if (this.stationMap === undefined) {
            await this.stations();
        }
        station = this.stationMap[stationCode];
        if (station !== undefined) {
            return station;
        }
        try {
            const data = await this.sdk.api.getActiveStation(this.code, stationCode);
            return this.stationMap[stationCode] = await __1.Sdk.Station.get({
                data, sdk: this, code: stationCode, serverCode: this.code,
            });
        }
        catch (error) {
            throw Common.exception("InvalidStationCodeError", `Station with code "${stationCode}" doesn't exist!`);
        }
    }
    async stations() {
        const stations = this.stationMap;
        const results = await this.sdk.api.getActiveStations(this.code);
        for (const data of results) {
            const stationCode = data.code;
            if (stations[stationCode] === undefined) {
                stations[stationCode] = await __1.Sdk.Station.get({
                    data, sdk: this, code: stationCode, serverCode: this.code,
                });
            }
        }
        this.stationMap = stations;
        return Object.freeze(Object.assign({}, stations));
    }
    toJson() {
        return JSON.stringify(this.data);
    }
    async train(number) {
        return await Server.Train.get({ sdk: this.sdk, number, serverCode: this.code });
    }
    async update() {
        this.updateData(await this.sdk.api.getActiveServer(this.code));
        return this;
    }
    updateData(data) {
        if (this.code !== data.serverCode) {
            throw Common.exception("ServerCodeMismatchError", `The update data presented doesn't belong to this server!`);
        }
        else if (this.id === null) {
            this.id = data.id;
            this.name = data.serverName;
            this.region = data.serverRegion;
        }
        else if (this.id !== data.id) {
            throw Common.exception("ServerIdMismatchError", `Server ID has changed since last update!`);
        }
        this._isActive = data.isActive;
    }
}
exports.Server = Server;
(function (Server) {
    Server.Train = train_1.default;
    async function get(config) {
        return new Promise((resolve, reject) => { try {
            new Server(config, resolve);
        }
        catch (error) {
            reject(error);
        } });
    }
    Server.get = get;
})(Server || (exports.Server = Server = {}));
exports.default = Server;
//# sourceMappingURL=index.js.map