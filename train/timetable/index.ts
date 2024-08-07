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
 * @requires rxjs
 */

// Import node modules
import { Api } from "@simrail-sdk/api";
import * as RXJS from "rxjs";

// Import project modules
import Sdk from "../..";
import * as Common from "../../common";
import SdkTrain from "..";
import SdkTimetableEntry from "./entry";

/**
 * Specifies a timetable of a train.
 *
 * See `Timetable.get()` for an `await`able constructor method.
 *
 * @template Types - Type information about the `Timetable` and SDK.
 *
 * @param config   - The configuration for constructing the `Timetable` instance.
 * @param callback - Method to be executed when construction is complete.
 */
export class Timetable<Types extends Timetable.Types> {

    /**
     * Specifies a timetable event emitter.
     *
     * **NOTE**: Timetable events will only be fired when `Timetable.train.liveData.update()` is executed
     *   either manually or by setting `LiveData.autoUpdate` to `true`.
     */
    public readonly events: Timetable.Event.Emitter<Types> = new RXJS.Subject();

    /** Specifies a reference to the `Sdk` class instance. */
    public readonly sdk: Sdk<Types>;

    /** Specifies a reference to the `Train` this timetable belongs to. */
    public readonly train: Timetable.Train<Types>;

    private destroyed: boolean = false;

    private liveDataSubscription?: RXJS.Subscription;

    private _entries: Timetable.Entry.List<Types> = [];

    /** Specifies the entry in the timetable the train is currently located. */
    public get current(): Timetable.Entry<Types> {
        this.checkDestroyed();
        if (this.currentIndex === undefined) {
            throw Common.exception("NoLiveDataError", `Can't get current entry because live data isn't available!`);
        } return this._entries[this.currentIndex];
    }

    /** Specifies a list of timetable entries. */
    public get entries(): Timetable.Entry.List<Types> {
        this.checkDestroyed();
        return [...this._entries];
    }

    /** Specifies the index of the entry the train is currently located. */
    public get currentIndex(): Timetable.Entry.Index | undefined {
        this.checkDestroyed();
        return this.train.liveData.timetableIndex !== -1 ? this.train.liveData.timetableIndex : undefined;
    }

    /** Specifies a list of historic entries according to the train's live data. */
    public get history(): Timetable.Entry.List<Types> {
        this.checkDestroyed();
        if (this.currentIndex === undefined) {
            throw Common.exception("NoLiveDataError", `Can't get historic entries because live data isn't available!`);
        }
        const history: Timetable.Entry.List<Types> = [];
        for (let index = 0; index < this.currentIndex; index++) { history.push(this._entries[index]); }
        return history;
    }

    /** Specifies the number of entries in this timetable. */
    public get size(): Timetable.Size {
        this.checkDestroyed();
        return this._entries.length;
    }

    /** Specifies a list of upcoming entries according to the train's live data. */
    public get upcoming(): Timetable.Entry.List<Types> {
        this.checkDestroyed();
        if (this.currentIndex === undefined) {
            throw Common.exception("NoLiveDataError", `Can't get upcoming entries because live data isn't available!`);
        }
        const upcoming: Timetable.Entry.List<Types> = [];
        for (let index = this.currentIndex; index < this._entries.length; index++) { upcoming.push(this._entries[index]); }
        return upcoming;
    }

    constructor(config: Timetable.Config<Types>, callback: Timetable.Callback<Types>) {
        this.sdk   = config.sdk;
        this.train = config.train;
        this.liveDataSubscription = this.train.liveData.events.subscribe((event) => {
            if (event.type === Timetable.Train.LiveData.Event.Type.TimetableIndexChanged) {
                try {
                    (this.events as RXJS.Subject<Timetable.Event<Types>>).next({
                        current: this.current, timetable: this, type: Timetable.Event.Type.CurrentChanged,
                    });
                } catch (_) {}
            }
        });
        if (config.data === undefined) { this.update().then(callback); }
        else { this.updateData(config.data); callback(this); }
    }

    /**
     * Method to destroy this `Timetable` instance.
     *
     * **NOTE**: Calling this method is **not** required. Only use this when really needed.
     */
    public destroy(): void {
        this.checkDestroyed();
        this.destroyed = true;
        this.liveDataSubscription?.unsubscribe();
    }

