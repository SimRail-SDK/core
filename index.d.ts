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
 * @version 0.1.1
 *
 * @requires [at]simrail-sdk/api
 */

// Import node modules
import SdkApi from "@simrail-sdk/api";

// Import project modules
import * as Common from "./common";
import SdkLine from "./line";
import SdkServer from "./server";
import SdkStation from "./station";
import SdkTrack from "./track";
import SdkTrain from "./train";

/**
 * Specifies a SimRail Core SDK instance.
 *
 * @template Types - Type information about the SDK.
 *
 * @param config - The configuration for constructing the `Sdk` instance.
 */
export class Sdk<Types extends Sdk.Types> {

    /** Specifies a reference to the `Api` class instance. */
    public readonly api: Sdk.Api;

    constructor(config: Sdk.Config);

    /**
     * Method to retrieve a `Server` instance.
     *
     * @template ServerCode - The unique code of the server.
     *
     * @param serverCode - The unique code of the server.
     * @returns The `Server` instance.
     */
    public server<ServerCode extends Types["serverCodes"]>(serverCode: ServerCode): Promise<Sdk.Server<Types & { serverCode: ServerCode }>>;

    /**
     * Method to retrieve a map of `Server` instances.
     *
     * @returns The map of `Server` instances.
     */
    public servers(): Promise<Sdk.Server.Map<Types>>;

    /**
     * Method to retrieve a `Station` instance related to a server.
     *
     * @template ServerCode  - The unique code of the server.
     * @template StationCode - The unique code of the station.
     *
     * @param serverCode  - The unique code of the server.
     * @param stationCode - The unique code of the station.
     * @returns The `Station` instance.
     */
    public station<ServerCode extends Types["serverCodes"], StationCode extends Types["stationCodes"]>(serverCode: ServerCode, stationCode: StationCode): Promise<Sdk.Station<Types & { serverCode: ServerCode, stationCode: StationCode }>>;

    /**
     * Method to retrieve a map of `Station` instances related to a server.
     *
     * @template ServerCode - The unique code of the server.
     *
     * @param serverCode - The unique code of the server.
     * @returns The map of `Station` instances.
     */
    public stations<ServerCode extends Types["serverCodes"]>(serverCode: ServerCode): Promise<Sdk.Station.Map<Types & { serverCode: ServerCode; }>>;

    /**
     * Method to retrieve a `Train` instance related to a server.
     *
     * @template ServerCode  - The unique code of the server.
     * @template TrainNumber - The national or local number of the train.
     *
     * @param serverCode  - The unique code of the server.
     * @param trainNumber - The national or local number of the train.
     * @returns The `Train` instance.
     *
     * @version 0.1.1
     */
    public train<ServerCode extends Types["serverCodes"], TrainNumber extends Types["trainNumbers"]>(serverCode: ServerCode, trainNumber: TrainNumber): Promise<Sdk.Train<Types & { serverCode: ServerCode, trainNumber: TrainNumber }>>;

}

export namespace Sdk {

    /** Specifies the version of the SDK. */
    export const VERSION: Version;

    export import Api     = SdkApi;
    export import Line    = SdkLine;
    export import Server  = SdkServer;
    export import Station = SdkStation;
    export import Track   = SdkTrack;
    export import Train   = SdkTrain;
    export import Version = Common.Version;

    /** Specifies an `Sdk` configuration. */
    export interface Config {
        /** Specifies an API class instance or API config. */
        api: Api | Api.Config;
    }

    /** Specifies type inputs for the `Sdk` class. */
    export interface Types {
        /** Specifies any available server code. */
        serverCodes: Server.Code;
        /** Specifies any available station code. */
        stationCodes: Station.Code;
        /** Specifies any available line number. */
        lineNumbers: Line.Number;
        /** Specifies any available train number. */
        trainNumbers: Train.Number;
    }

}

export default Sdk;
