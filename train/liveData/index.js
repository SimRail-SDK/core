"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveData = void 0;
const RXJS = require("rxjs");
const Common = require("../../common");
const __1 = require("..");
class LiveData {
    get data() {
        this.checkDestroyed();
        return {
            available: this.available,
            driver: this.driver,
            inPlayableArea: this.inPlayableArea,
            lastAvailableCheck: this.lastAvailableCheck,
            latitude: this.latitude,
            longitude: this.longitude,
            signal: this.signal,
            speed: this.speed,
            timestamp: this.timestamp,
            timetableIndex: this.timetableIndex,
            vehicles: this.vehicles,
        };
    }
    get autoUpdate() {
        this.checkDestroyed();
        return this._updateTimer !== undefined;
    }
    set autoUpdate(value) {
        this.checkDestroyed();
        if (this.autoUpdate !== value) {
            if (value === true) {
                this.start();
            }
            else {
                this.stop();
            }
        }
    }
    get autoUpdateInterval() {
        this.checkDestroyed();
        return this._autoUpdateInterval;
    }
    set autoUpdateInterval(value) {
        this.checkDestroyed();
        if (this._autoUpdateInterval !== value) {
            this._autoUpdateInterval = value;
            if (this.autoUpdate === true) {
                this.updateTimer = setInterval(async () => await this.update(), this.autoUpdateInterval);
            }
            this.events.next({
                autoUpdate: this.autoUpdate, autoUpdateInterval: value, liveData: this,
                type: LiveData.Event.Type.AutoUpdateIntervalChanged,
            });
        }
    }
    get available() {
        this.checkDestroyed();
        return this._available;
    }
    get driver() {
        this.checkDestroyed();
        return this._driver;
    }
    get inPlayableArea() {
        this.checkDestroyed();
        return this._inPlayableArea;
    }
    get lastAvailableCheck() {
        this.checkDestroyed();
        return this._lastAvailableCheck;
    }
    get latitude() {
        this.checkDestroyed();
        return this._latitude;
    }
    get longitude() {
        this.checkDestroyed();
        return this._longitude;
    }
    get signal() {
        this.checkDestroyed();
        return this._signal;
    }
    get speed() {
        this.checkDestroyed();
        return this._speed;
    }
    get timestamp() {
        this.checkDestroyed();
        return this._timestamp;
    }
    get timetableIndex() {
        this.checkDestroyed();
        return this._timetableIndex;
    }
    get vehicles() {
        this.checkDestroyed();
        return this._vehicles;
    }
    set updateTimer(value) {
        clearInterval(this._updateTimer);
        this._updateTimer = value;
    }
    constructor(config, callback) {
        this.events = new RXJS.Subject();
        this.destroyed = false;
        this._autoUpdateInterval = LiveData.DEFAULT_UPDATE_INTERVAL;
        this._available = false;
        this._driver = { type: LiveData.Driver.Type.Bot };
        this._lastAvailableCheck = -1;
        this._latitude = -1;
        this._longitude = -1;
        this._speed = -1;
        this._inPlayableArea = false;
        this._timestamp = -1;
        this._timetableIndex = -1;
        this._vehicles = [];
        this.sdk = config.sdk;
        this.train = config.train;
        if (config.getUpdateDataFunction !== undefined) {
            config.getUpdateDataFunction((data) => this.updateData(data));
        }
        if (config.data === undefined) {
            this.update().then(callback);
        }
        else if (config.data !== null) {
            this.updateData(config.data);
            callback(this);
        }
        else {
            this._lastAvailableCheck = Date.now();
            callback(this);
        }
    }
    destroy() {
        this.checkDestroyed();
        this.destroyed = true;
        this.updateTimer = undefined;
    }
    start(autoUpdateInterval) {
        this.checkDestroyed();
        if (autoUpdateInterval !== undefined) {
            this.autoUpdateInterval = autoUpdateInterval;
        }
        if (this.autoUpdate !== true) {
            this.updateTimer = setInterval(() => this.update(), this.autoUpdateInterval);
            this.events.next({
                autoUpdate: true, autoUpdateInterval: this.autoUpdateInterval, liveData: this,
                type: LiveData.Event.Type.AutoUpdateChanged,
            });
        }
        return this;
    }
    stop() {
        this.checkDestroyed();
        if (this._updateTimer !== undefined) {
            this.updateTimer = undefined;
            this.events.next({
                autoUpdate: false, autoUpdateInterval: this.autoUpdateInterval, liveData: this,
                type: LiveData.Event.Type.AutoUpdateChanged,
            });
        }
        return this;
    }
    async update() {
        this.checkDestroyed();
        let liveData = null;
        try {
            liveData = await this.sdk.api.getActiveTrain(this.train.serverCode, this.train.number);
        }
        catch (_) { }
        this.updateData(liveData);
        return this;
    }
    checkDestroyed() {
        if (this.destroyed === true) {
            throw Common.exception("ObjectDestroyedError", `Object can't be used after it's been destroyed!`);
        }
    }
    updateAvailable(value) {
        if (this._available !== value) {
            this._available = value;
            this.events.next({
                available: value, liveData: this,
                type: LiveData.Event.Type.AvailableChanged,
            });
        }
    }
    updateData(data) {
        if (data === null) {
            this._lastAvailableCheck = Date.now();
            this.updateAvailable(false);
            this.stop();
            return;
        }
        this._lastAvailableCheck = Date.now();
        this._latitude = data.trainData.latitude;
        this._longitude = data.trainData.longitude;
        this._speed = data.trainData.velocity;
        this._vehicles = data.vehicles;
        this._timestamp = Date.now();
        if (data.trainData.controlledBySteamId !== undefined) {
            this._driver = { steamId: data.trainData.controlledBySteamId, type: LiveData.Driver.Type.User };
        }
        else {
            this._driver = { type: LiveData.Driver.Type.Bot };
        }
        if (data.trainData.signalInFront !== undefined) {
            const id = data.trainData.signalInFront.split("@")[0];
            this._signal = {
                distance: data.trainData.distanceToSignalInFront,
                data: data.trainData.signalInFront,
                id,
                speed: data.trainData.signalInFrontSpeed,
            };
        }
        else {
            this._signal = undefined;
        }
        if (this._inPlayableArea !== !data.trainData.inBorderStationArea) {
            this._inPlayableArea = data.trainData.inBorderStationArea !== true;
            this.events.next({
                inPlayableArea: this._inPlayableArea, liveData: this,
                type: LiveData.Event.Type.InPlayableAreaChanged,
            });
        }
        if (this._timetableIndex !== data.trainData.vdDelayedTimetableIndex) {
            this._timetableIndex = data.trainData.vdDelayedTimetableIndex;
            this.events.next({
                timetableIndex: this._timetableIndex, liveData: this,
                type: LiveData.Event.Type.TimetableIndexChanged,
            });
        }
        this.updateAvailable(true);
        this.events.next({
            data: this.data, liveData: this,
            type: LiveData.Event.Type.DataUpdated,
        });
    }
}
exports.LiveData = LiveData;
(function (LiveData) {
    LiveData.Train = __1.default;
    LiveData.DEFAULT_UPDATE_INTERVAL = 5000;
    let Driver;
    (function (Driver) {
        let Type;
        (function (Type) {
            Type["Bot"] = "bot";
            Type["User"] = "user";
        })(Type = Driver.Type || (Driver.Type = {}));
    })(Driver = LiveData.Driver || (LiveData.Driver = {}));
    let Event;
    (function (Event) {
        let Type;
        (function (Type) {
            Type["AutoUpdateChanged"] = "autoUpdateChanged";
            Type["AutoUpdateIntervalChanged"] = "autoUpdateIntervalChanged";
            Type["AvailableChanged"] = "availableChanged";
            Type["DataUpdated"] = "dataUpdated";
            Type["InPlayableAreaChanged"] = "inPlayableAreaChanged";
            Type["TimetableIndexChanged"] = "timetableIndexChanged";
        })(Type = Event.Type || (Event.Type = {}));
    })(Event = LiveData.Event || (LiveData.Event = {}));
    let Signal;
    (function (Signal) {
    })(Signal = LiveData.Signal || (LiveData.Signal = {}));
    async function get(config) {
        return new Promise((resolve, reject) => { try {
            new LiveData(config, resolve);
        }
        catch (error) {
            reject(error);
        } });
    }
    LiveData.get = get;
})(LiveData || (exports.LiveData = LiveData = {}));
exports.default = LiveData;
//# sourceMappingURL=index.js.map