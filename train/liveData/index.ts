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

/**
 * Specifies live data of a train.
 *
 * See `LiveData.get()` for an `await`able constructor method.
 *
 * @template Types - Type information about the `LiveData` and SDK.
 *
 * @param config   - The configuration for constructing the `LiveData` instance.
 * @param callback - Method to be executed when construction is complete.
 */
export class LiveData<Types extends LiveData.Train.Types> implements LiveData.Data {

    /** Specifies a live data event emitter. */
    public readonly events: LiveData.Event.Emitter<Types> = new RXJS.Subject();

    /** Specifies a reference to the `Sdk` class instance. */
    public readonly sdk: Sdk<Types>;

    /** Specifies a reference to the `Train` the live data belongs to. */
    public readonly train: LiveData.Train<Types>;

    private destroyed: boolean = false;

    private _autoUpdateInterval: LiveData.AutoUpdateInterval = LiveData.DEFAULT_UPDATE_INTERVAL;

    private _available: LiveData.Available = false;

    private _driver: LiveData.Driver = { type: LiveData.Driver.Type.Bot };

    private _lastAvailableCheck: LiveData.LastAvailableCheck = -1;

    private _latitude: LiveData.Latitude = -1;

    private _longitude: LiveData.Longitude = -1;

    private _signal?: LiveData.Signal;

    private _speed: LiveData.Speed = -1;

    private _inPlayableArea: LiveData.InPlayableArea = false;

    private _timestamp: LiveData.Timestamp = -1;

    private _timetableIndex: LiveData.TimetableIndex = -1;

    private _updateTimer?: NodeJS.Timeout;

    private _vehicles: LiveData.Vehicles = [];

    /** Specifies live data of a train. */
    public get data(): LiveData.Data {
        this.checkDestroyed();
        return {
            available:          this.available,
            driver:             this.driver,
            inPlayableArea:     this.inPlayableArea,
            lastAvailableCheck: this.lastAvailableCheck,
            latitude:           this.latitude,
            longitude:          this.longitude,
            signal:             this.signal,
            speed:              this.speed,
            timestamp:          this.timestamp,
            timetableIndex:     this.timetableIndex,
            vehicles:           this.vehicles,
        };
    }

    /** Specifies if live data is updated automatically. */
    public get autoUpdate(): LiveData.AutoUpdate {
        this.checkDestroyed();
        return this._updateTimer !== undefined;
    }

    public set autoUpdate(value: LiveData.AutoUpdate) {
        this.checkDestroyed();
        if (this.autoUpdate !== value) {
            if (value === true) { this.start(); }
            else { this.stop(); }
        }
    }

    /**
     * Specifies the interval for updating live data in milliseconds.
     *
     * @default 5000
     */
    public get autoUpdateInterval(): LiveData.AutoUpdateInterval {
        this.checkDestroyed();
        return this._autoUpdateInterval;
    }

    public set autoUpdateInterval(value: LiveData.AutoUpdateInterval) {
        this.checkDestroyed();
        if (this._autoUpdateInterval !== value) {
            this._autoUpdateInterval = value;
            if (this.autoUpdate === true) {
                this.updateTimer = setInterval(async () => await this.update(), this.autoUpdateInterval);
            }
            (this.events as RXJS.Subject<LiveData.Event<Types>>).next({
                autoUpdate: this.autoUpdate, autoUpdateInterval: value, liveData: this,
                type: LiveData.Event.Type.AutoUpdateIntervalChanged,
            });
        }
    }

    /**
     * Specifies if live data is available.
     *
     * Execute `LiveData.update()` to update this value.
     *
     * **NOTE**: Live data is only available when the train is
     *   being rendered by the multiplayer server.
     */
    public get available(): LiveData.Available {
        this.checkDestroyed();
        return this._available;
    }

    /** Specifies information about the train driver. */
    public get driver(): LiveData.Driver {
        this.checkDestroyed();
        return this._driver;
    }

    /** Specifies if the train is in the playable area of the game. */
    public get inPlayableArea(): LiveData.InPlayableArea {
        this.checkDestroyed();
        return this._inPlayableArea;
    }

    /** Specifies when the availability was last checked. */
    public get lastAvailableCheck(): LiveData.LastAvailableCheck {
        this.checkDestroyed();
        return this._lastAvailableCheck;
    }

