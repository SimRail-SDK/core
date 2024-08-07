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
import { Sdk } from "..";
import * as Common from "../common";
import SdkServer from "../server";
import SdkStation from "../station";
import SdkTrainLiveData from "./liveData";
import SdkTrainTimetable from "./timetable";

/**
 * Specifies a train.
 *
 * See `Train.get()` for an `await`able constructor method.
 *
 * @template Types - Type information about the `Train` and SDK.
 *
 * @param config   - The configuration for constructing the `Train` instance.
 * @param callback - Method to be executed when construction is complete.
 */
export class Train<Types extends Train.Types> implements Train.Data<Types["trainNumber"], Types["serverCode"]> {

    /** Specifies under which train number the train will continue. */
    public readonly continuesAs?: Train.ContinuesAs;

    /** Specifies the destination of the train. */
    public readonly destination: Train.Destination = null as any;

    /** Specifies the unique ID of the train. */
    public readonly id: Train.Id = null as any;

    /** Specifies the international train number of this train. */
    public readonly intNumber?: Train.IntNumber = null as any;

    /** Specifies the length of the train in meters. */
    public readonly length: Train.Length = null as any;

    /** Specifies the name of the train's locomotive. */
    public readonly locoType: Train.LocoType = null as any;

    /** Specifies the name of the train or train series. */
    public readonly name: Train.Name = null as any;

    /** Specifies the national train number of this train. */
    public readonly number: Types["trainNumber"];

    /** Specifies the origin of the train. */
    public readonly origin: Train.Origin = null as any;

    /** Specifies a reference to the `Sdk` class instance. */
    public readonly sdk: Sdk<Types>;

    /** Specifies the unique code of the related server. */
    public readonly serverCode: Types["serverCode"];

    /** Specifies the weight of this train in metric tonnes. */
    public readonly weight: Train.Weight = null as any;

    private destroyed: boolean = false;

    private updateLiveDataInstance: Train.LiveData.Config.UpdateDataFunction = null as any;

    private _liveData: Train.LiveData<Types> = null as any;

    private _timetable: Train.Timetable<Types> = null as any;

    /** Specifies data of this train. */
    public get data(): Train.Data<Types["trainNumber"], Types["serverCode"]> {
        this.checkDestroyed();
        const data: Train.Data<Types["trainNumber"], Types["serverCode"]> = {
            continuesAs: this.continuesAs,
            destination: this.destination,
            id:          this.id,
            intNumber:   this.intNumber,
            length:      this.length,
            liveData:    this._liveData.timestamp !== -1 ? this.liveData.data : undefined,
            locoType:    this.locoType,
            name:        this.name,
            number:      this.number,
            origin:      this.origin,
            serverCode:  this.serverCode,
            weight:      this.weight,
        };
        return data;
    }

    /** Specifies a live data for this train. */
    public get liveData(): Train.LiveData<Types> {
        this.checkDestroyed();
        if (this._liveData === null) {
            throw Common.exception("LiveDataUndefinedError", `The "LiveData" class hasn't been loaded yet!`);
        }
        return this._liveData;
    }

    /** Specifies the timetable of this train. */
    public get timetable(): Train.Timetable<Types> {
        this.checkDestroyed();
        if (this._timetable === null) {
            throw Common.exception("TimetableUndefinedError", `The "Timetable" class hasn't been loaded yet!`);
        }
        return this._timetable;
    }

    constructor(config: Train.Config<Types>, callback: Train.Callback<Types>) {
        this.sdk        = config.sdk;
        this.number     = config.number;
        this.serverCode = config.serverCode;
        if (config.liveData !== undefined && config.timetableData !== undefined) {
            this.updateLiveData(config.liveData).then(() => this.updateTimetableData(config.timetableData!).then(() => callback(this)));
        } else { this.update().then(callback); }
    }

    /**
     * Method to destroy this `Train` instance.
     *
     * **NOTE**: Calling this method is **not** required. Only use this when really needed.
     */
    public destroy(): void {
        this.checkDestroyed();
        this.destroyed = true;
        this._timetable.destroy();
        this._liveData.destroy();
    }

    /** Method to retrieve the `Server` related to this train. */
    public async server(): Promise<Train.Server<Types>> {
        return await this.sdk.server(this.serverCode);
    }

