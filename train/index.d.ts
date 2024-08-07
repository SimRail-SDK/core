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

    /** Specifies data of this train. */
    public readonly data: Train.Data<Types["trainNumber"], Types["serverCode"]>;

    /** Specifies the destination of the train. */
    public readonly destination: Train.Destination;

    /** Specifies the unique ID of the train. */
    public readonly id: Train.Id;

    /** Specifies the international train number of this train. */
    public readonly intNumber?: Train.IntNumber;

    /** Specifies the length of the train in meters. */
    public readonly length: Train.Length;

    /** Specifies a live data for this train. */
    public readonly liveData: Train.LiveData<Types>;

    /** Specifies the name of the train's locomotive. */
    public readonly locoType: Train.LocoType;

    /** Specifies the name of the train or train series. */
    public readonly name: Train.Name;

    /** Specifies the national train number of this train. */
    public readonly number: Types["trainNumber"];

    /** Specifies the origin of the train. */
    public readonly origin: Train.Origin;

    /** Specifies a reference to the `Sdk` class instance. */
    public readonly sdk: Sdk<Types>;

    /** Specifies the unique code of the related server. */
    public readonly serverCode: Types["serverCode"];

    /** Specifies the timetable of this train. */
    public readonly timetable: Train.Timetable<Types>;

    /** Specifies the weight of this train in metric tonnes. */
    public readonly weight: Train.Weight;

    constructor(config: Train.Config<Types>, callback: Train.Callback<Types>);

    /**
     * Method to destroy this `Train` instance.
     *
     * **NOTE**: Calling this method is **not** required. Only use this when really needed.
     */
    public destroy(): void;

    /** Method to retrieve the `Server` related to this train. */
    public server(): Promise<Train.Server<Types>>;

    /**
     * Method to retrieve the same train but related to another `Server` instance.
     *
     * @template ServerCode - The unique code of the server.
     *
     * @returns The **new** `Train` instance.
     */
    public switchServer<TargetServerCode extends Types["serverCodes"]>(serverCode: TargetServerCode): Promise<Train<Types>>;

    /**
     * Method to return `Train.data` as a JSON string.
     *
     * @returns The JSON string.
     */
    public toJson(): string;

    /**
     * Method to update the data of this train with live data from the API.
     * 
     * **NOTE**: *Currently*, this will replace `Train.liveData` and `Train.timetable` with new class instances.
     *
     * @returns This `Train` instance.
     */
    public update(): Promise<this>;

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
    export function get<Types extends Train.Types>(config: Config<Types>): Promise<Train<Types>>;

}

export default Train;