    /**
     * Method to return a timetable entry at a specified index.
     *
     * @param index - The index of the entry.
     * @returns The timetable entry.
     */
    public entry(index: Timetable.Entry.Index): Timetable.Entry<Types> {
        this.checkDestroyed();
        if (index < 0 || index >= this._entries.length) { throw Common.exception("IndexOutOfRangeError", `Timetable entry index can't be higher than ${this._entries.length}!`); }
        if (index < 0) { throw Common.exception("IndexOutOfRangeError", `Timetable entry index can't be below zero!`); }
        return this._entries[index];
    }

    /**
     * Method to update the data of this train timetable with data from the API.
     * 
     * **NOTE**: *Currently*, this will replace `Timetable.entries` with new class instances.
     *
     * @returns This `Timetable` instance.
     */
    public async update(): Promise<this> {
        this.checkDestroyed();
        const data = await this.sdk.api.getTimetable(this.train.serverCode, this.train.number);
        this.updateData(data.timetable);
        return this;
    }

    private checkDestroyed(): void | never {
        if (this.destroyed === true) { throw Common.exception("ObjectDestroyedError", `Object can't be used after it's been destroyed!`); }
    }

    private updateData(timetable: Api.Timetable.Timetable.List): void {
        const entries: Timetable.Entry.List<Types> = [];
        let index: number = 0;
        for (const entry of timetable) {
            const type: Timetable.Entry.Type =
                entry.stopType === "CommercialStop" ? Timetable.Entry.Type.PassengerStop :
                entry.stopType === "NoncommercialStop" ? Timetable.Entry.Type.TimingStop :
                Timetable.Entry.Type.Passthrough;
            entries.push(new Timetable.Entry({ data: { // #TODO: Update instance instead of creating new one
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

export namespace Timetable {

    export import Entry = SdkTimetableEntry;
    export import Train = SdkTrain;
    export import Types = Train.Types;

    /**
     * Specifies a method to be executed when construction of a `Timetable` is complete.
     *
     * @template Types - Type information about the `Timetable` and SDK.
     *
     * @param timetable - The constructed `Timetable` instance.
     */
    export type Callback<Types extends Timetable.Types> = (liveData: Timetable<Types>) => any;

    /**
     * Specifies the configuration for constructing a `Timetable` instance.
     *
     * @template Types - Type information about the `Timetable` and SDK.
     */
    export interface Config<Types extends Timetable.Types> {
        /**
         * Specifies train timetable data retrieved from the timetable endpoint.
         *
         * **NOTE**: Leaving `data` set to `undefined` will cause the `Timetable` class to
         *   execute `update()` on construction to retrieve it's data.
         */
        readonly data?: Api.Timetable.Timetable.List;
        /** Specifies a reference to the `Sdk` class. */
        readonly sdk: Sdk<Types>;
        /** Specifies a reference to the related `Train` class. */
        readonly train: Train<Types>;
    }

    /**
     * Specifies a train timetable event.
     *
     * @template Types - Type information about the `Timetable` and SDK.
     */
    export type Event<Types extends Train.Types> = Event.CurrentChanged<Types>;
    export namespace Event {
        /** Specifies a type of timetable event. */
        export enum Type {
            /** Specifies an event that fires when the value of `Timetable.current` changes. */
            CurrentChanged = "currentChanged",
        }
        export interface Base<Types extends Train.Types, EventType extends Type> {
            /** Specifies a reference to the related `Timetable` instance. */
            timetable: Timetable<Types>;
            /** Specifies the type of timetable event. */
            type: EventType;
        }
        /** Specifies a timetable event emitter. */
        export type Emitter<Types extends Train.Types> = RXJS.Observable<Event<Types>>;
        /** Specifies an event that fires when the value of `Timetable.current` changes. */
        export interface CurrentChanged<Types extends Train.Types> extends Base<Types, Type.CurrentChanged> {
            current: Entry<Types>;
        }
    }

    /** Specifies the number of entries in a timetable. */
    export type Size = number;

    /**
     * Method to construct a new `Timetable` class instance.
     *
     * @template Types - Type information about the `Timetable` and SDK.
     *
     * @param config - The configuration for constructing the `Timetable` instance.
     * @returns The new `Timetable` instance.
     */
    export async function get<Types extends Timetable.Types>(config: Config<Types>): Promise<Timetable<Types>> {
        return new Promise((resolve, reject) => { try { new Timetable(config, resolve); } catch (error) { reject(error); }});
    }

}

export default Timetable;
