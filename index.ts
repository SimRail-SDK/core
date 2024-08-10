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

    private serverMap: Sdk.Server.Map<Types> = {} as any;

    constructor(config: Sdk.Config) {
        this.api = config.api instanceof Sdk.Api ? config.api : new Sdk.Api(config.api);
    }

    /**
     * Method to retrieve a `Server` instance.
     *
     * @template ServerCode - The unique code of the server.
     *
     * @param serverCode - The unique code of the server.
     * @returns The `Server` instance.
     */
    public async server<ServerCode extends Types["serverCodes"]>(serverCode: ServerCode): Promise<Sdk.Server<Types & { serverCode: ServerCode }>> {
        let server: Sdk.Server<Types & { serverCode: ServerCode }>;
        if (this.serverMap === undefined) { await this.servers(); }
        server = this.serverMap![serverCode];
        if (server !== undefined) { return server; }
        try {
            const data = await this.api.getActiveServer(serverCode);
            return this.serverMap![serverCode] = await Sdk.Server.get<Types & { serverCode: ServerCode }>({ data, sdk: this as any, code: serverCode as any }); // #TODO: Remove cast to `any`.
        } catch (error) { throw Common.exception("InvalidServerCodeError", `Server with code "${serverCode}" doesn't exist!`); }
    }

    /**
     * Method to retrieve a map of `Server` instances.
     *
     * @returns The map of `Server` instances.
     */
    public async servers(): Promise<Sdk.Server.Map<Types>> {
        const servers = this.serverMap;
        const results = await this.api.getActiveServers();
        for (const data of results) {
            const serverCode = data.serverCode as Types["serverCodes"];
            if (servers[serverCode] === undefined) {
                servers[serverCode] = await Sdk.Server.get<Types & { serverCode: Types["serverCodes"] }>({ data, sdk: this, code: serverCode as any }); // #TODO: Remove cast to `any`.
            }
        }
        this.serverMap = servers;
        return Object.freeze(Object.assign({}, servers));
    }

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
    public async station<ServerCode extends Types["serverCodes"], StationCode extends Types["stationCodes"]>(serverCode: ServerCode, stationCode: StationCode): Promise<Sdk.Station<Types & { serverCode: ServerCode, stationCode: StationCode }>> {
        return await (await this.server(serverCode)).station(stationCode);
    }

    /**
     * Method to retrieve a map of `Station` instances related to a server.
     *
     * @template ServerCode - The unique code of the server.
     *
     * @param serverCode - The unique code of the server.
     * @returns The map of `Station` instances.
     */
    public async stations<ServerCode extends Types["serverCodes"]>(serverCode: ServerCode): Promise<Sdk.Station.Map<Types & { serverCode: ServerCode; }>> {
        return await (await this.server(serverCode)).stations();
    }

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
    public async train<ServerCode extends Types["serverCodes"], TrainNumber extends Types["trainNumbers"]>(serverCode: ServerCode, trainNumber: TrainNumber): Promise<Sdk.Train<Types & { serverCode: ServerCode, trainNumber: TrainNumber }>> {
        return await (await this.server(serverCode)).train(trainNumber);
    }

}

export namespace Sdk {

    /** Specifies the version of the SDK. */
    export const VERSION: Version = "0.1.1";

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
