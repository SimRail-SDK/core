"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Entry = void 0;
const Common = require("../../../common");
const __1 = require("..");
class Entry {
    get arrivesAt() {
        return this.data.arrivesAt;
    }
    get departsAt() {
        return this.data.departsAt;
    }
    get first() {
        return this.data.first;
    }
    get index() {
        return this.data.index;
    }
    get kilometrage() {
        return this.data.kilometrage;
    }
    get last() {
        return this.data.last;
    }
    get line() {
        return this.data.line;
    }
    get localTrack() {
        return this.data.localTrack;
    }
    get maxSpeed() {
        return this.data.maxSpeed;
    }
    get name() {
        return this.data.name;
    }
    get platform() {
        return this.data.platform;
    }
    get pointId() {
        return this.data.pointId;
    }
    get radioChannels() {
        return this.data.radioChannels;
    }
    get stationCategory() {
        return this.data.stationCategory;
    }
    get supervisedBy() {
        return this.data.supervisedBy;
    }
    get trainType() {
        return this.data.trainType;
    }
    get type() {
        return this.data.type;
    }
    constructor(config) {
        this.timetable = config.timetable;
        this.data = config.data;
    }
    next() {
        if (this.index + 1 >= this.timetable.size) {
            throw Common.exception("IndexOutOfRangeError", `There's no next entry in the timetable!`);
        }
        return this.timetable.entry(this.index + 1);
    }
    previous() {
        if (this.index - 1 < 0) {
            throw Common.exception("IndexOutOfRangeError", `There's no previous entry in the timetable!`);
        }
        return this.timetable.entry(this.index - 1);
    }
}
exports.Entry = Entry;
(function (Entry) {
    Entry.Timetable = __1.default;
    let Type;
    (function (Type) {
        Type["PassengerStop"] = "passengerStop";
        Type["Passthrough"] = "passthrough";
        Type["TimingStop"] = "timingStop";
    })(Type = Entry.Type || (Entry.Type = {}));
})(Entry || (exports.Entry = Entry = {}));
exports.default = Entry;
//# sourceMappingURL=index.js.map