    /**
     * Method to retrieve the same train but related to another `Server` instance.
     *
     * @template ServerCode - The unique code of the server.
     *
     * @returns The **new** `Train` instance.
     */
    public async switchServer<TargetServerCode extends Types["serverCodes"]>(serverCode: TargetServerCode): Promise<Train<Types>> {
        return await Train.get({ sdk: this.sdk, number: this.number, serverCode });
    }

    /**
     * Method to return `Train.data` as a JSON string.
     *
     * @returns The JSON string.
     */
    public toJson(): string {
        return JSON.stringify(this.data);
    }

    /**
     * Method to update the data of this train with live data from the API.
     * 
     * **NOTE**: *Currently*, this will replace `Train.liveData` and `Train.timetable` with new class instances.
     *
     * @returns This `Train` instance.
     */
    public async update(): Promise<this> {
        this.checkDestroyed();
        let liveData: Api.LiveData.Train | null = null;
        try { liveData = await this.sdk.api.getActiveTrain(this.serverCode, this.number); } catch (_) {}
        await this.updateLiveData(liveData);
        const timetableData = await this.sdk.api.getTimetable(this.serverCode, this.number);
        await this.updateTimetableData(timetableData);
        return this;
    }

    private checkDestroyed(): void | never {
        if (this.destroyed === true) { throw Common.exception("ObjectDestroyedError", `Object can't be used after it's been destroyed!`); }
    }

    private async updateLiveData(data: Api.LiveData.Train | null): Promise<void> {
        if (this.id === null) { // Perform initial setup
            this._liveData = await Train.LiveData.get({ sdk: this.sdk, getUpdateDataFunction: (func) => this.updateLiveDataInstance = func, train: this, data });
        } else if (data !== null && this.id !== data.runId) { throw Common.exception("TrainIdMismatchError", `Train ID has changed since last update!`); }
        else { this.updateLiveDataInstance(data); }
    }

    private async updateTimetableData(data: Api.Timetable.Data): Promise<void> {
        if (this.id === null) { // Perform initial setup
            this._timetable = await Train.Timetable.get({ data: data.timetable, sdk: this.sdk, train: this });
            (this as Common.Mutable<this>).continuesAs = data.continuesAs;
            (this as Common.Mutable<this>).destination = { arrivesAt: data.endsAt, stationName: data.endStation };
            (this as Common.Mutable<this>).id          = data.runId;
            (this as Common.Mutable<this>).intNumber   = data.trainNoInternational;
            (this as Common.Mutable<this>).length      = data.trainLength;
            (this as Common.Mutable<this>).locoType    = data.locoType;
            (this as Common.Mutable<this>).name        = data.trainName;
            (this as Common.Mutable<this>).origin      = { departsAt: data.startsAt, stationName: data.startStation };
            (this as Common.Mutable<this>).weight      = data.trainWeight;
        } else if (this.id !== data.runId) { throw Common.exception("TrainIdMismatchError", `Train ID has changed since last update!`); }
    }

}

export namespace Train {

    /** Specifies under which train number a train will continue. */
    export import ContinuesAs = Api.Timetable.ContinuesAs;
    /** Specifies the unique ID of a train. */
    export import Id = Api.Timetable.RunId;
    /** Specifies the length of a train in meters. */
    export import Length = Api.Timetable.TrainLength;
    /** Specifies the name of the train's locomotive. */
    export import LocoType = Api.Timetable.LocoType;
    export import LiveData = SdkTrainLiveData;
    /** Specifies the name of a train or train series. */
    export import Name = Api.Timetable.TrainName;
    /** Specifies the international train number of a train. */
    export import IntNumber = Api.Timetable.TrainNoInternational;
    export import Server = SdkServer;
    export import Station = SdkStation;
    export import Timetable = SdkTrainTimetable;
    /** Specifies the weight of a train in metric tonnes. */
    export import Weight = Api.Timetable.TrainWeight;

    /**
     * Specifies a method to be executed when construction of a `Train` is complete.
     *
     * @template Types - Type information about the `Train` and SDK.
     *
     * @param train - The constructed `Train` instance.
     */
    export type Callback<Types extends Train.Types> = (train: Train<Types>) => any;

