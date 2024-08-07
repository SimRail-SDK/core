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

/**
 * Specifies a dispatch station.
 *
 * @template Types - Type information about the `Station` and SDK.
 *
 * @param config   - The configuration for constructing the `Station` instance.
 * @param callback - Method to be executed when construction is complete.
 */
export class Station<Types extends Station.Types> implements Station.Data<Types["stationCode"]> {

    /** Specifies the unique code of the station. */
    public readonly code: Types["stationCode"];

    /** Specifies the difficulty level for controlling this station. */
    public readonly difficultyLevel: Station.DifficultyLevel = null as any;

    /** Specifies the unique ID of this station. */
    public readonly id: Station.Identifier = null as any;

    /** Specifies images for this station. */
    public readonly images: Station.Images = null as any;

    /** Specifies the latitude of this station. */
    public readonly latitude: Station.Latitude = null as any;

    /** Specifies the longitude of this station. */
    public readonly longitude: Station.Longitude = null as any;

    /** Specifies the name of this station. */
    public readonly name: Station.Name = null as any;

    /** Specifies the prefix (localized code) of the station. */
    public readonly prefix: Station.Prefix = null as any;

    /** Specifies a reference to the `Sdk` class instance. */
    public readonly sdk: Sdk<Types>;

    /** Specifies the unique code of the related server. */
    public readonly serverCode: Types["serverCode"];

    private _dispatchers: Station.Dispatcher.List = null as any;

    /** Specifies a list of dispatchers currently controlling this station. */
    public get dispatchers(): Station.Dispatcher.List {
        return this._dispatchers;
    }

    /** Specifies data of this station. */
    public get data(): Station.Data<Types["stationCode"]> {
        return {
            code:            this.code,
            difficultyLevel: this.difficultyLevel,
            dispatchers:     this.dispatchers,
            id:              this.id,
            images:          this.images,
            latitude:        this.latitude,
            longitude:       this.longitude,
            name:            this.name,
            prefix:          this.prefix,
            serverCode:      this.serverCode,
        };
    }

    constructor(config: Station.Config<Types>, callback: Station.Callback<Types>) {
        this.sdk        = config.sdk;
        this.code       = config.code;
        this.serverCode = config.serverCode;
        if (config.data === undefined) { this.update().then(callback); }
        else { this.updateData(config.data); callback(this); }
    }

    /** Method to retrieve the `Server` related to this dispatch station. */
    public async server(): Promise<Station.Server<Types>> {
        return await this.sdk.server(this.serverCode);
    }

    /**
     * Method to retrieve the same dispatch station but related to another `Server` instance.
     *
     * @template ServerCode - The unique code of the server.
     *
     * @param serverCode - The unique code of the server.
     * @returns The **new** `Station` instance.
     */
    public async switchServer<ServerCode extends Types["serverCodes"]>(serverCode: ServerCode): Promise<Station<Omit<Types, "serverCode"> & { serverCode: ServerCode }>> {
        return await (await this.sdk.server(serverCode)).station(this.code);
    }

    /**
     * Method to return `Station.data` as a JSON string.
     *
     * @returns The JSON string.
     */
    public toJson(): string {
        return JSON.stringify(this.data);
    }

    /**
     * Method to update the data of this station with live data from the API.
     *
     * Check interface `Station.LiveData` to see which properties are updated.
     *
     * @returns This `Station` instance.
     */
    public async update(): Promise<this> {
        this.updateData(await this.sdk.api.getActiveStation(this.serverCode, this.code));
        return this;
    }

    private updateData(data: Api.LiveData.Station): void {
        if (this.id === null) { // Perform initial setup
            (this as Common.Mutable<this>).difficultyLevel = data.difficultyLevel;
            (this as Common.Mutable<this>).id              = data.id;
            (this as Common.Mutable<this>).latitude        = data.latitude;
            (this as Common.Mutable<this>).longitude       = data.longitude;
            (this as Common.Mutable<this>).name            = data.name;
            (this as Common.Mutable<this>).prefix          = data.prefix;
            (this as Common.Mutable<this>).images = {
                primary: data.mainImageURL,
                secondary: [
                    data.additionalImage1URL,
                    data.additionalImage2URL,
                ],
            };
        } else if (this.id !== data.id) { throw Common.exception("StationIdMismatchError", `Station ID has changed since last update!`); }
        if (data.dispatchedBy !== undefined && data.dispatchedBy.length > 0) {
            this._dispatchers = [];
            data.dispatchedBy.forEach((dispatcher) => this._dispatchers.push({ steamId: dispatcher.steamId }));
        }
    }

}

export namespace Station {

