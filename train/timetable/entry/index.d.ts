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
import SdkTimetable from "..";

export class Entry<Types extends Entry.Types, EntryType extends Entry.Type = Entry.Type> implements Entry.Data {

    public readonly arrivesAt: EntryType extends Entry.Type.PassengerStop | Entry.Type.TimingStop ? Entry.ArrivesAt : undefined;
    
    public readonly data: Entry.Data<EntryType>;

    public readonly departsAt: Entry.DepartsAt;

    public readonly first: Entry.First;

    public readonly index: Entry.Line;

    public readonly kilometrage: Entry.Kilometrage;

    public readonly last: Entry.Last;

    public readonly line: Entry.Line;

    public readonly localTrack: EntryType extends Entry.Type.PassengerStop ? Entry.LocalTrack : undefined;

    public readonly maxSpeed: Entry.MaxSpeed;

    public readonly name: Entry.Name;

    public readonly platform: EntryType extends Entry.Type.PassengerStop ? Entry.Platform : undefined;

    public readonly pointId: Entry.PointId;

    public readonly radioChannels: Entry.RadioChannels;

    public readonly stationCategory: EntryType extends Entry.Type.PassengerStop ? Entry.StationCategory : undefined;

    public readonly supervisedBy: Entry.SupervisedBy;

    public readonly timetable: Entry.Timetable<Types>;

    public readonly trainType: Entry.TrainType;

    public readonly type: EntryType | `${EntryType}`;

    constructor(config: Entry.Config<Types, EntryType>);

    public next(): Entry.Timetable.Entry<Types> | undefined;

    public previous(): Entry.Timetable.Entry<Types> | undefined;

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