    /**
     * Specifies the configuration for constructing a `Train` instance.
     *
     * @template Types - Type information about the `Train` and SDK.
     */
    export interface Config<Types extends Train.Types> {
        /**
         * Specifies train data retrieved from the live data endpoint.
         *
         * **NOTE**: Leaving either `liveData` or `timetableData` set to `undefined` will cause the `Train`
         *   to execute `update()` on construction to retrieve it's data, making it asynchronous.
         */
        readonly liveData?: Api.LiveData.Train | null;
        /**
         * Specifies train data retrieved from the timetable endpoint.
         *
         * **NOTE**: Leaving either `timetableData` or `liveData` set to `undefined` will cause the `Train`
         *   to execute `update()` on construction to retrieve it's data, making it asynchronous.
         */
        readonly timetableData?: Api.Timetable.Data;
        /** Specifies the national train number of the train. */
        readonly number: Types["trainNumber"];
        /** Specifies a reference to the `Sdk` class. */
        readonly sdk: Sdk<Types>;
        /** Specifies the unique code of the related server. */
        readonly serverCode: Types["serverCode"];
    }

    /** Specifies the destination of a train. */
    export interface Destination extends OriginDestinationBase {
        /** Specifies when the train arrives at it's destination in format `"hh:mm:ss"`. */
        readonly arrivesAt: Time;
    }

    /**
     * Specifies data of a train.
     *
     * @template TrainNumber - The number of the train.
     * @template ServerCode  - The unique code of the related server.
     */
    export interface Data<TrainNumber extends Train.Number, ServerCode extends Server.Code> {
        /** Specifies under which train number the train will continue. */
        readonly continuesAs?: ContinuesAs;
        /** Specifies the destination of the train. */
        readonly destination: Destination;
        /** Specifies the unique ID of the train. */
        readonly id: Id;
        /** Specifies the international train number of this train. */
        readonly intNumber?: IntNumber;
        /** Specifies the length of the train in meters. */
        readonly length: Length;
        readonly liveData?: LiveData.Data;
        /** Specifies the name of the train's locomotive. */
        readonly locoType: LocoType;
        /** Specifies the name of the train or train series. */
        readonly name: Name;
        /** Specifies the national train number of this train. */
        readonly number: TrainNumber;
        /** Specifies the origin of the train. */
        readonly origin: Origin;
        /** Specifies the unique code of the related server. */
        readonly serverCode: ServerCode;
        /** Specifies the weight of this train in metric tonnes. */
        readonly weight: Weight;
    }

    /** Specifies the national train number of a train. */
    export type Number = Api.Timetable.TrainNoLocal;
    export namespace Number {
        /** Specifies a list of national train numbers. */
        export type List = Number[];
    }

    interface OriginDestinationBase {
        /** Specifies the name of the station. */
        readonly stationName: Station.Name;
    }

    /** Specifies the origin of a train. */
    export interface Origin extends OriginDestinationBase {
        /** Specifies when the train departs from it's origin in format `"hh:mm:ss"`. */
        readonly departsAt: Time;
    }

    /** Specifies a time string in format: `"hh:mm:ss"` */
    export type Time = string;

    /**
     * Specifies type information about `Train`s and the SDK.
     *
     * @template ServerCodes  - Any server code.
     * @template ServerCode   - The code of the related server.
     * @template TrainNumbers - Any train number.
     * @template TrainNumber  - The number of this train.
     */
    export interface Types<ServerCodes extends Server.Code = Server.Code, ServerCode extends ServerCodes = ServerCodes, TrainNumbers extends Number = Number, TrainNumber extends TrainNumbers = TrainNumbers> extends Sdk.Types {
        /** Specifies the code of the related server. */
        serverCode: ServerCodes;
        serverCodes: ServerCode;
        /** Specifies the number of this train. */
        trainNumber: TrainNumber;
        trainNumbers: TrainNumbers;
    }

    /**
     * Method to construct a new `Train` class instance.
     *
     * @template Types - Type information about the `Train` and SDK.
     *
     * @param config - The configuration for constructing the `Train` instance.
     * @returns The new `Train` instance.
     */
    export async function get<Types extends Train.Types>(config: Config<Types>): Promise<Train<Types>> {
        return new Promise((resolve, reject) => { try { new Train(config, resolve); } catch (error) { reject(error); }});
    }

}

export default Train;