    /** Specifies the unique code of a station. */
    export import Code = Api.LiveData.Station.Code;
    /** Specifies a difficulty level for controlling this station. */
    export import DifficultyLevel = Api.LiveData.Station.DifficultyLevel;
    /** Specifies a unique ID of this station. */
    export import Identifier = Api.LiveData.Station.Id;
    /** Specifies a latitude of this station. */
    export import Latitude = Api.LiveData.Station.Latitude;
    /** Specifies a longitude of this station. */
    export import Longitude = Api.LiveData.Station.Longitude;
    /** Specifies an URL pointing to an image. */
    export import ImageUrl = Api.LiveData.Station.ImageUrl;
    /** Specifies a name of this station. */
    export import Name = Api.LiveData.Station.Name;
    /** Specifies the prefix (localized code) of the station. */
    export import Prefix = Api.LiveData.Station.Prefix;
    /** Specifies a related server. */
    export import Server = SdkServer;

    /**
     * Specifies a method to be executed when construction of a `Station` is complete.
     *
     * @template Types - Type information about the `Station` and SDK.
     *
     * @param server - The constructed `Station` instance.
     */
    export type Callback<Types extends Station.Types> = (server: Station<Types>) => any;

    /**
     * Specifies the configuration for constructing a `Station` instance.
     *
     * @template Types - Type information about the `Station` and SDK.
     */
    export interface Config<Types extends Station.Types> {
        /** Specifies the unique code of the station. */
        readonly code: Types["stationCode"];
        /**
         * Specifies server data retrieved from the live data endpoint.
         *
         * **NOTE**: Leaving `data` set to `undefined` will cause the `Station` to execute `update()`
         *   on construction to retrieve it's data, making it asynchronous.
         */
        readonly data?: Api.LiveData.Station;
        /** Specifies a reference to the `Sdk` class. */
        readonly sdk: Sdk<Types>;
        /** Specifies the unique code of the related server. */
        readonly serverCode: Types["serverCode"];
    }

    /**
     * Specifies data of a station.
     *
     * @template StationCode - The unique code of the station.
     */
    export interface Data<StationCode extends Station.Code> extends LiveData {
        /** Specifies the unique code of the station. */
        readonly code: StationCode | `${StationCode}`;
        /** Specifies the difficulty level for controlling this station. */
        readonly difficultyLevel: DifficultyLevel;
        /** Specifies the unique ID of this station. */
        readonly id: Identifier;
        /** Specifies images for this station. */
        readonly images: Images;
        /** Specifies the latitude of this station. */
        readonly latitude: Latitude;
        /** Specifies the longitude of this station. */
        readonly longitude: Longitude;
        /** Specifies the name of this station. */
        readonly name: Name;
        /** Specifies the prefix (localized code) of the station. */
        readonly prefix: Prefix;
        /** Specifies the unique code of the related server. */
        readonly serverCode: Server.Code;
    }

    /** Specifies a dispatcher currently controlling a station. */
    export interface Dispatcher {
        /** Specifies the Steam ID of the dispatcher. */
        steamId: SteamId;
    }
    export namespace Dispatcher {
        /** Specifies a list of dispatchers currently controlling a station. */
        export type List = Dispatcher[];
    }

    /** Specifies images for a station. */
    export interface Images {
        /** Specifies an URL to the primary image of the station. */
        primary: ImageUrl;
        /** Specifies a list of URLs to secondary images of the station. */
        secondary: ImageUrl[];
    }

    /** Specifies live data of a station. */
    export interface LiveData {
        /** Specifies a list of dispatchers currently controlling this station. */
        readonly dispatchers?: Dispatcher.List;
    }

    /** Specifies a map of dispatch stations. */
    export type Map<Types extends Omit<Station.Types, "stationCode">> = {
        [stationCode in Types["stationCodes"]]: Station<Types & { stationCode: stationCode }>;
    };

    /** Specifies the Steam ID of a dispatcher. */
    export type SteamId = string;

    /**
     * Specifies type information about `Station`s and the SDK.
     *
     * @template ServerCodes  - Any server code.
     * @template ServerCode   - The code of the related server.
     * @template StationCodes - Any station code.
     * @template StationCode  - The unique code of this station.
     */
    export interface Types<ServerCodes extends Server.Code = Server.Code, ServerCode extends ServerCodes = ServerCodes, StationCodes extends Code = Code, StationCode extends StationCodes = StationCodes> extends Sdk.Types {
        /** Specifies the code of the related server. */
        serverCode: ServerCodes;
        serverCodes: ServerCode;
        /** Specifies the code of this station. */
        stationCode: StationCode;
        stationCodes: StationCodes;
    }

    /**
     * Method to construct a new `Station` class instance.
     *
     * @template Types - Type information about the `Station` and SDK.
     *
     * @param config - The configuration for constructing the `Station` instance.
     * @returns The new `Station` instance.
     */
    export async function get<Types extends Station.Types>(config: Config<Types>): Promise<Station<Types>> {
        return new Promise((resolve, reject) => { try { new Station(config, resolve); } catch (error) { reject(error); }});
    }

}

export default Station;
