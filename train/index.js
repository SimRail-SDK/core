"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Train = void 0;
const Common = require("../common");
const server_1 = require("../server");
const station_1 = require("../station");
const liveData_1 = require("./liveData");
const timetable_1 = require("./timetable");
class Train {
    get data() {
        this.checkDestroyed();
        const data = {
            continuesAs: this.continuesAs,
            destination: this.destination,
            id: this.id,
            intNumber: this.intNumber,
            length: this.length,
            liveData: this._liveData.timestamp !== -1 ? this.liveData.data : undefined,
            locoType: this.locoType,
            name: this.name,
            number: this.number,
            origin: this.origin,
            serverCode: this.serverCode,
            weight: this.weight,
        };
        return data;
    }
    get liveData() {
        this.checkDestroyed();
        if (this._liveData === null) {
            throw Common.exception("LiveDataUndefinedError", `The "LiveData" class hasn't been loaded yet!`);
        }
        return this._liveData;
    }
    get timetable() {
        this.checkDestroyed();
        if (this._timetable === null) {
            throw Common.exception("TimetableUndefinedError", `The "Timetable" class hasn't been loaded yet!`);
        }
        return this._timetable;
    }
    constructor(config, callback) {
        this.destination = null;
        this.id = null;
        this.intNumber = null;
        this.length = null;
        this.locoType = null;
        this.name = null;
        this.origin = null;
        this.weight = null;
        this.destroyed = false;
        this.updateLiveDataInstance = null;
        this._liveData = null;
        this._timetable = null;
        this.sdk = config.sdk;
        this.number = config.number;
        this.serverCode = config.serverCode;
        if (config.liveData !== undefined && config.timetableData !== undefined) {
            this.updateLiveData(config.liveData).then(() => this.updateTimetableData(config.timetableData).then(() => callback(this)));
        }
        else {
            this.update().then(callback);
        }
    }
    destroy() {
        this.checkDestroyed();
        this.destroyed = true;
        this._timetable.destroy();
        this._liveData.destroy();
    }
    async server() {
        return await this.sdk.server(this.serverCode);
    }
    async switchServer(serverCode) {
        return await Train.get({ sdk: this.sdk, number: this.number, serverCode });
    }
    toJson() {
        return JSON.stringify(this.data);
    }
    async update() {
        this.checkDestroyed();
        let liveData = null;
        try {
            liveData = await this.sdk.api.getActiveTrain(this.serverCode, this.number);
        }
        catch (_) { }
        await this.updateLiveData(liveData);
        const timetableData = await this.sdk.api.getTimetable(this.serverCode, this.number);
        await this.updateTimetableData(timetableData);
        return this;
    }
    checkDestroyed() {
        if (this.destroyed === true) {
            throw Common.exception("ObjectDestroyedError", `Object can't be used after it's been destroyed!`);
        }
    }
    async updateLiveData(data) {
        if (this.id === null) {
            this._liveData = await Train.LiveData.get({ sdk: this.sdk, getUpdateDataFunction: (func) => this.updateLiveDataInstance = func, train: this, data });
        }
        else if (data !== null && this.id !== data.runId) {
            throw Common.exception("TrainIdMismatchError", `Train ID has changed since last update!`);
        }
        else {
            this.updateLiveDataInstance(data);
        }
    }
    async updateTimetableData(data) {
        if (this.id === null) {
            this._timetable = await Train.Timetable.get({ data: data.timetable, sdk: this.sdk, train: this });
            this.continuesAs = data.continuesAs;
            this.destination = { arrivesAt: data.endsAt, stationName: data.endStation };
            this.id = data.runId;
            this.intNumber = data.trainNoInternational;
            this.length = data.trainLength;
            this.locoType = data.locoType;
            this.name = data.trainName;
            this.origin = { departsAt: data.startsAt, stationName: data.startStation };
            this.weight = data.trainWeight;
        }
        else if (this.id !== data.runId) {
            throw Common.exception("TrainIdMismatchError", `Train ID has changed since last update!`);
        }
    }
}
exports.Train = Train;
(function (Train) {
    Train.LiveData = liveData_1.default;
    Train.Server = server_1.default;
    Train.Station = station_1.default;
    Train.Timetable = timetable_1.default;
    async function get(config) {
        return new Promise((resolve, reject) => { try {
            new Train(config, resolve);
        }
        catch (error) {
            reject(error);
        } });
    }
    Train.get = get;
})(Train || (exports.Train = Train = {}));
exports.default = Train;
//# sourceMappingURL=index.js.map