    /** Specifies the current global latitude of the train. */
    public get latitude(): LiveData.Latitude {
        this.checkDestroyed();
        return this._latitude;
    }

    /** Specifies the current global longitude of the train. */
    public get longitude(): LiveData.Longitude {
        this.checkDestroyed();
        return this._longitude;
    }

    /** Specifies data about the signal the train is facing. */
    public get signal(): LiveData.Signal | undefined {
        this.checkDestroyed();
        return this._signal;
    }

    /** Specifies the current speed of the train. */
    public get speed(): LiveData.Speed {
        this.checkDestroyed();
        return this._speed;
    }

    /** Specifies when the live data was last updated. (Excluding `available`) */
    public get timestamp(): LiveData.Timestamp {
        this.checkDestroyed();
        return this._timestamp;
    }

    /** Specifies the index of the current timetable entry of the train. */
    public get timetableIndex(): LiveData.TimetableIndex {
        this.checkDestroyed();
        return this._timetableIndex;
    }

    /**
     * Specifies a list of vehicles of the train.
     *
     * **NOTE**: This data hasn't be deciphered yet, if you know what this data
     *   describes please **open a new issue** in the project repository.
     */
    public get vehicles(): LiveData.Vehicles {
        this.checkDestroyed();
        return this._vehicles;
    }

    private set updateTimer(value: NodeJS.Timeout | undefined) {
        clearInterval(this._updateTimer);
        this._updateTimer = value;
    }

    constructor(config: LiveData.Config<Types>, callback: LiveData.Callback<Types>) {
        this.sdk   = config.sdk;
        this.train = config.train;
        if (config.getUpdateDataFunction !== undefined) {
            config.getUpdateDataFunction((data) => this.updateData(data));
        }
        if (config.data === undefined) { this.update().then(callback); }
        else if (config.data !== null) { this.updateData(config.data); callback(this); }
        else { this._lastAvailableCheck = Date.now(); callback(this); }
    }

    /**
     * Method to destroy this `LiveData` instance.
     *
     * **NOTE**: Calling this method is **not** required. Only use this when really needed.
     */
    public destroy(): void {
        this.checkDestroyed();
        this.destroyed = true;
        this.updateTimer = undefined;
    }

    /**
     * Method to start auto updating live data.
     *
     * **NOTE**: Auto update only works when the train is available.
     *   When the train becomes unavailable auto updates will stop.
     *
     * @param autoUpdateInterval - The interval between updates in milliseconds.
     * @returns This `LiveData` instance.
     */
    public start(autoUpdateInterval?: LiveData.AutoUpdateInterval): this {
        this.checkDestroyed();
        if (autoUpdateInterval !== undefined) { this.autoUpdateInterval = autoUpdateInterval; }
        if (this.autoUpdate !== true) {
            this.updateTimer = setInterval(() => this.update(), this.autoUpdateInterval);
            (this.events as RXJS.Subject<LiveData.Event<Types>>).next({
                autoUpdate: true, autoUpdateInterval: this.autoUpdateInterval, liveData: this,
                type: LiveData.Event.Type.AutoUpdateChanged,
            });
        }
        return this;
    }

    /**
     * Method to stop auto updating live data.
     *
     * @returns This `LiveData` instance.
     */
    public stop(): this {
        this.checkDestroyed();
        if (this._updateTimer !== undefined) {
            this.updateTimer = undefined;
            (this.events as RXJS.Subject<LiveData.Event<Types>>).next({
                autoUpdate: false, autoUpdateInterval: this.autoUpdateInterval, liveData: this,
                type: LiveData.Event.Type.AutoUpdateChanged,
            });
        }
        return this;
    }

    /**
     * Method to update the live data of this train with live data from the API.
     *
     * @returns This `LiveData` instance.
     */
    public async update(): Promise<this> {
        this.checkDestroyed();
        let liveData: Api.LiveData.Train | null = null;
        try { liveData = await this.sdk.api.getActiveTrain(this.train.serverCode, this.train.number); } catch (_) {}
        this.updateData(liveData);
        return this;
    }

    private checkDestroyed(): void | never {
        if (this.destroyed === true) { throw Common.exception("ObjectDestroyedError", `Object can't be used after it's been destroyed!`); }
    }

