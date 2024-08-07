/**
 * ## SimRail Core SDK
 *
 * %FILE_DESC% #TODO
 *
 * @file
 * @module
 *
 * @author  Niek van Bennekom
 * @since   0.1.0
 * @version 0.1.0
 *
 * @requires [at]simrail-sdk/api
 */

// Import node modules
import { Api } from "@simrail-sdk/api";

// Import project modules
import * as Common from "../../../common";
import SdkTimetable from "..";

export class Entry<Types extends Entry.Types, EntryType extends Entry.Type = Entry.Type> implements Entry.Data {

    public readonly timetable: Entry.Timetable<Types>;
    
    public readonly data: Entry.Data<EntryType>;

    public get arrivesAt(): EntryType extends Entry.Type.PassengerStop | Entry.Type.TimingStop ? Entry.ArrivesAt : undefined {
        return this.data.arrivesAt;
    }

    public get departsAt(): Entry.DepartsAt {
        return this.data.departsAt;
    }

    public get first(): Entry.First {
        return this.data.first;
    }

    public get index(): Entry.Line {
        return this.data.index;
    }

    public get kilometrage(): Entry.Kilometrage {
        return this.data.kilometrage;
    }

    public get last(): Entry.Last {
        return this.data.last;
    }

    public get line(): Entry.Line {
        return this.data.line;
    }

    public get localTrack(): EntryType extends Entry.Type.PassengerStop ? Entry.LocalTrack : undefined {
        return this.data.localTrack as EntryType extends Entry.Type.PassengerStop ? Entry.LocalTrack : undefined;
    }

    public get maxSpeed(): Entry.MaxSpeed {
        return this.data.maxSpeed;
    }

    public get name(): Entry.Name {
        return this.data.name;
    }

    public get platform(): EntryType extends Entry.Type.PassengerStop ? Entry.Platform : undefined {
        return this.data.platform as EntryType extends Entry.Type.PassengerStop ? Entry.Platform : undefined;
    }

    public get pointId(): Entry.PointId {
        return this.data.pointId;
    }

    public get radioChannels(): Entry.RadioChannels {
        return this.data.radioChannels as Entry.RadioChannels;
    }

    public get stationCategory(): EntryType extends Entry.Type.PassengerStop ? Entry.StationCategory : undefined {
        return this.data.stationCategory as EntryType extends Entry.Type.PassengerStop ? Entry.StationCategory : undefined;
    }

    public get supervisedBy(): Entry.SupervisedBy {
        return this.data.supervisedBy as Entry.SupervisedBy;
    }

    public get trainType(): Entry.TrainType {
        return this.data.trainType;
    }

    public get type(): EntryType | `${EntryType}` {
        return this.data.type;
    }

    constructor(config: Entry.Config<Types, EntryType>) {
        this.timetable = config.timetable;
        this.data      = config.data;
    }

    public next(): Entry.Timetable.Entry<Types> | undefined {
        if (this.index + 1 >= this.timetable.size) {
            throw Common.exception("IndexOutOfRangeError", `There's no next entry in the timetable!`);
        } return this.timetable.entry(this.index + 1);
    }

    public previous(): Entry.Timetable.Entry<Types> | undefined {
        if (this.index - 1 < 0) {
            throw Common.exception("IndexOutOfRangeError", `There's no previous entry in the timetable!`);
        } return this.timetable.entry(this.index - 1);
    }

}

export namespace Entry {

    export import ArrivesAt       = Api.Timetable.Timetable.ArrivalTime;
    export import CrossesAt       = Api.Timetable.Timetable.DepartureTime;
    export import DepartsAt       = Api.Timetable.Timetable.DepartureTime;
    export import Kilometrage     = Api.Timetable.Timetable.Kilometrage;
    export import Line            = Api.Timetable.Timetable.Line;
    export import LocalTrack      = Api.Timetable.Timetable.Track;
    export import MaxSpeed        = Api.Timetable.Timetable.MaxSpeed;
    export import Name            = Api.Timetable.Timetable.NameOfPoint;
    export import Platform        = Api.Timetable.Timetable.Platform;
    export import PointId         = Api.Timetable.Timetable.PointId;
    export import RadioChannel    = Api.Timetable.Timetable.RadioChannel;
    export import RadioChannels   = Api.Timetable.Timetable.RadioChannels;
    export import StationCategory = Api.Timetable.Timetable.StationCategory;
    export import SupervisedBy    = Api.Timetable.Timetable.SupervisedBy;
    export import Timetable       = SdkTimetable;
    export import TrainType       = Api.Timetable.Timetable.TrainType;

    export type Callback<Types extends Entry.Types> = (liveData: Entry<Types>) => any;

    export interface Config<Types extends Entry.Types, EntryType extends Type> {
        data: Data<EntryType>;
        timetable: Timetable<Types>;
    }

    export interface Data<EntryType extends Type = Type> {
        readonly arrivesAt:        EntryType extends Type.PassengerStop | Type.TimingStop ? ArrivesAt : undefined;
        readonly departsAt:        DepartsAt;
        readonly index:            Index;
        readonly first:            First;
        readonly kilometrage:      Kilometrage;
        readonly line:             Line;
        readonly localTrack?:      EntryType extends Type.PassengerStop ? LocalTrack : undefined;
        readonly maxSpeed:         MaxSpeed;
        readonly last:             Last;
        readonly name:             Name;
        readonly platform?:        EntryType extends Type.PassengerStop ? Platform : undefined;
        readonly pointId:          PointId;
        readonly radioChannels?:   RadioChannels;
        readonly stationCategory?: EntryType extends Type.PassengerStop ? StationCategory : undefined;
        readonly supervisedBy?:    SupervisedBy;
        readonly trainType:        TrainType;
        readonly type:             EntryType | `${EntryType}`;
    }

    export type First = boolean;

    export type Index = number;

    export type Last = boolean;

    export type List<Types extends Entry.Types> = Entry<Types>[];

    export enum Type {
        PassengerStop = "passengerStop",
        Passthrough   = "passthrough",
        TimingStop    = "timingStop",
    }

    export interface Types extends Timetable.Types {}

}

export default Entry;
