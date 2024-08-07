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
import SdkTrain from "../train";

/**
 * Specifies a multiplayer server.
 *
 * See `Server.get()` for an `await`able constructor method.
 *
 * @template Types - Type information about the `Server` and SDK.
 *
 * @param config   - The configuration for constructing the `Server` instance.
 * @param callback - Method to be executed when construction is complete.
 */
export class Server<Types extends Server.Types> implements Server.Data<Types["serverCode"]> {

    /** Specifies the unique code of the server. */
    public readonly code: Types["serverCode"];

    /** Specifies the unique ID of the server. */
    public readonly id: Server.Identifier = null as any;

    /** Specifies the name of the server. */
    public readonly name: Server.Name = null as any;

    /** Specifies the region the server is located. */
    public readonly region: Server.Region = null as any;

    /** Specifies a reference to the `Sdk` class instance. */
    public readonly sdk: Sdk<Types>;

    private stationMap: Sdk.Station.Map<Types> = {} as any;

    private _isActive: Server.IsActive = false;

    /** Specifies server data. */
    public get data(): Server.Data<Types["serverCode"]> {
        const { code, id, isActive, name, region } = this;
        return { code, id, isActive, name, region };
    }

    /** Specifies if the server is active. */
    public get isActive(): Server.IsActive {
        return this._isActive;
    }

    constructor(config: Server.Config<Types>, callback: Server.Callback<Types>) {
        this.sdk  = config.sdk;
        this.code = config.code;
        if (config.data === undefined) { this.update().then(callback); }
        else { this.updateData(config.data); callback(this); }
    }

    /**
     * Method to retrieve a list of numbers of trains that are active.
     *
     * @returns The list of train numbers.
     */
    public async activeTrainNumbers(): Promise<Array<Types["trainNumbers"]>> {
        const trainNumbers: Array<Types["trainNumbers"]> = [];
        const trains = await this.sdk.api.getActiveTrains(this.code);
        trains.forEach((train) => trainNumbers.push(train.trainNoLocal));
        return trainNumbers;
    }

    /**
     * Method to retrieve a `Station` instance related to this server.
     *
     * @template StationCode - The unique code of the station.
     *
     * @param stationCode - The unique code of the station.
     * @returns The `Station` instance.
     */
    public async station<StationCode extends Types["stationCodes"]>(stationCode: StationCode): Promise<Sdk.Station<Types & { stationCode: StationCode }>> {
        let station: Sdk.Station<Types & { stationCode: StationCode }>;
        if (this.stationMap === undefined) { await this.stations(); }
        station = this.stationMap![stationCode];
        if (station !== undefined) { return station; }
        try {
            const data = await this.sdk.api.getActiveStation(this.code, stationCode);
            return this.stationMap![stationCode] = await Sdk.Station.get<Types & { stationCode: StationCode }>({
                data, sdk: this as any, code: stationCode as any, serverCode: this.code, // #TODO: Remove cast to `any`.
            });
        } catch (error) { throw Common.exception("InvalidStationCodeError", `Station with code "${stationCode}" doesn't exist!`); }
    }

    /**
     * Method to retrieve a map of `Station` instances related to this server.
     *
     * @returns The map of `Station` instances.
     */
    public async stations(): Promise<Sdk.Station.Map<Types>> {
        const stations = this.stationMap;
        const results = await this.sdk.api.getActiveStations(this.code);
        for (const data of results) {
            const stationCode = data.code as Types["stationCodes"];
            if (stations[stationCode] === undefined) {
                stations[stationCode] = await Sdk.Station.get<Types & { stationCode: Types["stationCodes"] }>({
                    data, sdk: this as any, code: stationCode as any, serverCode: this.code, // #TODO: Remove cast to `any`.
                });
            }
        }
        this.stationMap = stations;
        return Object.freeze(Object.assign({}, stations));
    }

    /**
     * Method to return `Server.data` as a JSON string.
     *
     * @returns The JSON string.
     */
    public toJson(): string {
        return JSON.stringify(this.data);
    }

    /**
     * Method to retrieve a `Train` instance related to this server.
     *
     * @template TrainNumber - The national or local number of the train.
     *
     * @param number - The national or local number of the train.
     * @returns The `Train` instance.
     */
    public async train<TrainNumber extends Types["trainNumbers"]>(number: TrainNumber): Promise<Server.Train<Types & { trainNumber: TrainNumber }>> {
        return await Server.Train.get({ sdk: this.sdk as any, number, serverCode: this.code }) as Server.Train<Types & { trainNumber: TrainNumber }>;
    }