    private updateAvailable(value: LiveData.Available): void {
        if (this._available !== value) {
            this._available = value;
            (this.events as RXJS.Subject<LiveData.Event<Types>>).next({
                available: value, liveData: this,
                type: LiveData.Event.Type.AvailableChanged,
            });
        }
    }

    private updateData(data: Api.LiveData.Train | null): void {
        if (data === null) {
            this._lastAvailableCheck = Date.now();
            this.updateAvailable(false);
            this.stop();
            return;
        }
        this._lastAvailableCheck = Date.now();
        this._latitude           = data.trainData.latitude;
        this._longitude          = data.trainData.longitude;
        this._speed              = data.trainData.velocity;
        this._vehicles           = data.vehicles;
        this._timestamp          = Date.now();
        if (data.trainData.controlledBySteamId !== undefined) {
            this._driver = { steamId: data.trainData.controlledBySteamId, type: LiveData.Driver.Type.User };
        } else { this._driver = { type: LiveData.Driver.Type.Bot }; }
        if (data.trainData.signalInFront !== undefined) {
            const id = data.trainData.signalInFront.split("@")[0];
            this._signal = {
                distance: data.trainData.distanceToSignalInFront!,
                data:     data.trainData.signalInFront,
                id,
                speed:    data.trainData.signalInFrontSpeed!,
            };
        } else { this._signal = undefined; }
        if (this._inPlayableArea !== !data.trainData.inBorderStationArea) {
            this._inPlayableArea = data.trainData.inBorderStationArea !== true;
            (this.events as RXJS.Subject<LiveData.Event<Types>>).next({
                inPlayableArea: this._inPlayableArea, liveData: this,
                type: LiveData.Event.Type.InPlayableAreaChanged,
            });
        }
        if (this._timetableIndex !== data.trainData.vdDelayedTimetableIndex) {
            this._timetableIndex = data.trainData.vdDelayedTimetableIndex;
            (this.events as RXJS.Subject<LiveData.Event<Types>>).next({
                timetableIndex: this._timetableIndex, liveData: this,
                type: LiveData.Event.Type.TimetableIndexChanged,
            });
        }
        this.updateAvailable(true);
        (this.events as RXJS.Subject<LiveData.Event<Types>>).next({
            data: this.data, liveData: this,
            type: LiveData.Event.Type.DataUpdated,
        });
    }

}

export namespace LiveData {

    /** Specifies if a train is in the playable area. */
    export import InPlayableArea = Api.LiveData.Train.TrainData.InBorderStationArea;
    /** Specifies the current global latitude of a train. */
    export import Latitude = Api.LiveData.Train.TrainData.Latitude;
    /** Specifies the current global longitude of a train. */
    export import Longitude = Api.LiveData.Train.TrainData.Longitude;
    /** Specifies the current speed of a train. */
    export import Speed = Api.LiveData.Train.TrainData.Velocity;
    /** Specifies the Steam ID of the player controlling a train. */
    export import SteamId = Api.LiveData.Train.TrainData.ControlledBySteamId;
    /** Specifies the index of the current entry in this train's timetable. */
    export import TimetableIndex = Api.LiveData.Train.TrainData.VdDelayedTimetableIndex;
    export import Train = SdkTrain;
    /**
     * Specifies data about a vehicle of a train.
     *
     * **NOTE**: This data hasn't be deciphered yet, if you know what this data
     *   describes please **open a new issue** in the project repository.
     */
    export import Vehicle = Api.LiveData.Train.Vehicle;
    /**
     * Specifies a list of vehicles of a train.
     *
     * **NOTE**: This data hasn't be deciphered yet, if you know what this data
     *   describes please **open a new issue** in the project repository.
     */
    export import Vehicles = Api.LiveData.Train.Vehicles;

    /**
     * Specifies the default update interval for train live data in milliseconds.
     *
     * @default 5000
     */
    export const DEFAULT_UPDATE_INTERVAL: AutoUpdateInterval = 5000 as const;

    /** Specifies if auto updating of live data is enabled. */
    export type AutoUpdate = boolean;

    /** Specifies an update interval in milliseconds. */
    export type AutoUpdateInterval = number;

    /** Specifies if live data is available. */
    export type Available = boolean;

