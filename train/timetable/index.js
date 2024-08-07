"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timetable = void 0;
const RXJS = require("rxjs");
const Common = require("../../common");
const __1 = require("..");
const entry_1 = require("./entry");
class Timetable {
    get current() {
        this.checkDestroyed();
        if (this.currentIndex === undefined) {
            throw Common.exception("NoLiveDataError", `Can't get current entry because live data isn't available!`);
        }
        return this._entries[this.currentIndex];
    }
    get entries() {
        this.checkDestroyed();
        return [...this._entries];
    }
    get currentIndex() {
        this.checkDestroyed();
        return this.train.liveData.timetableIndex !== -1 ? this.train.liveData.timetableIndex : undefined;
    }
    get history() {
        this.checkDestroyed();
        if (this.currentIndex === undefined) {
            throw Common.exception("NoLiveDataError", `Can't get historic entries because live data isn't available!`);
        }
        const history = [];
        for (let index = 0; index < this.currentIndex; index++) {
            history.push(this._entries[index]);
        }
        return history;
    }
    get size() {
        this.checkDestroyed();
        return this._entries.length;
    }
    get upcoming() {
        this.checkDestroyed();
        if (this.currentIndex === undefined) {
            throw Common.exception("NoLiveDataError", `Can't get upcoming entries because live data isn't available!`);
        }
        const upcoming = [];
        for (let index = this.currentIndex; index < this._entries.length; index++) {
            upcoming.push(this._entries[index]);
        }
        return upcoming;
    }
    constructor(config, callback) {
        this.events = new RXJS.Subject();
        this.destroyed = false;
        this._entries = [];
        this.sdk = config.sdk;
        this.train = config.train;
        this.liveDataSubscription = this.train.liveData.events.subscribe((event) => {
            if (event.type === Timetable.Train.LiveData.Event.Type.TimetableIndexChanged) {
                try {
                    this.events.next({
                        current: this.current, timetable: this, type: Timetable.Event.Type.CurrentChanged,
                    });
                }
                catch (_) { }
            }
        });
        if (config.data === undefined) {
            this.update().then(callback);
        }
        else {
            this.updateData(config.data);
            callback(this);
        }
    }
    destroy() {
        this.checkDestroyed();
        this.destroyed = true;
        this.liveDataSubscription?.unsubscribe();
    }
    entry(index) {
        this.checkDestroyed();
        if (index < 0 || index >= this._entries.length) {
            throw Common.exception("IndexOutOfRangeError", `Timetable entry index can't be higher than ${this._entries.length}!`);
        }
        if (index < 0) {
            throw Common.exception("IndexOutOfRangeError", `Timetable entry index can't be below zero!`);
        }
        return this._entries[index];
    }
    async update() {
        this.checkDestroyed();
        const data = await this.sdk.api.getTimetable(this.train.serverCode, this.train.number);
        this.updateData(data.timetable);
        return this;
    }
    checkDestroyed() {
        if (this.destroyed === true) {
            throw Common.exception("ObjectDestroyedError", `Object can't be used after it's been destroyed!`);
        }
    }
    updateData(timetable) {
        const entries = [];
        let index = 0;
        for (const entry of timetable) {
            const type = entry.stopType === "CommercialStop" ? Timetable.Entry.Type.PassengerStop :
                entry.stopType === "NoncommercialStop" ? Timetable.Entry.Type.TimingStop :
                    Timetable.Entry.Type.Passthrough;
            entries.push(new Timetable.Entry({ data: {
                    arrivesAt: entry.arrivalTime,
                    departsAt: entry.departureTime,
                    first: index === 0,
                    index,
                    kilometrage: entry.kilometrage,
                    last: index === timetable.length - 1,
                    line: entry.line,
                    localTrack: entry.track,
                    maxSpeed: entry.maxSpeed,
                    name: entry.nameOfPoint,
                    platform: entry.platform,
                    pointId: entry.pointId,
                    radioChannels: entry.radioChannels,
                    stationCategory: entry.stationCategory,
                    supervisedBy: entry.supervisedBy,
                    trainType: entry.trainType,
                    type
                }, timetable: this }));
            index++;
        }
        this._entries = entries;
    }
}
exports.Timetable = Timetable;
(function (Timetable) {
    Timetable.Entry = entry_1.default;
    Timetable.Train = __1.default;
    let Event;
    (function (Event) {
        let Type;
        (function (Type) {
            Type["CurrentChanged"] = "currentChanged";
        })(Type = Event.Type || (Event.Type = {}));
    })(Event = Timetable.Event || (Timetable.Event = {}));
    async function get(config) {
        return new Promise((resolve, reject) => { try {
            new Timetable(config, resolve);
        }
        catch (error) {
            reject(error);
        } });
    }
    Timetable.get = get;
})(Timetable || (exports.Timetable = Timetable = {}));
exports.default = Timetable;
//# sourceMappingURL=index.js.map