    /**
     * Method to update the data of this server with live data from the API.
     *
     * Check interface `Server.LiveData` to see which properties are updated.
     *
     * @returns This `Server` instance.
     */
    public async update(): Promise<this> {
        this.updateData(await this.sdk.api.getActiveServer(this.code));
        return this;
    }

    private updateData(data: Api.LiveData.Server): void {
        if (this.code !== data.serverCode) { throw Common.exception("ServerCodeMismatchError", `The update data presented doesn't belong to this server!`) }
        else if (this.id === null) { // Perform initial setup
            (this as Common.Mutable<this>).id     = data.id;
            (this as Common.Mutable<this>).name   = data.serverName;
            (this as Common.Mutable<this>).region = data.serverRegion;
        } else if (this.id !== data.id) { throw Common.exception("ServerIdMismatchError", `Server ID has changed since last update!`); }
        this._isActive = data.isActive;
    }

}

export namespace Server {

    /** Specifies the unique code of a server. */
    export import Code = Api.LiveData.Server.ServerCode;
    /** Specifies the unique ID of a server. */
    export import Identifier = Api.LiveData.Server.Id;
    /** Specifies if a server is active. */
    export import IsActive = Api.LiveData.Server.IsActive;
    /** Specifies the name of a server. */
    export import Name = Api.LiveData.Server.ServerName;
    /** Specifes the region of a server. */
    export import Region = Api.LiveData.Server.ServerRegion;
    export import Train = SdkTrain;

    /**
     * Specifies a method to be executed when construction of a `Server` is complete.
     *
     * @template Types - Type information about the `Server` and SDK.
     *
     * @param server - The constructed `Server` instance.
     */
    export type Callback<Types extends Server.Types> = (server: Server<Types>) => any;

    /**
     * Specifies the configuration for constructing a `Server` instance.
     *
     * @template Types - Type information about the `Server` and SDK.
     */
    export interface Config<Types extends Server.Types> {
        /** Specifies the unique code of the server. */
        readonly code: Types["serverCode"];
        /**
         * Specifies server data retrieved from the live data endpoint.
         *
         * **NOTE**: Leaving `data` set to `undefined` will cause the `Server` to execute `update()`
         *   on construction to retrieve it's data, making it asynchronous.
         */
        readonly data?: Api.LiveData.Server;
        /** Specifies a reference to the `Sdk` class. */
        readonly sdk: Sdk<Types>;
    }

    /**
     * Specifies data of a server.
     *
     * @template ServerCode - The unique code of the server.
     */
    export interface Data<ServerCode extends Code> extends LiveData {
        /** Specifies the unique code of the server. */
        readonly code: ServerCode;
        /** Specifies the unique ID of the server. */
        readonly id: Identifier;
        /** Specifies the name of the server. */
        readonly name: Name;
        /** Specifies the region the server is located. */
        readonly region: Region;
    }

    /** Specifies live data of a server. */
    export interface LiveData {
        /** Specifies if the server is active. */
        readonly isActive: IsActive;
    }

    /**
     * Specifies a map of `Server` instances.
     *
     * @template Types - Type information about the `Server` and SDK.
     */
    export type Map<Types extends Omit<Server.Types, "serverCode">> = {
        [code in Types["serverCodes"]]: Server<Types & { serverCode: code }>;
    };

    /**
     * Specifies type information about `Server`s and the SDK.
     *
     * @template ServerCodes - Any server code.
     * @template ServerCode  - The unique code of this server.
     */
    export interface Types<ServerCodes extends Code = Code, ServerCode extends ServerCodes = ServerCodes> extends Sdk.Types {
        /** Specifies the code of this server. */
        serverCode: ServerCodes;
        serverCodes: ServerCode;
    }

    /**
     * Method to construct a new `Server` class instance.
     *
     * @template Types - Type information about the `Server` and SDK.
     *
     * @param config - The configuration for constructing the `Server` instance.
     * @returns The new `Server` instance.
     */
    export async function get<Types extends Server.Types>(config: Config<Types>): Promise<Server<Types>> {
        return new Promise((resolve, reject) => { try { new Server(config, resolve); } catch (error) { reject(error); }});
    }

}

export default Server;