    /**
     * Specifies a method to be executed when construction of a `LiveData` is complete.
     *
     * @template Types - Type information about the `LiveData` and SDK.
     *
     * @param livedata - The constructed `LiveData` instance.
     */
    export type Callback<Types extends Train.Types> = (liveData: LiveData<Types>) => any;

    /**
     * Specifies the configuration for constructing a `LiveData` instance.
     *
     * @template Types - Type information about the `LiveData` and SDK.
     */
    export interface Config<Types extends Train.Types> {
        /**
         * Specifies train live data retrieved from the live data endpoint.
         *
         * **NOTE**: Leaving `data` set to `undefined` will cause the `LiveData` class to
         *   execute `update()` on construction to retrieve it's data.
         */
        readonly data?: Api.LiveData.Train | null;
        /**
         * Specifies a method that will be executed by the `LiveData` class and inputs
         *   another method that the caller can store to directly assign data within
         *   the `LiveData` class. This method is used by `Train` internally.
         */
        readonly getUpdateDataFunction?: Config.GetUpdateDataFunction;
        /** Specifies a reference to the `Sdk` class. */
        readonly sdk: Sdk<Types>;
        /** Specifies a reference to the related `Train` class. */
        readonly train: Train<Types>;
    }
    export namespace Config {
        /** Specifies a method to internally update `LiveData` data. */
        export type UpdateDataFunction = (data: Api.LiveData.Train | null) => void;
        /**
         * Specifies a method that will be executed by a `LiveData` class and inputs
         *   another method that the caller can store to directly assign data within
         *   the `LiveData` class. This method is used by `Train` internally.
         */
        export type GetUpdateDataFunction = (updateDataFunction: UpdateDataFunction) => void;
    }

    export interface Data {
        /** Specifies if live data is available. */
        readonly available: Available;
        /** Specifies information about the train driver. */
        readonly driver: Driver;
        /** Specifies if the train is in the playable area. */
        readonly inPlayableArea: InPlayableArea;
        /** Specifies when the availability was last checked. */
        readonly lastAvailableCheck: LastAvailableCheck;
        /** Specifies the current global latitude of the train. */
        readonly latitude: Latitude;
        /** Specifies the current global longitude of the train. */
        readonly longitude: Longitude;
        /** Specifies data about the signal the train is facing. */
        readonly signal?: Signal;
        /** Specifies the current speed of the train. */
        readonly speed: Speed;
        /** Specifies when the live data was last updated. (Excluding `available`) */
        readonly timestamp: Timestamp;
        /** Specifies the index of the current timetable entry of the train. */
        readonly timetableIndex: TimetableIndex;
        /** Specifies a list of vehicles of the train. */
        readonly vehicles: Vehicles;
    }

    /** Specifies a train driver. */
    export type Driver = Driver.Bot | Driver.User;
    export namespace Driver {
        interface Base<DriverType extends Type> {
            type: DriverType | `${DriverType}`;
        }
        /** Specifies a train driver. */
        export interface Bot extends Base<Type.Bot> {}
        /** Specifies a train driver. */
        export interface User extends Base<Type.User> {
            /** Specifies the Steam ID of the train driver. */
            steamId: SteamId;
        }
        /** Specifies the type of train driver. */
        export enum Type {
            Bot  = "bot",
            User = "user",
        }
    }

    /**
     * Specifies a train live data event.
     *
     * @template Types - Type information about the `LiveData` class and SDK.
     */
    export type Event<Types extends Train.Types> =
        Event.AutoUpdateChanged<Types> |
        Event.AutoUpdateIntervalChanged<Types> |
        Event.AvailableChanged<Types> |
        Event.DataUpdated<Types> |
        Event.InPlayableAreaChanged<Types> |
        Event.TimetableIndexChanged<Types>;
    export namespace Event {

        /** Specifies a type of timetable event. */
        export enum Type {
            /** Specifies an event that fires when the value of `LiveData.autoUpdate` changes. */
            AutoUpdateChanged         = "autoUpdateChanged",
            /** Specifies an event that fires when the value of `LiveData.autoUpdateInterval` changes. */
            AutoUpdateIntervalChanged = "autoUpdateIntervalChanged",
            /** Specifies an event that fires when the value of `LiveData.available` changes. */
            AvailableChanged          = "availableChanged",
            /** Specifies an event that fires when the value of `LiveData.data` changes. */
            DataUpdated               = "dataUpdated",
            /** Specifies an event that fires when the value of `LiveData.inPlayableArea` changes. */
            InPlayableAreaChanged     = "inPlayableAreaChanged",
            /** Specifies an event that fires when the value of `LiveData.timetableIndex` changes. */
            TimetableIndexChanged     = "timetableIndexChanged",
        }

