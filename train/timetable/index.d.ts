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

    /** Specifies the entry in the timetable the train is currently located. */
    public readonly current: Timetable.Entry<Types>;

    /** Specifies a list of timetable entries. */
    public readonly entries: Timetable.Entry.List<Types>;

    /**
     * Specifies a timetable event emitter.
     *
     * **NOTE**: Timetable events will only be fired when `Timetable.train.liveData.update()` is executed
     *   either manually or by setting `LiveData.autoUpdate` to `true`.
     */
    public readonly events: Timetable.Event.Emitter<Types>;

    /** Specifies the index of the entry the train is currently located. */
    public readonly currentIndex: Timetable.Entry.Index | undefined;

    /** Specifies a list of historic entries according to the train's live data. */
    public readonly history: Timetable.Entry.List<Types>;

    /** Specifies a reference to the `Sdk` class instance. */
    public readonly sdk: Sdk<Types>;

    /** Specifies the number of entries in this timetable. */
    public readonly size: Timetable.Size;

    /** Specifies a reference to the `Train` this timetable belongs to. */
    public readonly train: Timetable.Train<Types>;

    /** Specifies a list of upcoming entries according to the train's live data. */
    public readonly upcoming: Timetable.Entry.List<Types>;

    constructor(config: Timetable.Config<Types>, callback: Timetable.Callback<Types>);

    /**
     * Method to destroy this `Timetable` instance.
     *
     * **NOTE**: Calling this method is **not** required. Only use this when really needed.
     */
    public destroy(): void;

    /**
     * Method to return a timetable entry at a specified index.
     *
     * @param index - The index of the entry.
     * @returns The timetable entry.
     */
    public entry(index: Timetable.Entry.Index): Timetable.Entry<Types>;

    /**
     * Method to update the data of this train timetable with data from the API.
     * 
     * **NOTE**: *Currently*, this will replace `Timetable.entries` with new class instances.
     *
     * @returns This `Timetable` instance.
     */
    public update(): Promise<this>;

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
    export function get<Types extends Timetable.Types>(config: Config<Types>): Promise<Timetable<Types>>;

}

export default Timetable;