        export interface Base<Types extends Train.Types, EventType extends Type> {
            /** Specifies a reference to the related `LiveData` instance. */
            liveData: LiveData<Types>;
            /** Specifies the type of timetable event. */
            type: EventType;
        }

        /** Specifies a live data event emitter. */
        export type Emitter<Types extends Train.Types> = RXJS.Observable<Event<Types>>;

        /** Specifies an event that fires when the value of `LiveData.autoUpdate` changes. */
        export interface AutoUpdateChanged<Types extends Train.Types> extends Base<Types, Type.AutoUpdateChanged> {
            autoUpdate: AutoUpdate;
            autoUpdateInterval: AutoUpdateInterval;
        }

        /** Specifies an event that fires when the value of `LiveData.autoUpdateInterval` changes. */
        export interface AutoUpdateIntervalChanged<Types extends Train.Types> extends Base<Types, Type.AutoUpdateIntervalChanged> {
            autoUpdate: AutoUpdate;
            autoUpdateInterval: AutoUpdateInterval;
        }

        /** Specifies an event that fires when the value of `LiveData.available` changes. */
        export interface AvailableChanged<Types extends Train.Types> extends Base<Types, Type.AvailableChanged> {
            available: Available;
        }

        /** Specifies an event that fires when the value of `LiveData.data` changes. */
        export interface DataUpdated<Types extends Train.Types> extends Base<Types, Type.DataUpdated> {
            data: Data;
        }

        /** Specifies an event that fires when the value of `LiveData.inPlayableArea` changes. */
        export interface InPlayableAreaChanged<Types extends Train.Types> extends Base<Types, Type.InPlayableAreaChanged> {
            inPlayableArea: InPlayableArea;
        }

        /** Specifies an event that fires when the value of `LiveData.timetableIndex` changes. */
        export interface TimetableIndexChanged<Types extends Train.Types> extends Base<Types, Type.TimetableIndexChanged> {
            timetableIndex: TimetableIndex;
        }

    }

    /** Specifies when live data availability was last checked. */
    export type LastAvailableCheck = number;

    /** Specifies a signal. */
    export interface Signal {
        /**
         * Specifies data about the signal.
         *
         * **NOTE**: This data (except for the ID prefixing the `@` symbol) hasn't be deciphered yet,
         *   if you know what this data describes please **open a new issue** in the project repository.
         */
        readonly data: Signal.Data;
        /** Specifies the distance to the signal in meters. */
        readonly distance: Signal.Distance;
        /** Specifies the unique ID of the signal. */
        readonly id: Signal.Id;
        /** Specifies the track limit effective at the signal in km/h. */
        readonly speed: Signal.Speed;
    }
    export namespace Signal {
        /**
         * Specifies data about a signal.
         *
         * **NOTE**: This data (except for the ID prefixing the `@` symbol) hasn't be deciphered yet,
         *   if you know what this data describes please **open a new issue** in the project repository.
         */
        export import Data = Api.LiveData.Train.TrainData.SignalInFront;
        /** Specifies the distance to a signal in meters. */
        export import Distance = Api.LiveData.Train.TrainData.DistanceToSignalInFront;
        /** Specifies the track limit effective at a signal in km/h. */
        export import Speed = Api.LiveData.Train.TrainData.SignalInFrontSpeed;
        /** Specifies the unique ID of a signal. */
        export type Id = string;
    }

    /** Specifies when live data was last updated. */
    export type Timestamp = number;

    /**
     * Method to construct a new `LiveData` class instance.
     *
     * @template Types - Type information about the `LiveData` class and SDK.
     *
     * @param config - The configuration for constructing the `LiveData` instance.
     * @returns The new `LiveData` instance.
     */
    export async function get<Types extends Train.Types>(config: Config<Types>): Promise<LiveData<Types>> {
        return new Promise((resolve, reject) => { try { new LiveData(config, resolve); } catch (error) { reject(error); }});
    }

}

export default LiveData;
