# SimRail Core SDK

This is the *Core SDK* (community edition) for interacting with the SimRail APIs.

This *Core SDK* module builds on top of an *API module* (like [`@simrail-sdk/api`](https://github.com/simrail-sdk/api "View on GitHub")) to provide:
- A more developer-friendly API to prototype with. (where an *API module* is just about interfacing with SimRail's remote APIs)
- Live updates on specific resources. (servers, stations, trains)
- Event subcriptions on resources.
- Caching of remote API responses.

If you are looking for the SDK module extending on data provided by SimRail's remote APIs, ~~check out~~ *wait for* the [*regular* SDK module](https://github.com/simrail-sdk/sdk "View on GitHub") ([`@simrail-sdk/sdk`](https://github.com/simrail-sdk/sdk "View on GitHub")).

This module requires the use of an *API module* to be able to extend it. By default
this module will use [`@simrail-sdk/api`](https://github.com/simrail-sdk/api "View on GitHub"). To provide another *API module*
or a custom one, check out the example [Providing a (custom) API or Core API class][providing-a-custom-api-or-core-api-class] below.

<br/>
<br/>


## Content index

- [Usage details][usage-details]

    - [Installation][installation]

    - [Examples][examples]

        - [Simple SDK usage][simple-sdk-usage]

        - [Automatic updates and events][automatic-updates-and-events]

        - [Working with result caching][working-with-result-caching]

        - [Providing a (custom) API or Core API class][providing-a-custom-api-or-core-api-class]

- [API reference][api-reference]

- [About this module][about-this-module]

    - [Module dependencies][module-dependencies]

        - [Module package dependencies][module-package-dependencies]

        - [Internal module dependencies][internal-module-dependencies]

    - [Module code statistics][module-code-statistics]
<br/>
<br/>


## [Usage details][usage-details]

[usage-details]: #usage-details "View Usage details"

### [Installation][installation]

[installation]: #installation "View Installation"

Using NPM:

`$ npm i @simrail-sdk/core`

or

`$ npm i github:simrail-sdk/core#VERSION`

Where `VERSION` specifies the version to install.
<br/>
<br/>


### [Examples][examples]

[examples]: #examples "View Examples"

#### [Simple SDK usage][simple-sdk-usage]

[simple-sdk-usage]: #simple-sdk-usage "View Simple SDK usage"

```TypeScript
import Sdk from "@simrail-sdk/core";

const sdk = new Sdk({
    api: {
        endpoints: {
            liveData: "https://panel.simrail.eu:8084",
            timetable: "https://api1.aws.simrail.eu:8082/api",
        },
    },
});

//
//  Servers
//

// Retrieve a map of Server instances.
const servers = await sdk.servers();

// Retrieve a single Server instance.
const serverCode: Sdk.Server.Code = "en1";
let en1 = servers[serverCode];
// -- or --
en1 = await sdk.server(serverCode);

// Access server data
const isActive = en1.isActive;
const region = en1.region;
// ...

// Update live data (specified in Server.LiveData)
await en1.update();


//
//  Stations
//

// Retrieve a map of Station instances.
let stations = await en1.stations();
// -- or --
stations = await sdk.stations(serverCode);

// Retrieve a single Station instance.
const stationCode: Sdk.Station.Code = "KO";
let katowice = stations[stationCode];
// -- or --
katowice = await en1.station(stationCode);
// -- or --
katowice = await sdk.station(serverCode, stationCode);

// Access station data
const difficultyLevel = katowice.difficultyLevel;
const dispatchers = katowice.dispatchers;
...

// Update live data (specified in Station.LiveData)
await katowice.update();


//
//  Trains
//

// Retrieve a list of active train numbers.
const activeTrains = await en1.activeTrainNumbers();

// Retrieve a single Train instance.
const trainNumber: Sdk.Train.Number = "4144";
let t4144 = await en1.train(trainNumber);
// -- or --
t4144 = await sdk.train(serverCode, trainNumber);

// Access train data
const arrivesAt = t4144.destination.arrivesAt;
const length = t4144.length;
...

// Access live data
const coords = [t4144.liveData.longitude, t4144.liveData.latitude];
const speed = t4144.liveData.speed;
...
```
<br/>
<br/>


#### [Automatic updates and events][automatic-updates-and-events]

[automatic-updates-and-events]: #automatic-updates-and-events "View Automatic updates and events"

```TypeScript
import Sdk from "../";

const sdk = new Sdk(...);

const train = await sdk.train("en1", "4144");

//
//  Train live data
//

const liveData = train.liveData;
let liveDataSubscription;
if (liveData.available === true) {

    // Subscribe to live data events.
    liveDataSubscription = liveData.events.subscribe((event) => {

        // Filter events by type.
        switch (event.type) {
            case Sdk.Train.LiveData.Event.Type.AvailableChanged:
                console.log(`Value of "LiveData.available" changed to "${event.available}"!`); break;
            case Sdk.Train.LiveData.Event.Type.DataUpdated:
                console.log(`Value of "LiveData.data" changed to "${JSON.stringify(event.data)}"!`); break;
            case Sdk.Train.LiveData.Event.Type.InPlayableAreaChanged:
                console.log(`Value of "LiveData.inPlayableArea" changed to "${event.inPlayableArea}"!`); break;
        }

    });

    // Specify the update interval and start auto updates.
    liveData.autoUpdateInterval = 10000;
    liveData.autoUpdate = true;

}

// When done, cancel the subscription
liveDataSubscription?.unsubscribe();


//
//  Train timetables
//

// Subscribe to timetable events.
const timetableSubscription = train.timetable.events.subscribe((event) => {
    switch (event.type) {
        case Sdk.Train.Timetable.Event.Type.CurrentChanged:
            console.log(`Value of "Timetable.current" changed! Next train stop: ${event.current.name}`);
    }
});

// Enable live data for some events to be emited.
train.liveData.autoUpdate = true;

// And clean up
timetableSubscription.unsubscribe();
```
<br/>
<br/>


#### [Working with result caching][working-with-result-caching]

[working-with-result-caching]: #working-with-result-caching "View Working with result caching"

```TypeScript
import Sdk from "@simrail-sdk/core";

// Cache configuration can be specified at SDK class construction.
const sdk = new Sdk({
    api: {

        /** Specifies a config for requests to the timetable endpoint. */
        timetable: {
            cache: {
                /**
                 * Specifies if caching is enabled.
                 * @default true
                 */
                enabled: true,
                /**
                 * Specifies for how long a timetable record is cached in seconds.
                 * This value also specifies the update interval for auto updates.
                 * @default 1440
                 */
                retention: 1440,
                /**
                 * Specifies if only one timetable record should be cached.
                 *
                 * When set to:
                 * - `true` only the last timetable record will be cached.
                 * - `false` a timetable record will be cached for
                 *   each server that was queried for a timetable.
                 *   Use this when you are actively querying multiple servers.
                 *
                 * @default true
                 */
                singleRecordOnly: true,
            },
        },
    
        /** Specifies a config for requests to the live data endpoint. */
        liveData: {
            cache: {
                // Values displayed are the defaults.
                activeServers:  { enabled: true, retention: 30 },
                activeStations: { enabled: true, retention: 30 },
                activeTrains:   { enabled: true, retention: 5  },
            },
        },

        ...

    },
});


// If you need to, flush cached data.
sdk.api.flushCache();
// Or
sdk.api.flushActiveServerCache();
sdk.api.flushActiveStationCache();
sdk.api.flushActiveTrainCache();
sdk.api.flushTimetableCache();

```
<br/>
<br/>


#### [Providing a (custom) API or Core API class][providing-a-custom-api-or-core-api-class]

[providing-a-custom-api-or-core-api-class]: #providing-a-custom-api-or-core-api-class "View Providing a (custom) API or Core API class"

```TypeScript
import CoreApi from "@simrail-sdk/api-core-node";
import Api from "@simrail-sdk/api";
import Sdk from "@simrail-sdk/core";

// By default the SDK will use the API class from package `@simrail-sdk/api`.
// To provide another API class or a custom one, just include the instance in the SDK config.
const api = new Api({ endpoints });
const sdk = new Sdk({ api }); // <-- Inject API here

// Or alternatively, to provide a different *Core API* class, include this in the API config.
const coreApi = new CoreApi({ endpoints });
const api     = new Api({ core: coreApi }); // <-- Inject Core API here
const sdk     = new Sdk({ api: api });      // <-- Inject API here

```
<br/>
<br/>


## [API reference][api-reference]

[api-reference]: #api-reference "View API reference"

<span style="color: #ff3300;">**NOTE**</span>: The API reference section doesn't account for `namespace`s, this unfortunately means the documentation below is not entirely complete. Please investigate the TypeScript definition files for the full API.

- [`class Entry`][api-reference-train/timetable/entry/index.ts~Entry]

    - [`new Entry.constructor(config)`][api-reference-train/timetable/entry/index.ts~Entry.constructor0]

    - [`property Entry.data`][api-reference-train/timetable/entry/index.ts~Entry.data]

    - [`property Entry.timetable`][api-reference-train/timetable/entry/index.ts~Entry.timetable]

    - [`property Entry.arrivesAt`][api-reference-train/timetable/entry/index.ts~Entry.arrivesAt]

    - [`property Entry.departsAt`][api-reference-train/timetable/entry/index.ts~Entry.departsAt]

    - [`property Entry.first`][api-reference-train/timetable/entry/index.ts~Entry.first]

    - [`property Entry.index`][api-reference-train/timetable/entry/index.ts~Entry.index]

    - [`property Entry.kilometrage`][api-reference-train/timetable/entry/index.ts~Entry.kilometrage]

    - [`property Entry.last`][api-reference-train/timetable/entry/index.ts~Entry.last]

    - [`property Entry.line`][api-reference-train/timetable/entry/index.ts~Entry.line]

    - [`property Entry.localTrack`][api-reference-train/timetable/entry/index.ts~Entry.localTrack]

    - [`property Entry.maxSpeed`][api-reference-train/timetable/entry/index.ts~Entry.maxSpeed]

    - [`property Entry.name`][api-reference-train/timetable/entry/index.ts~Entry.name]

    - [`property Entry.platform`][api-reference-train/timetable/entry/index.ts~Entry.platform]

    - [`property Entry.pointId`][api-reference-train/timetable/entry/index.ts~Entry.pointId]

    - [`property Entry.radioChannels`][api-reference-train/timetable/entry/index.ts~Entry.radioChannels]

    - [`property Entry.stationCategory`][api-reference-train/timetable/entry/index.ts~Entry.stationCategory]

    - [`property Entry.supervisedBy`][api-reference-train/timetable/entry/index.ts~Entry.supervisedBy]

    - [`property Entry.trainType`][api-reference-train/timetable/entry/index.ts~Entry.trainType]

    - [`property Entry.type`][api-reference-train/timetable/entry/index.ts~Entry.type]

    - [`method Entry.next()`][api-reference-train/timetable/entry/index.ts~Entry.next0]

    - [`method Entry.previous()`][api-reference-train/timetable/entry/index.ts~Entry.previous0]

- [`class LiveData`][api-reference-train/liveData/index.ts~LiveData]

    - [`new LiveData.constructor(config, callback)`][api-reference-train/liveData/index.ts~LiveData.constructor0]

    - [`property LiveData.events`][api-reference-train/liveData/index.ts~LiveData.events]

    - [`property LiveData.sdk`][api-reference-train/liveData/index.ts~LiveData.sdk]

    - [`property LiveData.train`][api-reference-train/liveData/index.ts~LiveData.train]

    - [`property LiveData.autoUpdate`][api-reference-train/liveData/index.ts~LiveData.autoUpdate]

    - [`property LiveData.autoUpdateInterval`][api-reference-train/liveData/index.ts~LiveData.autoUpdateInterval]

    - [`property LiveData.available`][api-reference-train/liveData/index.ts~LiveData.available]

    - [`property LiveData.data`][api-reference-train/liveData/index.ts~LiveData.data]

    - [`property LiveData.driver`][api-reference-train/liveData/index.ts~LiveData.driver]

    - [`property LiveData.inPlayableArea`][api-reference-train/liveData/index.ts~LiveData.inPlayableArea]

    - [`property LiveData.lastAvailableCheck`][api-reference-train/liveData/index.ts~LiveData.lastAvailableCheck]

    - [`property LiveData.latitude`][api-reference-train/liveData/index.ts~LiveData.latitude]

    - [`property LiveData.longitude`][api-reference-train/liveData/index.ts~LiveData.longitude]

    - [`property LiveData.signal`][api-reference-train/liveData/index.ts~LiveData.signal]

    - [`property LiveData.speed`][api-reference-train/liveData/index.ts~LiveData.speed]

    - [`property LiveData.timestamp`][api-reference-train/liveData/index.ts~LiveData.timestamp]

    - [`property LiveData.timetableIndex`][api-reference-train/liveData/index.ts~LiveData.timetableIndex]

    - [`property LiveData.vehicles`][api-reference-train/liveData/index.ts~LiveData.vehicles]

    - [`method LiveData.destroy()`][api-reference-train/liveData/index.ts~LiveData.destroy0]

    - [`method LiveData.start(autoUpdateInterval)`][api-reference-train/liveData/index.ts~LiveData.start0]

    - [`method LiveData.stop()`][api-reference-train/liveData/index.ts~LiveData.stop0]

    - [`method LiveData.update()`][api-reference-train/liveData/index.ts~LiveData.update0]

- [`class Sdk`][api-reference-index.ts~Sdk]

    - [`new Sdk.constructor(config)`][api-reference-index.ts~Sdk.constructor0]

    - [`property Sdk.api`][api-reference-index.ts~Sdk.api]

    - [`method Sdk.server(serverCode)`][api-reference-index.ts~Sdk.server0]

    - [`method Sdk.servers()`][api-reference-index.ts~Sdk.servers0]

    - [`method Sdk.station(serverCode, stationCode)`][api-reference-index.ts~Sdk.station0]

    - [`method Sdk.stations(serverCode)`][api-reference-index.ts~Sdk.stations0]

    - [`method Sdk.train(serverCode, trainNumber)`][api-reference-index.ts~Sdk.train0]

- [`class Server`][api-reference-server/index.ts~Server]

    - [`new Server.constructor(config, callback)`][api-reference-server/index.ts~Server.constructor0]

    - [`property Server.code`][api-reference-server/index.ts~Server.code]

    - [`property Server.id`][api-reference-server/index.ts~Server.id]

    - [`property Server.name`][api-reference-server/index.ts~Server.name]

    - [`property Server.region`][api-reference-server/index.ts~Server.region]

    - [`property Server.sdk`][api-reference-server/index.ts~Server.sdk]

    - [`property Server.data`][api-reference-server/index.ts~Server.data]

    - [`property Server.isActive`][api-reference-server/index.ts~Server.isActive]

    - [`method Server.activeTrainNumbers()`][api-reference-server/index.ts~Server.activeTrainNumbers0]

    - [`method Server.station(stationCode)`][api-reference-server/index.ts~Server.station0]

    - [`method Server.stations()`][api-reference-server/index.ts~Server.stations0]

    - [`method Server.toJson()`][api-reference-server/index.ts~Server.toJson0]

    - [`method Server.train(number)`][api-reference-server/index.ts~Server.train0]

    - [`method Server.update()`][api-reference-server/index.ts~Server.update0]

- [`class Station`][api-reference-station/index.ts~Station]

    - [`new Station.constructor(config, callback)`][api-reference-station/index.ts~Station.constructor0]

    - [`property Station.code`][api-reference-station/index.ts~Station.code]

    - [`property Station.difficultyLevel`][api-reference-station/index.ts~Station.difficultyLevel]

    - [`property Station.id`][api-reference-station/index.ts~Station.id]

    - [`property Station.images`][api-reference-station/index.ts~Station.images]

    - [`property Station.latitude`][api-reference-station/index.ts~Station.latitude]

    - [`property Station.longitude`][api-reference-station/index.ts~Station.longitude]

    - [`property Station.name`][api-reference-station/index.ts~Station.name]

    - [`property Station.prefix`][api-reference-station/index.ts~Station.prefix]

    - [`property Station.sdk`][api-reference-station/index.ts~Station.sdk]

    - [`property Station.serverCode`][api-reference-station/index.ts~Station.serverCode]

    - [`property Station.data`][api-reference-station/index.ts~Station.data]

    - [`property Station.dispatchers`][api-reference-station/index.ts~Station.dispatchers]

    - [`method Station.server()`][api-reference-station/index.ts~Station.server0]

    - [`method Station.switchServer(serverCode)`][api-reference-station/index.ts~Station.switchServer0]

    - [`method Station.toJson()`][api-reference-station/index.ts~Station.toJson0]

    - [`method Station.update()`][api-reference-station/index.ts~Station.update0]

- [`class Timetable`][api-reference-train/timetable/index.ts~Timetable]

    - [`new Timetable.constructor(config, callback)`][api-reference-train/timetable/index.ts~Timetable.constructor0]

    - [`property Timetable.events`][api-reference-train/timetable/index.ts~Timetable.events]

    - [`property Timetable.sdk`][api-reference-train/timetable/index.ts~Timetable.sdk]

    - [`property Timetable.train`][api-reference-train/timetable/index.ts~Timetable.train]

    - [`property Timetable.current`][api-reference-train/timetable/index.ts~Timetable.current]

    - [`property Timetable.currentIndex`][api-reference-train/timetable/index.ts~Timetable.currentIndex]

    - [`property Timetable.entries`][api-reference-train/timetable/index.ts~Timetable.entries]

    - [`property Timetable.history`][api-reference-train/timetable/index.ts~Timetable.history]

    - [`property Timetable.size`][api-reference-train/timetable/index.ts~Timetable.size]

    - [`property Timetable.upcoming`][api-reference-train/timetable/index.ts~Timetable.upcoming]

    - [`method Timetable.destroy()`][api-reference-train/timetable/index.ts~Timetable.destroy0]

    - [`method Timetable.entry(index)`][api-reference-train/timetable/index.ts~Timetable.entry0]

    - [`method Timetable.update()`][api-reference-train/timetable/index.ts~Timetable.update0]

- [`class Train`][api-reference-train/index.ts~Train]

    - [`new Train.constructor(config, callback)`][api-reference-train/index.ts~Train.constructor0]

    - [`property Train.continuesAs`][api-reference-train/index.ts~Train.continuesAs]

    - [`property Train.destination`][api-reference-train/index.ts~Train.destination]

    - [`property Train.id`][api-reference-train/index.ts~Train.id]

    - [`property Train.intNumber`][api-reference-train/index.ts~Train.intNumber]

    - [`property Train.length`][api-reference-train/index.ts~Train.length]

    - [`property Train.locoType`][api-reference-train/index.ts~Train.locoType]

    - [`property Train.name`][api-reference-train/index.ts~Train.name]

    - [`property Train.number`][api-reference-train/index.ts~Train.number]

    - [`property Train.origin`][api-reference-train/index.ts~Train.origin]

    - [`property Train.sdk`][api-reference-train/index.ts~Train.sdk]

    - [`property Train.serverCode`][api-reference-train/index.ts~Train.serverCode]

    - [`property Train.weight`][api-reference-train/index.ts~Train.weight]

    - [`property Train.data`][api-reference-train/index.ts~Train.data]

    - [`property Train.liveData`][api-reference-train/index.ts~Train.liveData]

    - [`property Train.timetable`][api-reference-train/index.ts~Train.timetable]

    - [`method Train.destroy()`][api-reference-train/index.ts~Train.destroy0]

    - [`method Train.server()`][api-reference-train/index.ts~Train.server0]

    - [`method Train.switchServer(serverCode)`][api-reference-train/index.ts~Train.switchServer0]

    - [`method Train.toJson()`][api-reference-train/index.ts~Train.toJson0]

    - [`method Train.update()`][api-reference-train/index.ts~Train.update0]

- [`const DEFAULT_ACTIVE_SERVER_RETENTION`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~DEFAULT_ACTIVE_SERVER_RETENTION]

- [`const DEFAULT_ACTIVE_STATION_RETENTION`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~DEFAULT_ACTIVE_STATION_RETENTION]

- [`const DEFAULT_ACTIVE_TRAIN_RETENTION`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~DEFAULT_ACTIVE_TRAIN_RETENTION]

- [`const DEFAULT_TIMETABLE_RETENTION`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~DEFAULT_TIMETABLE_RETENTION]

- [`const DEFAULT_UPDATE_INTERVAL`][api-reference-train/liveData/index.ts~DEFAULT_UPDATE_INTERVAL]

- [`const VERSION`][api-reference-index.ts~VERSION]

- [`const VMAX`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~VMAX]

- [`const VMAX_VALUE`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~VMAX_VALUE]

- [`enum Type`][api-reference-train/timetable/index.ts~Type]

    - [`member Type.CurrentChanged`][api-reference-train/timetable/index.ts~Type.CurrentChanged]

- [`function exception(code, message)`][api-reference-common/index.ts~exception0]

- [`function get(config)`][api-reference-train/timetable/index.ts~get0]

- [`interface ActiveServersUpdated`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveServersUpdated]

    - [`property ActiveServersUpdated.activeServers`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveServersUpdated.activeServers]

- [`interface ActiveStationsUpdated`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveStationsUpdated]

    - [`property ActiveStationsUpdated.activeStations`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveStationsUpdated.activeStations]

- [`interface ActiveTrainsUpdated`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveTrainsUpdated]

    - [`property ActiveTrainsUpdated.activeTrains`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveTrainsUpdated.activeTrains]

- [`interface AutoUpdateChanged`][api-reference-train/liveData/index.ts~AutoUpdateChanged]

    - [`property AutoUpdateChanged.autoUpdate`][api-reference-train/liveData/index.ts~AutoUpdateChanged.autoUpdate]

    - [`property AutoUpdateChanged.autoUpdateInterval`][api-reference-train/liveData/index.ts~AutoUpdateChanged.autoUpdateInterval]

- [`interface AutoUpdateIntervalChanged`][api-reference-train/liveData/index.ts~AutoUpdateIntervalChanged]

    - [`property AutoUpdateIntervalChanged.autoUpdate`][api-reference-train/liveData/index.ts~AutoUpdateIntervalChanged.autoUpdate]

    - [`property AutoUpdateIntervalChanged.autoUpdateInterval`][api-reference-train/liveData/index.ts~AutoUpdateIntervalChanged.autoUpdateInterval]

- [`interface AvailableChanged`][api-reference-train/liveData/index.ts~AvailableChanged]

    - [`property AvailableChanged.available`][api-reference-train/liveData/index.ts~AvailableChanged.available]

- [`interface Base`][api-reference-train/timetable/index.ts~Base]

    - [`property Base.timetable`][api-reference-train/timetable/index.ts~Base.timetable]

    - [`property Base.type`][api-reference-train/timetable/index.ts~Base.type]

- [`interface Bot`][api-reference-train/liveData/index.ts~Bot]

- [`interface Cache`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Cache]

    - [`property Cache.activeServers`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Cache.activeServers]

    - [`property Cache.activeStations`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Cache.activeStations]

    - [`property Cache.activeTrains`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Cache.activeTrains]

- [`interface Config`][api-reference-train/timetable/index.ts~Config]

    - [`property Config.data`][api-reference-train/timetable/index.ts~Config.data]

    - [`property Config.sdk`][api-reference-train/timetable/index.ts~Config.sdk]

    - [`property Config.train`][api-reference-train/timetable/index.ts~Config.train]

- [`interface CurrentChanged`][api-reference-train/timetable/index.ts~CurrentChanged]

    - [`property CurrentChanged.current`][api-reference-train/timetable/index.ts~CurrentChanged.current]

- [`interface Data`][api-reference-train/timetable/entry/index.ts~Data]

    - [`property Data.arrivesAt`][api-reference-train/timetable/entry/index.ts~Data.arrivesAt]

    - [`property Data.departsAt`][api-reference-train/timetable/entry/index.ts~Data.departsAt]

    - [`property Data.first`][api-reference-train/timetable/entry/index.ts~Data.first]

    - [`property Data.index`][api-reference-train/timetable/entry/index.ts~Data.index]

    - [`property Data.kilometrage`][api-reference-train/timetable/entry/index.ts~Data.kilometrage]

    - [`property Data.last`][api-reference-train/timetable/entry/index.ts~Data.last]

    - [`property Data.line`][api-reference-train/timetable/entry/index.ts~Data.line]

    - [`property Data.localTrack`][api-reference-train/timetable/entry/index.ts~Data.localTrack]

    - [`property Data.maxSpeed`][api-reference-train/timetable/entry/index.ts~Data.maxSpeed]

    - [`property Data.name`][api-reference-train/timetable/entry/index.ts~Data.name]

    - [`property Data.platform`][api-reference-train/timetable/entry/index.ts~Data.platform]

    - [`property Data.pointId`][api-reference-train/timetable/entry/index.ts~Data.pointId]

    - [`property Data.radioChannels`][api-reference-train/timetable/entry/index.ts~Data.radioChannels]

    - [`property Data.stationCategory`][api-reference-train/timetable/entry/index.ts~Data.stationCategory]

    - [`property Data.supervisedBy`][api-reference-train/timetable/entry/index.ts~Data.supervisedBy]

    - [`property Data.trainType`][api-reference-train/timetable/entry/index.ts~Data.trainType]

    - [`property Data.type`][api-reference-train/timetable/entry/index.ts~Data.type]

- [`interface DataUpdated`][api-reference-train/liveData/index.ts~DataUpdated]

    - [`property DataUpdated.data`][api-reference-train/liveData/index.ts~DataUpdated.data]

- [`interface Destination`][api-reference-train/index.ts~Destination]

    - [`property Destination.arrivesAt`][api-reference-train/index.ts~Destination.arrivesAt]

- [`interface Disabled`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Disabled]

- [`interface DispatchedBy`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~DispatchedBy]

    - [`property DispatchedBy.ServerCode`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~DispatchedBy.ServerCode]

    - [`property DispatchedBy.SteamId`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~DispatchedBy.SteamId]

- [`interface Dispatcher`][api-reference-station/index.ts~Dispatcher]

    - [`property Dispatcher.steamId`][api-reference-station/index.ts~Dispatcher.steamId]

- [`interface Enabled`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Enabled]

    - [`property Enabled.retention`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Enabled.retention]

    - [`property Enabled.singleRecordOnly`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Enabled.singleRecordOnly]

- [`interface Endpoints`][api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts~Endpoints]

    - [`property Endpoints.liveData`][api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts~Endpoints.liveData]

    - [`property Endpoints.timetable`][api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts~Endpoints.timetable]

- [`interface Error`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Error]

- [`interface Images`][api-reference-station/index.ts~Images]

    - [`property Images.primary`][api-reference-station/index.ts~Images.primary]

    - [`property Images.secondary`][api-reference-station/index.ts~Images.secondary]

- [`interface InPlayableAreaChanged`][api-reference-train/liveData/index.ts~InPlayableAreaChanged]

    - [`property InPlayableAreaChanged.inPlayableArea`][api-reference-train/liveData/index.ts~InPlayableAreaChanged.inPlayableArea]

- [`interface LiveData`][api-reference-station/index.ts~LiveData]

    - [`property LiveData.dispatchers`][api-reference-station/index.ts~LiveData.dispatchers]

- [`interface Origin`][api-reference-train/index.ts~Origin]

    - [`property Origin.departsAt`][api-reference-train/index.ts~Origin.departsAt]

- [`interface OriginDestinationBase`][api-reference-train/index.d.ts~OriginDestinationBase]

    - [`property OriginDestinationBase.stationName`][api-reference-train/index.d.ts~OriginDestinationBase.stationName]

- [`interface Raw`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw]

    - [`property Raw.arrivalTime`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.arrivalTime]

    - [`property Raw.mileage`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.mileage]

    - [`property Raw.platform`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.platform]

    - [`property Raw.radioChanels`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.radioChanels]

    - [`property Raw.stationCategory`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.stationCategory]

    - [`property Raw.stopType`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.stopType]

    - [`property Raw.supervisedBy`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.supervisedBy]

    - [`property Raw.track`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.track]

- [`interface Regular`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Regular]

- [`interface Server`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server]

    - [`property Server.id`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server.id]

    - [`property Server.isActive`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server.isActive]

    - [`property Server.serverCode`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server.serverCode]

    - [`property Server.serverName`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server.serverName]

    - [`property Server.serverRegion`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server.serverRegion]

- [`interface Signal`][api-reference-train/liveData/index.ts~Signal]

    - [`property Signal.data`][api-reference-train/liveData/index.ts~Signal.data]

    - [`property Signal.distance`][api-reference-train/liveData/index.ts~Signal.distance]

    - [`property Signal.id`][api-reference-train/liveData/index.ts~Signal.id]

    - [`property Signal.speed`][api-reference-train/liveData/index.ts~Signal.speed]

- [`interface Station`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Station]

    - [`property Station.code`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Station.code]

- [`interface Successful`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Successful]

    - [`property Successful.count`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Successful.count]

    - [`property Successful.data`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Successful.data]

    - [`property Successful.description`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Successful.description]

- [`interface Timetable`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Timetable]

    - [`property Timetable.cache`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Timetable.cache]

- [`interface TimetableIndexChanged`][api-reference-train/liveData/index.ts~TimetableIndexChanged]

    - [`property TimetableIndexChanged.timetableIndex`][api-reference-train/liveData/index.ts~TimetableIndexChanged.timetableIndex]

- [`interface TimetableUpdated`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~TimetableUpdated]

    - [`property TimetableUpdated.timetable`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~TimetableUpdated.timetable]

- [`interface Train`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train]

    - [`property Train.endStation`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.endStation]

    - [`property Train.id`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.id]

    - [`property Train.runId`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.runId]

    - [`property Train.serverCode`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.serverCode]

    - [`property Train.startStation`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.startStation]

    - [`property Train.trainData`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.trainData]

    - [`property Train.trainName`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.trainName]

    - [`property Train.trainNoLocal`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.trainNoLocal]

    - [`property Train.type`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.type]

    - [`property Train.vehicles`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.vehicles]

- [`interface TrainData`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData]

    - [`property TrainData.controlledBySteamId`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.controlledBySteamId]

    - [`property TrainData.distanceToSignalInFront`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.distanceToSignalInFront]

    - [`property TrainData.inBorderStationArea`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.inBorderStationArea]

    - [`property TrainData.latitude`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.latitude]

    - [`property TrainData.longitude`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.longitude]

    - [`property TrainData.signalInFront`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.signalInFront]

    - [`property TrainData.signalInFrontSpeed`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.signalInFrontSpeed]

    - [`property TrainData.vdDelayedTimetableIndex`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.vdDelayedTimetableIndex]

    - [`property TrainData.velocity`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.velocity]

- [`interface Types`][api-reference-train/timetable/entry/index.ts~Types]

- [`interface User`][api-reference-train/liveData/index.ts~User]

    - [`property User.steamId`][api-reference-train/liveData/index.ts~User.steamId]

- [`interface WithCore`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~WithCore]

    - [`property WithCore.core`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~WithCore.core]

- [`type ActiveServers`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveServers]

- [`type ActiveStations`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveStations]

- [`type ActiveTrains`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveTrains]

- [`type ApiResponse`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~ApiResponse]

- [`type ArrivalTime`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~ArrivalTime]

- [`type AutoUpdate`][api-reference-train/liveData/index.ts~AutoUpdate]

- [`type AutoUpdateInterval`][api-reference-train/liveData/index.ts~AutoUpdateInterval]

- [`type AutoUpdateServer`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~AutoUpdateServer]

- [`type Available`][api-reference-train/liveData/index.ts~Available]

- [`type Cache`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Cache]

- [`type Callback`][api-reference-train/timetable/index.ts~Callback]

- [`type Code`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Code]

- [`type Config`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Config]

- [`type ContinuesAs`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~ContinuesAs]

- [`type ControlledBySteamId`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~ControlledBySteamId]

- [`type Count`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Count]

- [`type DepartureTime`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~DepartureTime]

- [`type Description`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Description]

- [`type DifficultyLevel`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~DifficultyLevel]

- [`type DisplayedTrainNumber`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~DisplayedTrainNumber]

- [`type DistanceToSignalInFront`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~DistanceToSignalInFront]

- [`type Driver`][api-reference-train/liveData/index.ts~Driver]

- [`type Emitter`][api-reference-train/timetable/index.ts~Emitter]

- [`type EndsAt`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~EndsAt]

- [`type EndStation`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~EndStation]

- [`type Event`][api-reference-train/timetable/index.ts~Event]

- [`type First`][api-reference-train/timetable/entry/index.ts~First]

- [`type GetUpdateDataFunction`][api-reference-train/liveData/index.ts~GetUpdateDataFunction]

- [`type Id`][api-reference-train/liveData/index.ts~Id]

- [`type ImageUrl`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~ImageUrl]

- [`type InBorderStationArea`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~InBorderStationArea]

- [`type Index`][api-reference-train/timetable/entry/index.ts~Index]

- [`type IsActive`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~IsActive]

- [`type Kilometrage`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Kilometrage]

- [`type Last`][api-reference-train/timetable/entry/index.ts~Last]

- [`type LastAvailableCheck`][api-reference-train/liveData/index.ts~LastAvailableCheck]

- [`type Latititude`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Latititude]

- [`type Latititute`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Latititute]

- [`type Latitude`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Latitude]

- [`type Line`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Line]

- [`type List`][api-reference-train/timetable/entry/index.ts~List]

- [`type LocoType`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~LocoType]

- [`type Longitude`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Longitude]

- [`type Longitute`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Longitute]

- [`type Map`][api-reference-station/index.ts~Map]

- [`type MaxSpeed`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~MaxSpeed]

- [`type Mileage`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Mileage]

- [`type Mutable`][api-reference-common/index.ts~Mutable]

- [`type Name`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Name]

- [`type NameForPerson`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~NameForPerson]

- [`type NameOfPoint`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~NameOfPoint]

- [`type NoCache`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~NoCache]

- [`type Number`][api-reference-train/index.ts~Number]

- [`type Platform`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Platform]

- [`type PointId`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~PointId]

- [`type Prefix`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Prefix]

- [`type RadioChannel`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~RadioChannel]

- [`type RadioChannels`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~RadioChannels]

- [`type Result`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Result]

- [`type Retention`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Retention]

- [`type RunId`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~RunId]

- [`type ServerCode`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~ServerCode]

- [`type ServerName`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~ServerName]

- [`type ServerRegion`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~ServerRegion]

- [`type SignalInFront`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~SignalInFront]

- [`type SignalInFrontSpeed`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~SignalInFrontSpeed]

- [`type SingleRecordOnly`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~SingleRecordOnly]

- [`type Size`][api-reference-train/timetable/index.ts~Size]

- [`type StartsAt`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~StartsAt]

- [`type StartStation`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~StartStation]

- [`type StationCategory`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~StationCategory]

- [`type SteamId`][api-reference-station/index.ts~SteamId]

- [`type StopType`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~StopType]

- [`type SupervisedBy`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~SupervisedBy]

- [`type Time`][api-reference-train/index.ts~Time]

- [`type Timestamp`][api-reference-train/liveData/index.ts~Timestamp]

- [`type Track`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Track]

- [`type TrainLength`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainLength]

- [`type TrainName`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainName]

- [`type TrainNoInternational`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainNoInternational]

- [`type TrainNoLocal`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainNoLocal]

- [`type TrainType`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainType]

- [`type TrainWeight`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainWeight]

- [`type Type`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Type]

- [`type UpdateDataFunction`][api-reference-train/liveData/index.ts~UpdateDataFunction]

- [`type Url`][api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts~Url]

- [`type VdDelayedTimetableIndex`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~VdDelayedTimetableIndex]

- [`type Vehicle`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Vehicle]

- [`type Vehicles`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Vehicles]

- [`type Velocity`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Velocity]

- [`type Version`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Version]

<br/>
<br/>
<br/>

[api-reference-@simrail-sdk/core]: @simrail-sdk/core "View module \"@simrail-sdk/core\""
[api-reference-common]: common "View module \"common\""
[api-reference-common/index.d.ts]: common/index.d.ts "View module \"common/index.d.ts\""
[api-reference-common/index.ts]: common/index.ts "View module \"common/index.ts\""
[api-reference-index]: index "View module \"index\""
[api-reference-index.d.ts]: index.d.ts "View module \"index.d.ts\""
[api-reference-node_modules/@simrail-sdk/api/index.d.ts]: node_modules/@simrail-sdk/api/index.d.ts "View module \"node_modules/@simrail-sdk/api/index.d.ts\""
[api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts]: node_modules/@simrail-sdk/api-core-node/index.d.ts "View module \"node_modules/@simrail-sdk/api-core-node/index.d.ts\""
[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]: node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts "View module \"node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts\""
[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]: node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts "View module \"node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts\""
[api-reference-line/index.ts]: line/index.ts "View module \"line/index.ts\""
[api-reference-server/index.ts]: server/index.ts "View module \"server/index.ts\""
[api-reference-train/index.ts]: train/index.ts "View module \"train/index.ts\""
[api-reference-train/liveData/index.ts]: train/liveData/index.ts "View module \"train/liveData/index.ts\""
[api-reference-station/index.ts]: station/index.ts "View module \"station/index.ts\""
[api-reference-train/timetable/index.ts]: train/timetable/index.ts "View module \"train/timetable/index.ts\""
[api-reference-train/timetable/entry/index.ts]: train/timetable/entry/index.ts "View module \"train/timetable/entry/index.ts\""
[api-reference-track/index.ts]: track/index.ts "View module \"track/index.ts\""
[api-reference-index.ts]: index.ts "View module \"index.ts\""
[api-reference-line]: line "View module \"line\""
[api-reference-line/index.d.ts]: line/index.d.ts "View module \"line/index.d.ts\""
[api-reference-server]: server "View module \"server\""
[api-reference-server/index.d.ts]: server/index.d.ts "View module \"server/index.d.ts\""
[api-reference-station]: station "View module \"station\""
[api-reference-station/index.d.ts]: station/index.d.ts "View module \"station/index.d.ts\""
[api-reference-track]: track "View module \"track\""
[api-reference-track/index.d.ts]: track/index.d.ts "View module \"track/index.d.ts\""
[api-reference-train]: train "View module \"train\""
[api-reference-train/index.d.ts]: train/index.d.ts "View module \"train/index.d.ts\""
[api-reference-train/liveData]: train/liveData "View module \"train/liveData\""
[api-reference-train/liveData/index.d.ts]: train/liveData/index.d.ts "View module \"train/liveData/index.d.ts\""
[api-reference-train/timetable/entry]: train/timetable/entry "View module \"train/timetable/entry\""
[api-reference-train/timetable/entry/index.d.ts]: train/timetable/entry/index.d.ts "View module \"train/timetable/entry/index.d.ts\""
[api-reference-train/timetable]: train/timetable "View module \"train/timetable\""
[api-reference-train/timetable/index.d.ts]: train/timetable/index.d.ts "View module \"train/timetable/index.d.ts\""

### [`class Entry`][api-reference-train/timetable/entry/index.ts~Entry]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry]: #class-entry&nbsp;&nbsp;&nbsp;&uarr; "View class Entry"

**Implements**:&nbsp;&nbsp;<u>[`Data`][api-reference-train/timetable/entry/index.ts~Data]</u>

| Type params: | *Extends* | *Optional* | *Default* |
| ------------ | --------- | ---------- | --------- |
| `Types` | <code><u>[`Entry.Types`][api-reference-train/timetable/entry/index.ts~Types]</u></code> | No | N/A |
| `EntryType` | <code><u>[`Entry.Type`][api-reference-train/timetable/entry/index.ts~Type]</u></code> | Yes | <code><u>[`Entry.Type`][api-reference-train/timetable/entry/index.ts~Type]</u></code> |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:23][api-reference-train/timetable/entry/index.ts]

<br/>
<br/>

#### [`new Entry.constructor(config)`][api-reference-train/timetable/entry/index.ts~Entry.constructor0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.constructor0]: #new-entryconstructorconfig&nbsp;&nbsp;&nbsp;&uarr; "View new Entry.constructor()"

| Type params: | *Extends* | *Optional* | *Default* |
| ------------ | --------- | ---------- | --------- |
| `Types` | <code><u>[`Types`][api-reference-train/timetable/entry/index.ts~Types]</u>&#60;`Types`&#62;</code> | No | N/A |
| `EntryType` | <code><u>[`Type`][api-reference-train/timetable/entry/index.ts~Type]</u></code> | Yes | <code><u>[`Type`][api-reference-train/timetable/entry/index.ts~Type]</u></code> |

| Arguments: | *Type* |
| ---------- | ------ |
| `config` | <code><u>[`Config`][api-reference-train/timetable/entry/index.ts~Config]</u>&#60;`Types` &#124; `EntryType`&#62;</code> |

**Returns**:&nbsp;&nbsp;<code><u>[`Entry`][api-reference-train/timetable/entry/index.ts~Entry]</u>&#60;`Types` &#124; `EntryType`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:97][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.data`][api-reference-train/timetable/entry/index.ts~Entry.data]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.data]: #property-entrydata&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.data"

<kbd>read-only</kbd>

**Type**:&nbsp;&nbsp;<code><u>[`Data`][api-reference-train/timetable/entry/index.ts~Data]</u>&#60;`EntryType`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:27][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.timetable`][api-reference-train/timetable/entry/index.ts~Entry.timetable]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.timetable]: #property-entrytimetable&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.timetable"

<kbd>read-only</kbd>

**Type**:&nbsp;&nbsp;<code><u>[`Timetable`][api-reference-train/timetable/index.ts~Timetable]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:25][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.arrivesAt`][api-reference-train/timetable/entry/index.ts~Entry.arrivesAt]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.arrivesAt]: #property-entryarrivesat&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.arrivesAt"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:29][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.departsAt`][api-reference-train/timetable/entry/index.ts~Entry.departsAt]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.departsAt]: #property-entrydepartsat&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.departsAt"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:33][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.first`][api-reference-train/timetable/entry/index.ts~Entry.first]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.first]: #property-entryfirst&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.first"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:37][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.index`][api-reference-train/timetable/entry/index.ts~Entry.index]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.index]: #property-entryindex&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.index"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:41][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.kilometrage`][api-reference-train/timetable/entry/index.ts~Entry.kilometrage]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.kilometrage]: #property-entrykilometrage&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.kilometrage"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:45][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.last`][api-reference-train/timetable/entry/index.ts~Entry.last]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.last]: #property-entrylast&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.last"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:49][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.line`][api-reference-train/timetable/entry/index.ts~Entry.line]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.line]: #property-entryline&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.line"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:53][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.localTrack`][api-reference-train/timetable/entry/index.ts~Entry.localTrack]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.localTrack]: #property-entrylocaltrack&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.localTrack"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:57][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.maxSpeed`][api-reference-train/timetable/entry/index.ts~Entry.maxSpeed]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.maxSpeed]: #property-entrymaxspeed&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.maxSpeed"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:61][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.name`][api-reference-train/timetable/entry/index.ts~Entry.name]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.name]: #property-entryname&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.name"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:65][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.platform`][api-reference-train/timetable/entry/index.ts~Entry.platform]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.platform]: #property-entryplatform&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.platform"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:69][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.pointId`][api-reference-train/timetable/entry/index.ts~Entry.pointId]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.pointId]: #property-entrypointid&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.pointId"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:73][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.radioChannels`][api-reference-train/timetable/entry/index.ts~Entry.radioChannels]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.radioChannels]: #property-entryradiochannels&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.radioChannels"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:77][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.stationCategory`][api-reference-train/timetable/entry/index.ts~Entry.stationCategory]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.stationCategory]: #property-entrystationcategory&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.stationCategory"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:81][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.supervisedBy`][api-reference-train/timetable/entry/index.ts~Entry.supervisedBy]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.supervisedBy]: #property-entrysupervisedby&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.supervisedBy"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:85][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.trainType`][api-reference-train/timetable/entry/index.ts~Entry.trainType]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.trainType]: #property-entrytraintype&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.trainType"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:89][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Entry.type`][api-reference-train/timetable/entry/index.ts~Entry.type]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.type]: #property-entrytype&nbsp;&nbsp;&nbsp;&uarr; "View property Entry.type"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:93][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`method Entry.next()`][api-reference-train/timetable/entry/index.ts~Entry.next0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.next0]: #method-entrynext&nbsp;&nbsp;&nbsp;&uarr; "View method Entry.next()"

**Returns**:&nbsp;&nbsp;<code>`undefined` &#124; <u>[`Entry`][api-reference-train/timetable/entry/index.ts~Entry]</u>&#60;`Types` &#124; <u>[`Type`][api-reference-train/timetable/entry/index.ts~Type]</u>&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:102][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`method Entry.previous()`][api-reference-train/timetable/entry/index.ts~Entry.previous0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Entry.previous0]: #method-entryprevious&nbsp;&nbsp;&nbsp;&uarr; "View method Entry.previous()"

**Returns**:&nbsp;&nbsp;<code>`undefined` &#124; <u>[`Entry`][api-reference-train/timetable/entry/index.ts~Entry]</u>&#60;`Types` &#124; <u>[`Type`][api-reference-train/timetable/entry/index.ts~Type]</u>&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:108][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

<br/>

### [`class LiveData`][api-reference-train/liveData/index.ts~LiveData]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData]: #class-livedata&nbsp;&nbsp;&nbsp;&uarr; "View class LiveData"

Specifies live data of a train.

See `LiveData.get()` for an `await`able constructor method.

**Implements**:&nbsp;&nbsp;<u>[`Data`][api-reference-train/liveData/index.ts~Data]</u>

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `Types` | <code><u>[`LiveData.Train.Types`][api-reference-train/index.ts~Types]</u></code> | Type information about the `LiveData` and SDK. |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:36][api-reference-train/liveData/index.ts]

<br/>
<br/>

#### [`new LiveData.constructor(config, callback)`][api-reference-train/liveData/index.ts~LiveData.constructor0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.constructor0]: #new-livedataconstructorconfig-callback&nbsp;&nbsp;&nbsp;&uarr; "View new LiveData.constructor()"

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><u>[`Types`][api-reference-train/index.ts~Types]</u>&#60;`string` &#124; `string` &#124; `string` &#124; `string` &#124; `Types`&#62;</code> |

| Arguments: | *Type* |
| ---------- | ------ |
| `config` | <code><u>[`Config`][api-reference-train/liveData/index.ts~Config]</u>&#60;`Types`&#62;</code> |
| `callback` | <code><u>[`Callback`][api-reference-train/liveData/index.ts~Callback]</u>&#60;`Types`&#62;</code> |

**Returns**:&nbsp;&nbsp;<code><u>[`LiveData`][api-reference-train/liveData/index.ts~LiveData]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:214][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.events`][api-reference-train/liveData/index.ts~LiveData.events]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.events]: #property-livedataevents&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.events"

<kbd>read-only</kbd>

Specifies a live data event emitter.

**Type**:&nbsp;&nbsp;<code><u>[`Emitter`][api-reference-train/liveData/index.ts~Emitter]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:39][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.sdk`][api-reference-train/liveData/index.ts~LiveData.sdk]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.sdk]: #property-livedatasdk&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.sdk"

<kbd>read-only</kbd>

Specifies a reference to the `Sdk` class instance.

**Type**:&nbsp;&nbsp;<code><u>[`Sdk`][api-reference-index.ts~Sdk]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:42][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.train`][api-reference-train/liveData/index.ts~LiveData.train]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.train]: #property-livedatatrain&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.train"

<kbd>read-only</kbd>

Specifies a reference to the `Train` the live data belongs to.

**Type**:&nbsp;&nbsp;<code><u>[`Train`][api-reference-train/index.ts~Train]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:45][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.autoUpdate`][api-reference-train/liveData/index.ts~LiveData.autoUpdate]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.autoUpdate]: #property-livedataautoupdate&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.autoUpdate"

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:94][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.autoUpdateInterval`][api-reference-train/liveData/index.ts~LiveData.autoUpdateInterval]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.autoUpdateInterval]: #property-livedataautoupdateinterval&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.autoUpdateInterval"

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:112][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.available`][api-reference-train/liveData/index.ts~LiveData.available]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.available]: #property-livedataavailable&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.available"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:139][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.data`][api-reference-train/liveData/index.ts~LiveData.data]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.data]: #property-livedatadata&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.data"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:76][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.driver`][api-reference-train/liveData/index.ts~LiveData.driver]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.driver]: #property-livedatadriver&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.driver"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:145][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.inPlayableArea`][api-reference-train/liveData/index.ts~LiveData.inPlayableArea]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.inPlayableArea]: #property-livedatainplayablearea&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.inPlayableArea"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:151][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.lastAvailableCheck`][api-reference-train/liveData/index.ts~LiveData.lastAvailableCheck]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.lastAvailableCheck]: #property-livedatalastavailablecheck&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.lastAvailableCheck"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:157][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.latitude`][api-reference-train/liveData/index.ts~LiveData.latitude]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.latitude]: #property-livedatalatitude&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.latitude"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:163][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.longitude`][api-reference-train/liveData/index.ts~LiveData.longitude]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.longitude]: #property-livedatalongitude&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.longitude"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:169][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.signal`][api-reference-train/liveData/index.ts~LiveData.signal]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.signal]: #property-livedatasignal&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.signal"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:175][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.speed`][api-reference-train/liveData/index.ts~LiveData.speed]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.speed]: #property-livedataspeed&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.speed"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:181][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.timestamp`][api-reference-train/liveData/index.ts~LiveData.timestamp]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.timestamp]: #property-livedatatimestamp&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.timestamp"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:187][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.timetableIndex`][api-reference-train/liveData/index.ts~LiveData.timetableIndex]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.timetableIndex]: #property-livedatatimetableindex&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.timetableIndex"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:193][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property LiveData.vehicles`][api-reference-train/liveData/index.ts~LiveData.vehicles]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.vehicles]: #property-livedatavehicles&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.vehicles"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:204][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`method LiveData.destroy()`][api-reference-train/liveData/index.ts~LiveData.destroy0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.destroy0]: #method-livedatadestroy&nbsp;&nbsp;&nbsp;&uarr; "View method LiveData.destroy()"

Method to destroy this `LiveData` instance.

**NOTE**: Calling this method is **not** required. Only use this when really needed.

**Returns**:&nbsp;&nbsp;<code>`void`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:230][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`method LiveData.start(autoUpdateInterval)`][api-reference-train/liveData/index.ts~LiveData.start0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.start0]: #method-livedatastartautoupdateinterval&nbsp;&nbsp;&nbsp;&uarr; "View method LiveData.start()"

Method to start auto updating live data.

**NOTE**: Auto update only works when the train is available.
  When the train becomes unavailable auto updates will stop.

| Arguments: | *Type* | *Optional* | *Description* |
| ---------- | ------ | ---------- | ------------- |
| `autoUpdateInterval` | <code>`number`</code> | Yes | The interval between updates in milliseconds. |

**Returns**:&nbsp;&nbsp;<code><u>[`LiveData`][api-reference-train/liveData/index.ts~LiveData]</u>&#60;`Types`&#62;</code>&nbsp;&nbsp;- This `LiveData` instance.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:245][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`method LiveData.stop()`][api-reference-train/liveData/index.ts~LiveData.stop0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.stop0]: #method-livedatastop&nbsp;&nbsp;&nbsp;&uarr; "View method LiveData.stop()"

Method to stop auto updating live data.

**Returns**:&nbsp;&nbsp;<code><u>[`LiveData`][api-reference-train/liveData/index.ts~LiveData]</u>&#60;`Types`&#62;</code>&nbsp;&nbsp;- This `LiveData` instance.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:263][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`method LiveData.update()`][api-reference-train/liveData/index.ts~LiveData.update0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LiveData.update0]: #method-livedataupdate&nbsp;&nbsp;&nbsp;&uarr; "View method LiveData.update()"

Method to update the live data of this train with live data from the API.

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`LiveData`][api-reference-train/liveData/index.ts~LiveData]</u>&#60;`Types`&#62;&#62;</code>&nbsp;&nbsp;- This `LiveData` instance.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:280][api-reference-train/liveData/index.ts]

<br/>

<br/>

<br/>

### [`class Sdk`][api-reference-index.ts~Sdk]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-index.ts~Sdk]: #class-sdk&nbsp;&nbsp;&nbsp;&uarr; "View class Sdk"

Specifies a SimRail Core SDK instance.

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `Types` | <code><u>[`Sdk.Types`][api-reference-index.ts~Types]</u></code> | Type information about the SDK. |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[index.ts:34][api-reference-index.ts]

<br/>
<br/>

#### [`new Sdk.constructor(config)`][api-reference-index.ts~Sdk.constructor0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-index.ts~Sdk.constructor0]: #new-sdkconstructorconfig&nbsp;&nbsp;&nbsp;&uarr; "View new Sdk.constructor()"

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><u>[`Types`][api-reference-index.ts~Types]</u></code> |

| Arguments: | *Type* |
| ---------- | ------ |
| `config` | <code><u>[`Config`][api-reference-index.ts~Config]</u></code> |

**Returns**:&nbsp;&nbsp;<code><u>[`Sdk`][api-reference-index.ts~Sdk]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[index.ts:41][api-reference-index.ts]

<br/>

<br/>

#### [`property Sdk.api`][api-reference-index.ts~Sdk.api]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-index.ts~Sdk.api]: #property-sdkapi&nbsp;&nbsp;&nbsp;&uarr; "View property Sdk.api"

<kbd>read-only</kbd>

Specifies a reference to the `Api` class instance.

**Type**:&nbsp;&nbsp;<code><u>[`Api`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Api]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[index.ts:37][api-reference-index.ts]

<br/>

<br/>

#### [`method Sdk.server(serverCode)`][api-reference-index.ts~Sdk.server0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-index.ts~Sdk.server0]: #method-sdkserverservercode&nbsp;&nbsp;&nbsp;&uarr; "View method Sdk.server()"

Method to retrieve a `Server` instance.

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `ServerCode` | <code>`string`</code> | The unique code of the server. |

| Arguments: | *Type* | *Description* |
| ---------- | ------ | ------------- |
| `serverCode` | <code>`ServerCode`</code> | The unique code of the server. |

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Server`][api-reference-server/index.ts~Server]</u>&#60;`Types` &#38; { serverCode: `ServerCode` }&#62;&#62;</code>&nbsp;&nbsp;- The `Server` instance.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[index.ts:53][api-reference-index.ts]

<br/>

<br/>

#### [`method Sdk.servers()`][api-reference-index.ts~Sdk.servers0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-index.ts~Sdk.servers0]: #method-sdkservers&nbsp;&nbsp;&nbsp;&uarr; "View method Sdk.servers()"

Method to retrieve a map of `Server` instances.

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Map`][api-reference-server/index.ts~Map]</u>&#60;`Types`&#62;&#62;</code>&nbsp;&nbsp;- The map of `Server` instances.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[index.ts:69][api-reference-index.ts]

<br/>

<br/>

#### [`method Sdk.station(serverCode, stationCode)`][api-reference-index.ts~Sdk.station0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-index.ts~Sdk.station0]: #method-sdkstationservercode-stationcode&nbsp;&nbsp;&nbsp;&uarr; "View method Sdk.station()"

Method to retrieve a `Station` instance related to a server.

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `ServerCode` | <code>`string`</code> | The unique code of the server. |
| `StationCode` | <code>`string`</code> | The unique code of the station. |

| Arguments: | *Type* | *Description* |
| ---------- | ------ | ------------- |
| `serverCode` | <code>`ServerCode`</code> | The unique code of the server. |
| `stationCode` | <code>`StationCode`</code> | The unique code of the station. |

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Station`][api-reference-station/index.ts~Station]</u>&#60;`Types` &#38; { serverCode: `ServerCode`, stationCode: `StationCode` }&#62;&#62;</code>&nbsp;&nbsp;- The `Station` instance.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[index.ts:92][api-reference-index.ts]

<br/>

<br/>

#### [`method Sdk.stations(serverCode)`][api-reference-index.ts~Sdk.stations0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-index.ts~Sdk.stations0]: #method-sdkstationsservercode&nbsp;&nbsp;&nbsp;&uarr; "View method Sdk.stations()"

Method to retrieve a map of `Station` instances related to a server.

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `ServerCode` | <code>`string`</code> | The unique code of the server. |

| Arguments: | *Type* | *Description* |
| ---------- | ------ | ------------- |
| `serverCode` | <code>`ServerCode`</code> | The unique code of the server. |

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Map`][api-reference-station/index.ts~Map]</u>&#60;`Types` &#38; { serverCode: `ServerCode` }&#62;&#62;</code>&nbsp;&nbsp;- The map of `Station` instances.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[index.ts:104][api-reference-index.ts]

<br/>

<br/>

#### [`method Sdk.train(serverCode, trainNumber)`][api-reference-index.ts~Sdk.train0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-index.ts~Sdk.train0]: #method-sdktrainservercode-trainnumber&nbsp;&nbsp;&nbsp;&uarr; "View method Sdk.train()"

Method to retrieve a `Train` instance related to a server.

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `ServerCode` | <code>`string`</code> | The unique code of the server. |
| `TrainNumber` | <code>`string`</code> | The national or local number of the train. |

| Arguments: | *Type* | *Description* |
| ---------- | ------ | ------------- |
| `serverCode` | <code>`ServerCode`</code> | The unique code of the server. |
| `trainNumber` | <code>`TrainNumber`</code> | The national or local number of the train. |

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Train`][api-reference-train/index.ts~Train]</u>&#60;`Types` &#38; { serverCode: `ServerCode`, trainNumber: `TrainNumber` }&#62;&#62;</code>&nbsp;&nbsp;- The `Train` instance.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[index.ts:118][api-reference-index.ts]

<br/>

<br/>

<br/>

### [`class Server`][api-reference-server/index.ts~Server]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-server/index.ts~Server]: #class-server&nbsp;&nbsp;&nbsp;&uarr; "View class Server"

Specifies a multiplayer server.

See `Server.get()` for an `await`able constructor method.

**Implements**:&nbsp;&nbsp;<u>[`Data`][api-reference-server/index.ts~Data]</u>&#60;`Types`[`"serverCode"`]&#62;

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `Types` | <code><u>[`Server.Types`][api-reference-server/index.ts~Types]</u></code> | Type information about the `Server` and SDK. |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[server/index.ts:34][api-reference-server/index.ts]

<br/>
<br/>

#### [`new Server.constructor(config, callback)`][api-reference-server/index.ts~Server.constructor0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-server/index.ts~Server.constructor0]: #new-serverconstructorconfig-callback&nbsp;&nbsp;&nbsp;&uarr; "View new Server.constructor()"

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><u>[`Types`][api-reference-server/index.ts~Types]</u>&#60;`string` &#124; `string` &#124; `Types`&#62;</code> |

| Arguments: | *Type* |
| ---------- | ------ |
| `config` | <code><u>[`Config`][api-reference-server/index.ts~Config]</u>&#60;`Types`&#62;</code> |
| `callback` | <code><u>[`Callback`][api-reference-server/index.ts~Callback]</u>&#60;`Types`&#62;</code> |

**Returns**:&nbsp;&nbsp;<code><u>[`Server`][api-reference-server/index.ts~Server]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[server/index.ts:66][api-reference-server/index.ts]

<br/>

<br/>

#### [`property Server.code`][api-reference-server/index.ts~Server.code]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-server/index.ts~Server.code]: #property-servercode&nbsp;&nbsp;&nbsp;&uarr; "View property Server.code"

<kbd>read-only</kbd>

Specifies the unique code of the server.

**Type**:&nbsp;&nbsp;<code>`Types`[`"serverCode"`]</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[server/index.ts:37][api-reference-server/index.ts]

<br/>

<br/>

#### [`property Server.id`][api-reference-server/index.ts~Server.id]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-server/index.ts~Server.id]: #property-serverid&nbsp;&nbsp;&nbsp;&uarr; "View property Server.id"

<kbd>read-only</kbd>

Specifies the unique ID of the server.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[server/index.ts:40][api-reference-server/index.ts]

<br/>

<br/>

#### [`property Server.name`][api-reference-server/index.ts~Server.name]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-server/index.ts~Server.name]: #property-servername&nbsp;&nbsp;&nbsp;&uarr; "View property Server.name"

<kbd>read-only</kbd>

Specifies the name of the server.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[server/index.ts:43][api-reference-server/index.ts]

<br/>

<br/>

#### [`property Server.region`][api-reference-server/index.ts~Server.region]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-server/index.ts~Server.region]: #property-serverregion&nbsp;&nbsp;&nbsp;&uarr; "View property Server.region"

<kbd>read-only</kbd>

Specifies the region the server is located.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[server/index.ts:46][api-reference-server/index.ts]

<br/>

<br/>

#### [`property Server.sdk`][api-reference-server/index.ts~Server.sdk]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-server/index.ts~Server.sdk]: #property-serversdk&nbsp;&nbsp;&nbsp;&uarr; "View property Server.sdk"

<kbd>read-only</kbd>

Specifies a reference to the `Sdk` class instance.

**Type**:&nbsp;&nbsp;<code><u>[`Sdk`][api-reference-index.ts~Sdk]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[server/index.ts:49][api-reference-server/index.ts]

<br/>

<br/>

#### [`property Server.data`][api-reference-server/index.ts~Server.data]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-server/index.ts~Server.data]: #property-serverdata&nbsp;&nbsp;&nbsp;&uarr; "View property Server.data"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[server/index.ts:56][api-reference-server/index.ts]

<br/>

<br/>

#### [`property Server.isActive`][api-reference-server/index.ts~Server.isActive]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-server/index.ts~Server.isActive]: #property-serverisactive&nbsp;&nbsp;&nbsp;&uarr; "View property Server.isActive"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[server/index.ts:62][api-reference-server/index.ts]

<br/>

<br/>

#### [`method Server.activeTrainNumbers()`][api-reference-server/index.ts~Server.activeTrainNumbers0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-server/index.ts~Server.activeTrainNumbers0]: #method-serveractivetrainnumbers&nbsp;&nbsp;&nbsp;&uarr; "View method Server.activeTrainNumbers()"

Method to retrieve a list of numbers of trains that are active.

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;`Types`[`"trainNumbers"`][]&#62;</code>&nbsp;&nbsp;- The list of train numbers.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[server/index.ts:78][api-reference-server/index.ts]

<br/>

<br/>

#### [`method Server.station(stationCode)`][api-reference-server/index.ts~Server.station0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-server/index.ts~Server.station0]: #method-serverstationstationcode&nbsp;&nbsp;&nbsp;&uarr; "View method Server.station()"

Method to retrieve a `Station` instance related to this server.

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `StationCode` | <code>`string`</code> | The unique code of the station. |

| Arguments: | *Type* | *Description* |
| ---------- | ------ | ------------- |
| `stationCode` | <code>`StationCode`</code> | The unique code of the station. |

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Station`][api-reference-station/index.ts~Station]</u>&#60;`Types` &#38; { stationCode: `StationCode` }&#62;&#62;</code>&nbsp;&nbsp;- The `Station` instance.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[server/index.ts:93][api-reference-server/index.ts]

<br/>

<br/>

#### [`method Server.stations()`][api-reference-server/index.ts~Server.stations0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-server/index.ts~Server.stations0]: #method-serverstations&nbsp;&nbsp;&nbsp;&uarr; "View method Server.stations()"

Method to retrieve a map of `Station` instances related to this server.

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Map`][api-reference-station/index.ts~Map]</u>&#60;`Types`&#62;&#62;</code>&nbsp;&nbsp;- The map of `Station` instances.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[server/index.ts:111][api-reference-server/index.ts]

<br/>

<br/>

#### [`method Server.toJson()`][api-reference-server/index.ts~Server.toJson0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-server/index.ts~Server.toJson0]: #method-servertojson&nbsp;&nbsp;&nbsp;&uarr; "View method Server.toJson()"

Method to return `Server.data` as a JSON string.

**Returns**:&nbsp;&nbsp;<code>`string`</code>&nbsp;&nbsp;- The JSON string.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[server/index.ts:131][api-reference-server/index.ts]

<br/>

<br/>

#### [`method Server.train(number)`][api-reference-server/index.ts~Server.train0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-server/index.ts~Server.train0]: #method-servertrainnumber&nbsp;&nbsp;&nbsp;&uarr; "View method Server.train()"

Method to retrieve a `Train` instance related to this server.

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `TrainNumber` | <code>`string`</code> | The national or local number of the train. |

| Arguments: | *Type* | *Description* |
| ---------- | ------ | ------------- |
| `number` | <code>`TrainNumber`</code> | The national or local number of the train. |

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Train`][api-reference-train/index.ts~Train]</u>&#60;`Types` &#38; { trainNumber: `TrainNumber` }&#62;&#62;</code>&nbsp;&nbsp;- The `Train` instance.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[server/index.ts:143][api-reference-server/index.ts]

<br/>

<br/>

#### [`method Server.update()`][api-reference-server/index.ts~Server.update0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-server/index.ts~Server.update0]: #method-serverupdate&nbsp;&nbsp;&nbsp;&uarr; "View method Server.update()"

Method to update the data of this server with live data from the API.

Check interface `Server.LiveData` to see which properties are updated.

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Server`][api-reference-server/index.ts~Server]</u>&#60;`Types`&#62;&#62;</code>&nbsp;&nbsp;- This `Server` instance.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[server/index.ts:154][api-reference-server/index.ts]

<br/>

<br/>

<br/>

### [`class Station`][api-reference-station/index.ts~Station]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station]: #class-station&nbsp;&nbsp;&nbsp;&uarr; "View class Station"

Specifies a dispatch station.

**Implements**:&nbsp;&nbsp;<u>[`Data`][api-reference-station/index.ts~Data]</u>&#60;`Types`[`"stationCode"`]&#62;

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `Types` | <code><u>[`Station.Types`][api-reference-station/index.ts~Types]</u></code> | Type information about the `Station` and SDK. |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:32][api-reference-station/index.ts]

<br/>
<br/>

#### [`new Station.constructor(config, callback)`][api-reference-station/index.ts~Station.constructor0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.constructor0]: #new-stationconstructorconfig-callback&nbsp;&nbsp;&nbsp;&uarr; "View new Station.constructor()"

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><u>[`Types`][api-reference-station/index.ts~Types]</u>&#60;`string` &#124; `string` &#124; `string` &#124; `string` &#124; `Types`&#62;</code> |

| Arguments: | *Type* |
| ---------- | ------ |
| `config` | <code><u>[`Config`][api-reference-station/index.ts~Config]</u>&#60;`Types`&#62;</code> |
| `callback` | <code><u>[`Callback`][api-reference-station/index.ts~Callback]</u>&#60;`Types`&#62;</code> |

**Returns**:&nbsp;&nbsp;<code><u>[`Station`][api-reference-station/index.ts~Station]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:87][api-reference-station/index.ts]

<br/>

<br/>

#### [`property Station.code`][api-reference-station/index.ts~Station.code]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.code]: #property-stationcode&nbsp;&nbsp;&nbsp;&uarr; "View property Station.code"

<kbd>read-only</kbd>

Specifies the unique code of the station.

**Type**:&nbsp;&nbsp;<code>`Types`[`"stationCode"`]</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:35][api-reference-station/index.ts]

<br/>

<br/>

#### [`property Station.difficultyLevel`][api-reference-station/index.ts~Station.difficultyLevel]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.difficultyLevel]: #property-stationdifficultylevel&nbsp;&nbsp;&nbsp;&uarr; "View property Station.difficultyLevel"

<kbd>read-only</kbd>

Specifies the difficulty level for controlling this station.

**Type**:&nbsp;&nbsp;<code><u>[`DifficultyLevel`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~DifficultyLevel]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:38][api-reference-station/index.ts]

<br/>

<br/>

#### [`property Station.id`][api-reference-station/index.ts~Station.id]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.id]: #property-stationid&nbsp;&nbsp;&nbsp;&uarr; "View property Station.id"

<kbd>read-only</kbd>

Specifies the unique ID of this station.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:41][api-reference-station/index.ts]

<br/>

<br/>

#### [`property Station.images`][api-reference-station/index.ts~Station.images]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.images]: #property-stationimages&nbsp;&nbsp;&nbsp;&uarr; "View property Station.images"

<kbd>read-only</kbd>

Specifies images for this station.

**Type**:&nbsp;&nbsp;<code><u>[`Images`][api-reference-station/index.ts~Images]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:44][api-reference-station/index.ts]

<br/>

<br/>

#### [`property Station.latitude`][api-reference-station/index.ts~Station.latitude]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.latitude]: #property-stationlatitude&nbsp;&nbsp;&nbsp;&uarr; "View property Station.latitude"

<kbd>read-only</kbd>

Specifies the latitude of this station.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:47][api-reference-station/index.ts]

<br/>

<br/>

#### [`property Station.longitude`][api-reference-station/index.ts~Station.longitude]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.longitude]: #property-stationlongitude&nbsp;&nbsp;&nbsp;&uarr; "View property Station.longitude"

<kbd>read-only</kbd>

Specifies the longitude of this station.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:50][api-reference-station/index.ts]

<br/>

<br/>

#### [`property Station.name`][api-reference-station/index.ts~Station.name]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.name]: #property-stationname&nbsp;&nbsp;&nbsp;&uarr; "View property Station.name"

<kbd>read-only</kbd>

Specifies the name of this station.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:53][api-reference-station/index.ts]

<br/>

<br/>

#### [`property Station.prefix`][api-reference-station/index.ts~Station.prefix]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.prefix]: #property-stationprefix&nbsp;&nbsp;&nbsp;&uarr; "View property Station.prefix"

<kbd>read-only</kbd>

Specifies the prefix (localized code) of the station.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:56][api-reference-station/index.ts]

<br/>

<br/>

#### [`property Station.sdk`][api-reference-station/index.ts~Station.sdk]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.sdk]: #property-stationsdk&nbsp;&nbsp;&nbsp;&uarr; "View property Station.sdk"

<kbd>read-only</kbd>

Specifies a reference to the `Sdk` class instance.

**Type**:&nbsp;&nbsp;<code><u>[`Sdk`][api-reference-index.ts~Sdk]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:59][api-reference-station/index.ts]

<br/>

<br/>

#### [`property Station.serverCode`][api-reference-station/index.ts~Station.serverCode]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.serverCode]: #property-stationservercode&nbsp;&nbsp;&nbsp;&uarr; "View property Station.serverCode"

<kbd>read-only</kbd>

Specifies the unique code of the related server.

**Type**:&nbsp;&nbsp;<code>`Types`[`"serverCode"`]</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:62][api-reference-station/index.ts]

<br/>

<br/>

#### [`property Station.data`][api-reference-station/index.ts~Station.data]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.data]: #property-stationdata&nbsp;&nbsp;&nbsp;&uarr; "View property Station.data"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:72][api-reference-station/index.ts]

<br/>

<br/>

#### [`property Station.dispatchers`][api-reference-station/index.ts~Station.dispatchers]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.dispatchers]: #property-stationdispatchers&nbsp;&nbsp;&nbsp;&uarr; "View property Station.dispatchers"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:67][api-reference-station/index.ts]

<br/>

<br/>

#### [`method Station.server()`][api-reference-station/index.ts~Station.server0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.server0]: #method-stationserver&nbsp;&nbsp;&nbsp;&uarr; "View method Station.server()"

Method to retrieve the `Server` related to this dispatch station.

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Server`][api-reference-server/index.ts~Server]</u>&#60;`Types`&#62;&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:96][api-reference-station/index.ts]

<br/>

<br/>

#### [`method Station.switchServer(serverCode)`][api-reference-station/index.ts~Station.switchServer0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.switchServer0]: #method-stationswitchserverservercode&nbsp;&nbsp;&nbsp;&uarr; "View method Station.switchServer()"

Method to retrieve the same dispatch station but related to another `Server` instance.

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `ServerCode` | <code>`string`</code> | The unique code of the server. |

| Arguments: | *Type* | *Description* |
| ---------- | ------ | ------------- |
| `serverCode` | <code>`ServerCode`</code> | The unique code of the server. |

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Station`][api-reference-station/index.ts~Station]</u>&#60;<abbr title='Declared in package "typescript"'>`Omit`</abbr>&#60;`Types` &#124; `"serverCode"`&#62; &#38; { serverCode: `ServerCode` }&#62;&#62;</code>&nbsp;&nbsp;- The **new** `Station` instance.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:108][api-reference-station/index.ts]

<br/>

<br/>

#### [`method Station.toJson()`][api-reference-station/index.ts~Station.toJson0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.toJson0]: #method-stationtojson&nbsp;&nbsp;&nbsp;&uarr; "View method Station.toJson()"

Method to return `Station.data` as a JSON string.

**Returns**:&nbsp;&nbsp;<code>`string`</code>&nbsp;&nbsp;- The JSON string.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:117][api-reference-station/index.ts]

<br/>

<br/>

#### [`method Station.update()`][api-reference-station/index.ts~Station.update0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Station.update0]: #method-stationupdate&nbsp;&nbsp;&nbsp;&uarr; "View method Station.update()"

Method to update the data of this station with live data from the API.

Check interface `Station.LiveData` to see which properties are updated.

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Station`][api-reference-station/index.ts~Station]</u>&#60;`Types`&#62;&#62;</code>&nbsp;&nbsp;- This `Station` instance.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:128][api-reference-station/index.ts]

<br/>

<br/>

<br/>

### [`class Timetable`][api-reference-train/timetable/index.ts~Timetable]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Timetable]: #class-timetable&nbsp;&nbsp;&nbsp;&uarr; "View class Timetable"

Specifies a timetable of a train.

See `Timetable.get()` for an `await`able constructor method.

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `Types` | <code><u>[`Timetable.Types`][api-reference-train/index.ts~Types]</u></code> | Type information about the `Timetable` and SDK. |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:37][api-reference-train/timetable/index.ts]

<br/>
<br/>

#### [`new Timetable.constructor(config, callback)`][api-reference-train/timetable/index.ts~Timetable.constructor0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Timetable.constructor0]: #new-timetableconstructorconfig-callback&nbsp;&nbsp;&nbsp;&uarr; "View new Timetable.constructor()"

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><u>[`Types`][api-reference-train/index.ts~Types]</u>&#60;`string` &#124; `string` &#124; `string` &#124; `string` &#124; `Types`&#62;</code> |

| Arguments: | *Type* |
| ---------- | ------ |
| `config` | <code><u>[`Config`][api-reference-train/timetable/index.ts~Config]</u>&#60;`Types`&#62;</code> |
| `callback` | <code><u>[`Callback`][api-reference-train/timetable/index.ts~Callback]</u>&#60;`Types`&#62;</code> |

**Returns**:&nbsp;&nbsp;<code><u>[`Timetable`][api-reference-train/timetable/index.ts~Timetable]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:107][api-reference-train/timetable/index.ts]

<br/>

<br/>

#### [`property Timetable.events`][api-reference-train/timetable/index.ts~Timetable.events]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Timetable.events]: #property-timetableevents&nbsp;&nbsp;&nbsp;&uarr; "View property Timetable.events"

<kbd>read-only</kbd>

Specifies a timetable event emitter.

**NOTE**: Timetable events will only be fired when `Timetable.train.liveData.update()` is executed
  either manually or by setting `LiveData.autoUpdate` to `true`.

**Type**:&nbsp;&nbsp;<code><u>[`Emitter`][api-reference-train/timetable/index.ts~Emitter]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:45][api-reference-train/timetable/index.ts]

<br/>

<br/>

#### [`property Timetable.sdk`][api-reference-train/timetable/index.ts~Timetable.sdk]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Timetable.sdk]: #property-timetablesdk&nbsp;&nbsp;&nbsp;&uarr; "View property Timetable.sdk"

<kbd>read-only</kbd>

Specifies a reference to the `Sdk` class instance.

**Type**:&nbsp;&nbsp;<code><u>[`Sdk`][api-reference-index.ts~Sdk]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:48][api-reference-train/timetable/index.ts]

<br/>

<br/>

#### [`property Timetable.train`][api-reference-train/timetable/index.ts~Timetable.train]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Timetable.train]: #property-timetabletrain&nbsp;&nbsp;&nbsp;&uarr; "View property Timetable.train"

<kbd>read-only</kbd>

Specifies a reference to the `Train` this timetable belongs to.

**Type**:&nbsp;&nbsp;<code><u>[`Train`][api-reference-train/index.ts~Train]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:51][api-reference-train/timetable/index.ts]

<br/>

<br/>

#### [`property Timetable.current`][api-reference-train/timetable/index.ts~Timetable.current]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Timetable.current]: #property-timetablecurrent&nbsp;&nbsp;&nbsp;&uarr; "View property Timetable.current"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:60][api-reference-train/timetable/index.ts]

<br/>

<br/>

#### [`property Timetable.currentIndex`][api-reference-train/timetable/index.ts~Timetable.currentIndex]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Timetable.currentIndex]: #property-timetablecurrentindex&nbsp;&nbsp;&nbsp;&uarr; "View property Timetable.currentIndex"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:74][api-reference-train/timetable/index.ts]

<br/>

<br/>

#### [`property Timetable.entries`][api-reference-train/timetable/index.ts~Timetable.entries]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Timetable.entries]: #property-timetableentries&nbsp;&nbsp;&nbsp;&uarr; "View property Timetable.entries"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:68][api-reference-train/timetable/index.ts]

<br/>

<br/>

#### [`property Timetable.history`][api-reference-train/timetable/index.ts~Timetable.history]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Timetable.history]: #property-timetablehistory&nbsp;&nbsp;&nbsp;&uarr; "View property Timetable.history"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:80][api-reference-train/timetable/index.ts]

<br/>

<br/>

#### [`property Timetable.size`][api-reference-train/timetable/index.ts~Timetable.size]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Timetable.size]: #property-timetablesize&nbsp;&nbsp;&nbsp;&uarr; "View property Timetable.size"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:91][api-reference-train/timetable/index.ts]

<br/>

<br/>

#### [`property Timetable.upcoming`][api-reference-train/timetable/index.ts~Timetable.upcoming]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Timetable.upcoming]: #property-timetableupcoming&nbsp;&nbsp;&nbsp;&uarr; "View property Timetable.upcoming"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:97][api-reference-train/timetable/index.ts]

<br/>

<br/>

#### [`method Timetable.destroy()`][api-reference-train/timetable/index.ts~Timetable.destroy0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Timetable.destroy0]: #method-timetabledestroy&nbsp;&nbsp;&nbsp;&uarr; "View method Timetable.destroy()"

Method to destroy this `Timetable` instance.

**NOTE**: Calling this method is **not** required. Only use this when really needed.

**Returns**:&nbsp;&nbsp;<code>`void`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:128][api-reference-train/timetable/index.ts]

<br/>

<br/>

#### [`method Timetable.entry(index)`][api-reference-train/timetable/index.ts~Timetable.entry0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Timetable.entry0]: #method-timetableentryindex&nbsp;&nbsp;&nbsp;&uarr; "View method Timetable.entry()"

Method to return a timetable entry at a specified index.

| Arguments: | *Type* | *Description* |
| ---------- | ------ | ------------- |
| `index` | <code>`number`</code> | The index of the entry. |

**Returns**:&nbsp;&nbsp;<code><u>[`Entry`][api-reference-train/timetable/entry/index.ts~Entry]</u>&#60;`Types` &#124; <u>[`Type`][api-reference-train/timetable/entry/index.ts~Type]</u>&#62;</code>&nbsp;&nbsp;- The timetable entry.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:140][api-reference-train/timetable/index.ts]

<br/>

<br/>

#### [`method Timetable.update()`][api-reference-train/timetable/index.ts~Timetable.update0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Timetable.update0]: #method-timetableupdate&nbsp;&nbsp;&nbsp;&uarr; "View method Timetable.update()"

Method to update the data of this train timetable with data from the API.

**NOTE**: *Currently*, this will replace `Timetable.entries` with new class instances.

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Timetable`][api-reference-train/timetable/index.ts~Timetable]</u>&#60;`Types`&#62;&#62;</code>&nbsp;&nbsp;- This `Timetable` instance.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:154][api-reference-train/timetable/index.ts]

<br/>

<br/>

<br/>

### [`class Train`][api-reference-train/index.ts~Train]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train]: #class-train&nbsp;&nbsp;&nbsp;&uarr; "View class Train"

Specifies a train.

See `Train.get()` for an `await`able constructor method.

**Implements**:&nbsp;&nbsp;<u>[`Data`][api-reference-train/index.ts~Data]</u>&#60;`Types`[`"trainNumber"`] &#124; `Types`[`"serverCode"`]&#62;

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `Types` | <code><u>[`Train.Types`][api-reference-train/index.ts~Types]</u></code> | Type information about the `Train` and SDK. |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:37][api-reference-train/index.ts]

<br/>
<br/>

#### [`new Train.constructor(config, callback)`][api-reference-train/index.ts~Train.constructor0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.constructor0]: #new-trainconstructorconfig-callback&nbsp;&nbsp;&nbsp;&uarr; "View new Train.constructor()"

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><u>[`Types`][api-reference-train/index.ts~Types]</u>&#60;`string` &#124; `string` &#124; `string` &#124; `string` &#124; `Types`&#62;</code> |

| Arguments: | *Type* |
| ---------- | ------ |
| `config` | <code><u>[`Config`][api-reference-train/index.ts~Config]</u>&#60;`Types`&#62;</code> |
| `callback` | <code><u>[`Callback`][api-reference-train/index.ts~Callback]</u>&#60;`Types`&#62;</code> |

**Returns**:&nbsp;&nbsp;<code><u>[`Train`][api-reference-train/index.ts~Train]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:121][api-reference-train/index.ts]

<br/>

<br/>

#### [`property Train.continuesAs`][api-reference-train/index.ts~Train.continuesAs]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.continuesAs]: #property-traincontinuesas&nbsp;&nbsp;&nbsp;&uarr; "View property Train.continuesAs"

<kbd>read-only</kbd> <kbd>optional</kbd>

Specifies under which train number the train will continue.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:40][api-reference-train/index.ts]

<br/>

<br/>

#### [`property Train.destination`][api-reference-train/index.ts~Train.destination]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.destination]: #property-traindestination&nbsp;&nbsp;&nbsp;&uarr; "View property Train.destination"

<kbd>read-only</kbd>

Specifies the destination of the train.

**Type**:&nbsp;&nbsp;<code><u>[`Destination`][api-reference-train/index.ts~Destination]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:43][api-reference-train/index.ts]

<br/>

<br/>

#### [`property Train.id`][api-reference-train/index.ts~Train.id]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.id]: #property-trainid&nbsp;&nbsp;&nbsp;&uarr; "View property Train.id"

<kbd>read-only</kbd>

Specifies the unique ID of the train.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:46][api-reference-train/index.ts]

<br/>

<br/>

#### [`property Train.intNumber`][api-reference-train/index.ts~Train.intNumber]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.intNumber]: #property-trainintnumber&nbsp;&nbsp;&nbsp;&uarr; "View property Train.intNumber"

<kbd>read-only</kbd> <kbd>optional</kbd>

Specifies the international train number of this train.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:49][api-reference-train/index.ts]

<br/>

<br/>

#### [`property Train.length`][api-reference-train/index.ts~Train.length]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.length]: #property-trainlength&nbsp;&nbsp;&nbsp;&uarr; "View property Train.length"

<kbd>read-only</kbd>

Specifies the length of the train in meters.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:52][api-reference-train/index.ts]

<br/>

<br/>

#### [`property Train.locoType`][api-reference-train/index.ts~Train.locoType]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.locoType]: #property-trainlocotype&nbsp;&nbsp;&nbsp;&uarr; "View property Train.locoType"

<kbd>read-only</kbd>

Specifies the name of the train's locomotive.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:55][api-reference-train/index.ts]

<br/>

<br/>

#### [`property Train.name`][api-reference-train/index.ts~Train.name]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.name]: #property-trainname&nbsp;&nbsp;&nbsp;&uarr; "View property Train.name"

<kbd>read-only</kbd>

Specifies the name of the train or train series.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:58][api-reference-train/index.ts]

<br/>

<br/>

#### [`property Train.number`][api-reference-train/index.ts~Train.number]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.number]: #property-trainnumber&nbsp;&nbsp;&nbsp;&uarr; "View property Train.number"

<kbd>read-only</kbd>

Specifies the national train number of this train.

**Type**:&nbsp;&nbsp;<code>`Types`[`"trainNumber"`]</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:61][api-reference-train/index.ts]

<br/>

<br/>

#### [`property Train.origin`][api-reference-train/index.ts~Train.origin]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.origin]: #property-trainorigin&nbsp;&nbsp;&nbsp;&uarr; "View property Train.origin"

<kbd>read-only</kbd>

Specifies the origin of the train.

**Type**:&nbsp;&nbsp;<code><u>[`Origin`][api-reference-train/index.ts~Origin]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:64][api-reference-train/index.ts]

<br/>

<br/>

#### [`property Train.sdk`][api-reference-train/index.ts~Train.sdk]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.sdk]: #property-trainsdk&nbsp;&nbsp;&nbsp;&uarr; "View property Train.sdk"

<kbd>read-only</kbd>

Specifies a reference to the `Sdk` class instance.

**Type**:&nbsp;&nbsp;<code><u>[`Sdk`][api-reference-index.ts~Sdk]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:67][api-reference-train/index.ts]

<br/>

<br/>

#### [`property Train.serverCode`][api-reference-train/index.ts~Train.serverCode]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.serverCode]: #property-trainservercode&nbsp;&nbsp;&nbsp;&uarr; "View property Train.serverCode"

<kbd>read-only</kbd>

Specifies the unique code of the related server.

**Type**:&nbsp;&nbsp;<code>`Types`[`"serverCode"`]</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:70][api-reference-train/index.ts]

<br/>

<br/>

#### [`property Train.weight`][api-reference-train/index.ts~Train.weight]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.weight]: #property-trainweight&nbsp;&nbsp;&nbsp;&uarr; "View property Train.weight"

<kbd>read-only</kbd>

Specifies the weight of this train in metric tonnes.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:73][api-reference-train/index.ts]

<br/>

<br/>

#### [`property Train.data`][api-reference-train/index.ts~Train.data]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.data]: #property-traindata&nbsp;&nbsp;&nbsp;&uarr; "View property Train.data"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:84][api-reference-train/index.ts]

<br/>

<br/>

#### [`property Train.liveData`][api-reference-train/index.ts~Train.liveData]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.liveData]: #property-trainlivedata&nbsp;&nbsp;&nbsp;&uarr; "View property Train.liveData"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:104][api-reference-train/index.ts]

<br/>

<br/>

#### [`property Train.timetable`][api-reference-train/index.ts~Train.timetable]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.timetable]: #property-traintimetable&nbsp;&nbsp;&nbsp;&uarr; "View property Train.timetable"

<kbd>read-only</kbd>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:113][api-reference-train/index.ts]

<br/>

<br/>

#### [`method Train.destroy()`][api-reference-train/index.ts~Train.destroy0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.destroy0]: #method-traindestroy&nbsp;&nbsp;&nbsp;&uarr; "View method Train.destroy()"

Method to destroy this `Train` instance.

**NOTE**: Calling this method is **not** required. Only use this when really needed.

**Returns**:&nbsp;&nbsp;<code>`void`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:135][api-reference-train/index.ts]

<br/>

<br/>

#### [`method Train.server()`][api-reference-train/index.ts~Train.server0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.server0]: #method-trainserver&nbsp;&nbsp;&nbsp;&uarr; "View method Train.server()"

Method to retrieve the `Server` related to this train.

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Server`][api-reference-server/index.ts~Server]</u>&#60;`Types`&#62;&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:143][api-reference-train/index.ts]

<br/>

<br/>

#### [`method Train.switchServer(serverCode)`][api-reference-train/index.ts~Train.switchServer0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.switchServer0]: #method-trainswitchserverservercode&nbsp;&nbsp;&nbsp;&uarr; "View method Train.switchServer()"

Method to retrieve the same train but related to another `Server` instance.

| Type params: | *Extends* |
| ------------ | --------- |
| `TargetServerCode` | <code>`string`</code> |

| Arguments: | *Type* |
| ---------- | ------ |
| `serverCode` | <code>`TargetServerCode`</code> |

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Train`][api-reference-train/index.ts~Train]</u>&#60;`Types`&#62;&#62;</code>&nbsp;&nbsp;- The **new** `Train` instance.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:154][api-reference-train/index.ts]

<br/>

<br/>

#### [`method Train.toJson()`][api-reference-train/index.ts~Train.toJson0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.toJson0]: #method-traintojson&nbsp;&nbsp;&nbsp;&uarr; "View method Train.toJson()"

Method to return `Train.data` as a JSON string.

**Returns**:&nbsp;&nbsp;<code>`string`</code>&nbsp;&nbsp;- The JSON string.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:163][api-reference-train/index.ts]

<br/>

<br/>

#### [`method Train.update()`][api-reference-train/index.ts~Train.update0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Train.update0]: #method-trainupdate&nbsp;&nbsp;&nbsp;&uarr; "View method Train.update()"

Method to update the data of this train with live data from the API.

**NOTE**: *Currently*, this will replace `Train.liveData` and `Train.timetable` with new class instances.

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Train`][api-reference-train/index.ts~Train]</u>&#60;`Types`&#62;&#62;</code>&nbsp;&nbsp;- This `Train` instance.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:174][api-reference-train/index.ts]

<br/>

<br/>

<br/>

### [`const DEFAULT_ACTIVE_SERVER_RETENTION`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~DEFAULT_ACTIVE_SERVER_RETENTION]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~DEFAULT_ACTIVE_SERVER_RETENTION]: #const-default_active_server_retention&nbsp;&nbsp;&nbsp;&uarr; "View const DEFAULT_ACTIVE_SERVER_RETENTION"

Specifies the default retention for active server records.

**Type**:&nbsp;&nbsp;<code><u>[`Config.LiveData.Cache.ActiveServers.Retention`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Retention]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:197][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

### [`const DEFAULT_ACTIVE_STATION_RETENTION`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~DEFAULT_ACTIVE_STATION_RETENTION]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~DEFAULT_ACTIVE_STATION_RETENTION]: #const-default_active_station_retention&nbsp;&nbsp;&nbsp;&uarr; "View const DEFAULT_ACTIVE_STATION_RETENTION"

Specifies the default retention for active station records.

**Type**:&nbsp;&nbsp;<code><u>[`Config.LiveData.Cache.ActiveStations.Retention`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Retention]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:199][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

### [`const DEFAULT_ACTIVE_TRAIN_RETENTION`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~DEFAULT_ACTIVE_TRAIN_RETENTION]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~DEFAULT_ACTIVE_TRAIN_RETENTION]: #const-default_active_train_retention&nbsp;&nbsp;&nbsp;&uarr; "View const DEFAULT_ACTIVE_TRAIN_RETENTION"

Specifies the default retention for active train records.

**Type**:&nbsp;&nbsp;<code><u>[`Config.LiveData.Cache.ActiveTrains.Retention`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Retention]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:201][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

### [`const DEFAULT_TIMETABLE_RETENTION`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~DEFAULT_TIMETABLE_RETENTION]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~DEFAULT_TIMETABLE_RETENTION]: #const-default_timetable_retention&nbsp;&nbsp;&nbsp;&uarr; "View const DEFAULT_TIMETABLE_RETENTION"

Specifies the default retention for timetable records.

**Type**:&nbsp;&nbsp;<code><u>[`Config.Timetable.Cache.Retention`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Retention]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:203][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

### [`const DEFAULT_UPDATE_INTERVAL`][api-reference-train/liveData/index.ts~DEFAULT_UPDATE_INTERVAL]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~DEFAULT_UPDATE_INTERVAL]: #const-default_update_interval&nbsp;&nbsp;&nbsp;&uarr; "View const DEFAULT_UPDATE_INTERVAL"

Specifies the default update interval for train live data in milliseconds.

**Type**:&nbsp;&nbsp;<code><u>[`AutoUpdateInterval`][api-reference-train/liveData/index.ts~AutoUpdateInterval]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:385][api-reference-train/liveData/index.ts]

<br/>
<br/>

<br/>

### [`const VERSION`][api-reference-index.ts~VERSION]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-index.ts~VERSION]: #const-version&nbsp;&nbsp;&nbsp;&uarr; "View const VERSION"

Specifies the version of the SDK.

**Type**:&nbsp;&nbsp;<code><u>[`Version`][api-reference-common/index.ts~Version]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[index.ts:127][api-reference-index.ts]

<br/>
<br/>

<br/>

### [`const VMAX`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~VMAX]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~VMAX]: #const-vmax&nbsp;&nbsp;&nbsp;&uarr; "View const VMAX"

Specifies the maximum allowable operating speed. (**Vmax**)

**Type**:&nbsp;&nbsp;<code>`"vmax"`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:15][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`const VMAX_VALUE`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~VMAX_VALUE]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~VMAX_VALUE]: #const-vmax_value&nbsp;&nbsp;&nbsp;&uarr; "View const VMAX_VALUE"

Specifies the "speed" value that will indicate `"vmax"`.

**Type**:&nbsp;&nbsp;<code>`32767`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:18][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`enum Type`][api-reference-train/timetable/index.ts~Type]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Type]: #enum-type&nbsp;&nbsp;&nbsp;&uarr; "View enum Type"

Specifies a type of timetable event.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:241][api-reference-train/timetable/index.ts]

<br/>
<br/>

#### [`member Type.CurrentChanged`][api-reference-train/timetable/index.ts~Type.CurrentChanged]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Type.CurrentChanged]: #member-typecurrentchanged&nbsp;&nbsp;&nbsp;&uarr; "View member Type.CurrentChanged"

Specifies an event that fires when the value of `Timetable.current` changes.

**Type**:&nbsp;&nbsp;<code>`"currentChanged"`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:243][api-reference-train/timetable/index.ts]

<br/>

<br/>

<br/>

### [`function exception(code, message)`][api-reference-common/index.ts~exception0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-common/index.ts~exception0]: #function-exceptioncode-message&nbsp;&nbsp;&nbsp;&uarr; "View function exception()"

| Arguments: | *Type* |
| ---------- | ------ |
| `code` | <code>`string`</code> |
| `message` | <code>`string`</code> |

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Error`</abbr></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[common/index.ts:20][api-reference-common/index.ts]

<br/>
<br/>

<br/>

### [`function get(config)`][api-reference-train/timetable/index.ts~get0]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~get0]: #function-getconfig&nbsp;&nbsp;&nbsp;&uarr; "View function get()"

Method to construct a new `Timetable` class instance.

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `Types` | <code><u>[`Types`][api-reference-train/index.ts~Types]</u>&#60;`string` &#124; `string` &#124; `string` &#124; `string` &#124; `Types`&#62;</code> | Type information about the `Timetable` and SDK. |

| Arguments: | *Type* | *Description* |
| ---------- | ------ | ------------- |
| `config` | <code><u>[`Config`][api-reference-train/timetable/index.ts~Config]</u>&#60;`Types`&#62;</code> | The configuration for constructing the `Timetable` instance. |

**Returns**:&nbsp;&nbsp;<code><abbr title='Declared in package "typescript"'>`Promise`</abbr>&#60;<u>[`Timetable`][api-reference-train/timetable/index.ts~Timetable]</u>&#60;`Types`&#62;&#62;</code>&nbsp;&nbsp;- The new `Timetable` instance.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:270][api-reference-train/timetable/index.ts]

<br/>
<br/>

<br/>

### [`interface ActiveServersUpdated`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveServersUpdated]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveServersUpdated]: #interface-activeserversupdated&nbsp;&nbsp;&nbsp;&uarr; "View interface ActiveServersUpdated"

Specifies an event that fires when cached active servers updated.

**Extends**:&nbsp;&nbsp;<u>[`Base`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Base]</u>&#60;<u>[`Type.ActiveServersUpdated`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveServersUpdated]</u>&#62;

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:409][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

#### [`property ActiveServersUpdated.activeServers`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveServersUpdated.activeServers]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveServersUpdated.activeServers]: #property-activeserversupdatedactiveservers&nbsp;&nbsp;&nbsp;&uarr; "View property ActiveServersUpdated.activeServers"

**Type**:&nbsp;&nbsp;<code><u>[`List`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~List]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:410][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>

<br/>

<br/>

### [`interface ActiveStationsUpdated`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveStationsUpdated]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveStationsUpdated]: #interface-activestationsupdated&nbsp;&nbsp;&nbsp;&uarr; "View interface ActiveStationsUpdated"

Specifies an event that fires when cached active dispatch stations updated.

**Extends**:&nbsp;&nbsp;<u>[`Base`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Base]</u>&#60;<u>[`Type.ActiveStationsUpdated`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveStationsUpdated]</u>&#62;

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:414][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

#### [`property ActiveStationsUpdated.activeStations`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveStationsUpdated.activeStations]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveStationsUpdated.activeStations]: #property-activestationsupdatedactivestations&nbsp;&nbsp;&nbsp;&uarr; "View property ActiveStationsUpdated.activeStations"

**Type**:&nbsp;&nbsp;<code><u>[`List`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~List]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:415][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>

<br/>

<br/>

### [`interface ActiveTrainsUpdated`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveTrainsUpdated]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveTrainsUpdated]: #interface-activetrainsupdated&nbsp;&nbsp;&nbsp;&uarr; "View interface ActiveTrainsUpdated"

Specifies an event that fires when cached active trains updated.

**Extends**:&nbsp;&nbsp;<u>[`Base`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Base]</u>&#60;<u>[`Type.ActiveTrainsUpdated`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveTrainsUpdated]</u>&#62;

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:419][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

#### [`property ActiveTrainsUpdated.activeTrains`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveTrainsUpdated.activeTrains]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveTrainsUpdated.activeTrains]: #property-activetrainsupdatedactivetrains&nbsp;&nbsp;&nbsp;&uarr; "View property ActiveTrainsUpdated.activeTrains"

**Type**:&nbsp;&nbsp;<code><u>[`List`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~List]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:420][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>

<br/>

<br/>

### [`interface AutoUpdateChanged`][api-reference-train/liveData/index.ts~AutoUpdateChanged]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~AutoUpdateChanged]: #interface-autoupdatechanged&nbsp;&nbsp;&nbsp;&uarr; "View interface AutoUpdateChanged"

Specifies an event that fires when the value of `LiveData.autoUpdate` changes.

**Extends**:&nbsp;&nbsp;<u>[`Base`][api-reference-train/liveData/index.ts~Base]</u>&#60;`Types` &#124; <u>[`Type.AutoUpdateChanged`][api-reference-train/liveData/index.ts~AutoUpdateChanged]</u>&#62;

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><u>[`Train.Types`][api-reference-train/index.ts~Types]</u></code> |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:526][api-reference-train/liveData/index.ts]

<br/>
<br/>

#### [`property AutoUpdateChanged.autoUpdate`][api-reference-train/liveData/index.ts~AutoUpdateChanged.autoUpdate]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~AutoUpdateChanged.autoUpdate]: #property-autoupdatechangedautoupdate&nbsp;&nbsp;&nbsp;&uarr; "View property AutoUpdateChanged.autoUpdate"

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:527][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property AutoUpdateChanged.autoUpdateInterval`][api-reference-train/liveData/index.ts~AutoUpdateChanged.autoUpdateInterval]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~AutoUpdateChanged.autoUpdateInterval]: #property-autoupdatechangedautoupdateinterval&nbsp;&nbsp;&nbsp;&uarr; "View property AutoUpdateChanged.autoUpdateInterval"

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:528][api-reference-train/liveData/index.ts]

<br/>

<br/>

<br/>

### [`interface AutoUpdateIntervalChanged`][api-reference-train/liveData/index.ts~AutoUpdateIntervalChanged]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~AutoUpdateIntervalChanged]: #interface-autoupdateintervalchanged&nbsp;&nbsp;&nbsp;&uarr; "View interface AutoUpdateIntervalChanged"

Specifies an event that fires when the value of `LiveData.autoUpdateInterval` changes.

**Extends**:&nbsp;&nbsp;<u>[`Base`][api-reference-train/liveData/index.ts~Base]</u>&#60;`Types` &#124; <u>[`Type.AutoUpdateIntervalChanged`][api-reference-train/liveData/index.ts~AutoUpdateIntervalChanged]</u>&#62;

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><u>[`Train.Types`][api-reference-train/index.ts~Types]</u></code> |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:532][api-reference-train/liveData/index.ts]

<br/>
<br/>

#### [`property AutoUpdateIntervalChanged.autoUpdate`][api-reference-train/liveData/index.ts~AutoUpdateIntervalChanged.autoUpdate]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~AutoUpdateIntervalChanged.autoUpdate]: #property-autoupdateintervalchangedautoupdate&nbsp;&nbsp;&nbsp;&uarr; "View property AutoUpdateIntervalChanged.autoUpdate"

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:533][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property AutoUpdateIntervalChanged.autoUpdateInterval`][api-reference-train/liveData/index.ts~AutoUpdateIntervalChanged.autoUpdateInterval]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~AutoUpdateIntervalChanged.autoUpdateInterval]: #property-autoupdateintervalchangedautoupdateinterval&nbsp;&nbsp;&nbsp;&uarr; "View property AutoUpdateIntervalChanged.autoUpdateInterval"

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:534][api-reference-train/liveData/index.ts]

<br/>

<br/>

<br/>

### [`interface AvailableChanged`][api-reference-train/liveData/index.ts~AvailableChanged]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~AvailableChanged]: #interface-availablechanged&nbsp;&nbsp;&nbsp;&uarr; "View interface AvailableChanged"

Specifies an event that fires when the value of `LiveData.available` changes.

**Extends**:&nbsp;&nbsp;<u>[`Base`][api-reference-train/liveData/index.ts~Base]</u>&#60;`Types` &#124; <u>[`Type.AvailableChanged`][api-reference-train/liveData/index.ts~AvailableChanged]</u>&#62;

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><u>[`Train.Types`][api-reference-train/index.ts~Types]</u></code> |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:538][api-reference-train/liveData/index.ts]

<br/>
<br/>

#### [`property AvailableChanged.available`][api-reference-train/liveData/index.ts~AvailableChanged.available]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~AvailableChanged.available]: #property-availablechangedavailable&nbsp;&nbsp;&nbsp;&uarr; "View property AvailableChanged.available"

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:539][api-reference-train/liveData/index.ts]

<br/>

<br/>

<br/>

### [`interface Base`][api-reference-train/timetable/index.ts~Base]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Base]: #interface-base&nbsp;&nbsp;&nbsp;&uarr; "View interface Base"

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><u>[`Train.Types`][api-reference-train/index.ts~Types]</u></code> |
| `EventType` | <code><u>[`Type`][api-reference-train/timetable/index.ts~Type]</u></code> |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:245][api-reference-train/timetable/index.ts]

<br/>
<br/>

#### [`property Base.timetable`][api-reference-train/timetable/index.ts~Base.timetable]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Base.timetable]: #property-basetimetable&nbsp;&nbsp;&nbsp;&uarr; "View property Base.timetable"

Specifies a reference to the related `Timetable` instance.

**Type**:&nbsp;&nbsp;<code><u>[`Timetable`][api-reference-train/timetable/index.ts~Timetable]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:247][api-reference-train/timetable/index.ts]

<br/>

<br/>

#### [`property Base.type`][api-reference-train/timetable/index.ts~Base.type]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Base.type]: #property-basetype&nbsp;&nbsp;&nbsp;&uarr; "View property Base.type"

Specifies the type of timetable event.

**Type**:&nbsp;&nbsp;<code>`EventType`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:249][api-reference-train/timetable/index.ts]

<br/>

<br/>

<br/>

### [`interface Bot`][api-reference-train/liveData/index.ts~Bot]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~Bot]: #interface-bot&nbsp;&nbsp;&nbsp;&uarr; "View interface Bot"

Specifies a train driver.

**Extends**:&nbsp;&nbsp;`Base`&#60;<u>[`Type.Bot`][api-reference-train/liveData/index.ts~Bot]</u>&#62;

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:472][api-reference-train/liveData/index.ts]

<br/>
<br/>

<br/>

### [`interface Cache`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Cache]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Cache]: #interface-cache&nbsp;&nbsp;&nbsp;&uarr; "View interface Cache"

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:237][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

#### [`property Cache.activeServers`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Cache.activeServers]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Cache.activeServers]: #property-cacheactiveservers&nbsp;&nbsp;&nbsp;&uarr; "View property Cache.activeServers"

<kbd>read-only</kbd> <kbd>optional</kbd>

**Type**:&nbsp;&nbsp;<code><u>[`ActiveServers`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveServers]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:238][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>

<br/>

#### [`property Cache.activeStations`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Cache.activeStations]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Cache.activeStations]: #property-cacheactivestations&nbsp;&nbsp;&nbsp;&uarr; "View property Cache.activeStations"

<kbd>read-only</kbd> <kbd>optional</kbd>

**Type**:&nbsp;&nbsp;<code><u>[`ActiveStations`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveStations]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:239][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>

<br/>

#### [`property Cache.activeTrains`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Cache.activeTrains]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Cache.activeTrains]: #property-cacheactivetrains&nbsp;&nbsp;&nbsp;&uarr; "View property Cache.activeTrains"

<kbd>read-only</kbd> <kbd>optional</kbd>

**Type**:&nbsp;&nbsp;<code><u>[`ActiveTrains`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveTrains]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:240][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>

<br/>

<br/>

### [`interface Config`][api-reference-train/timetable/index.ts~Config]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Config]: #interface-config&nbsp;&nbsp;&nbsp;&uarr; "View interface Config"

Specifies the configuration for constructing a `Timetable` instance.

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `Types` | <code><u>[`Timetable.Types`][api-reference-train/index.ts~Types]</u></code> | Type information about the `Timetable` and SDK. |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:219][api-reference-train/timetable/index.ts]

<br/>
<br/>

#### [`property Config.data`][api-reference-train/timetable/index.ts~Config.data]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Config.data]: #property-configdata&nbsp;&nbsp;&nbsp;&uarr; "View property Config.data"

<kbd>read-only</kbd> <kbd>optional</kbd>

Specifies train timetable data retrieved from the timetable endpoint.

**NOTE**: Leaving `data` set to `undefined` will cause the `Timetable` class to
  execute `update()` on construction to retrieve it's data.

**Type**:&nbsp;&nbsp;<code><u>[`List`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~List]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:226][api-reference-train/timetable/index.ts]

<br/>

<br/>

#### [`property Config.sdk`][api-reference-train/timetable/index.ts~Config.sdk]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Config.sdk]: #property-configsdk&nbsp;&nbsp;&nbsp;&uarr; "View property Config.sdk"

<kbd>read-only</kbd>

Specifies a reference to the `Sdk` class.

**Type**:&nbsp;&nbsp;<code><u>[`Sdk`][api-reference-index.ts~Sdk]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:228][api-reference-train/timetable/index.ts]

<br/>

<br/>

#### [`property Config.train`][api-reference-train/timetable/index.ts~Config.train]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Config.train]: #property-configtrain&nbsp;&nbsp;&nbsp;&uarr; "View property Config.train"

<kbd>read-only</kbd>

Specifies a reference to the related `Train` class.

**Type**:&nbsp;&nbsp;<code><u>[`Train`][api-reference-train/index.ts~Train]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:230][api-reference-train/timetable/index.ts]

<br/>

<br/>

<br/>

### [`interface CurrentChanged`][api-reference-train/timetable/index.ts~CurrentChanged]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~CurrentChanged]: #interface-currentchanged&nbsp;&nbsp;&nbsp;&uarr; "View interface CurrentChanged"

Specifies an event that fires when the value of `Timetable.current` changes.

**Extends**:&nbsp;&nbsp;<u>[`Base`][api-reference-train/timetable/index.ts~Base]</u>&#60;`Types` &#124; <u>[`Type.CurrentChanged`][api-reference-train/timetable/index.ts~CurrentChanged]</u>&#62;

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><u>[`Train.Types`][api-reference-train/index.ts~Types]</u></code> |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:254][api-reference-train/timetable/index.ts]

<br/>
<br/>

#### [`property CurrentChanged.current`][api-reference-train/timetable/index.ts~CurrentChanged.current]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~CurrentChanged.current]: #property-currentchangedcurrent&nbsp;&nbsp;&nbsp;&uarr; "View property CurrentChanged.current"

**Type**:&nbsp;&nbsp;<code><u>[`Entry`][api-reference-train/timetable/entry/index.ts~Entry]</u>&#60;`Types` &#124; <u>[`Type`][api-reference-train/timetable/entry/index.ts~Type]</u>&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:255][api-reference-train/timetable/index.ts]

<br/>

<br/>

<br/>

### [`interface Data`][api-reference-train/timetable/entry/index.ts~Data]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data]: #interface-data&nbsp;&nbsp;&nbsp;&uarr; "View interface Data"

| Type params: | *Extends* | *Optional* | *Default* |
| ------------ | --------- | ---------- | --------- |
| `EntryType` | <code><u>[`Type`][api-reference-train/timetable/entry/index.ts~Type]</u></code> | Yes | <code><u>[`Type`][api-reference-train/timetable/entry/index.ts~Type]</u></code> |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:142][api-reference-train/timetable/entry/index.ts]

<br/>
<br/>

#### [`property Data.arrivesAt`][api-reference-train/timetable/entry/index.ts~Data.arrivesAt]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.arrivesAt]: #property-dataarrivesat&nbsp;&nbsp;&nbsp;&uarr; "View property Data.arrivesAt"

<kbd>read-only</kbd>

**Type**:&nbsp;&nbsp;<code>`EntryType` extends (<u>[`PassengerStop`][api-reference-train/timetable/entry/index.ts~PassengerStop]</u> &#124; <u>[`TimingStop`][api-reference-train/timetable/entry/index.ts~TimingStop]</u>) ? `string` : `undefined`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:143][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Data.departsAt`][api-reference-train/timetable/entry/index.ts~Data.departsAt]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.departsAt]: #property-datadepartsat&nbsp;&nbsp;&nbsp;&uarr; "View property Data.departsAt"

<kbd>read-only</kbd>

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:144][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Data.first`][api-reference-train/timetable/entry/index.ts~Data.first]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.first]: #property-datafirst&nbsp;&nbsp;&nbsp;&uarr; "View property Data.first"

<kbd>read-only</kbd>

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:146][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Data.index`][api-reference-train/timetable/entry/index.ts~Data.index]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.index]: #property-dataindex&nbsp;&nbsp;&nbsp;&uarr; "View property Data.index"

<kbd>read-only</kbd>

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:145][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Data.kilometrage`][api-reference-train/timetable/entry/index.ts~Data.kilometrage]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.kilometrage]: #property-datakilometrage&nbsp;&nbsp;&nbsp;&uarr; "View property Data.kilometrage"

<kbd>read-only</kbd>

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:147][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Data.last`][api-reference-train/timetable/entry/index.ts~Data.last]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.last]: #property-datalast&nbsp;&nbsp;&nbsp;&uarr; "View property Data.last"

<kbd>read-only</kbd>

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:151][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Data.line`][api-reference-train/timetable/entry/index.ts~Data.line]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.line]: #property-dataline&nbsp;&nbsp;&nbsp;&uarr; "View property Data.line"

<kbd>read-only</kbd>

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:148][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Data.localTrack`][api-reference-train/timetable/entry/index.ts~Data.localTrack]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.localTrack]: #property-datalocaltrack&nbsp;&nbsp;&nbsp;&uarr; "View property Data.localTrack"

<kbd>read-only</kbd> <kbd>optional</kbd>

**Type**:&nbsp;&nbsp;<code>`EntryType` extends <u>[`PassengerStop`][api-reference-train/timetable/entry/index.ts~PassengerStop]</u> ? `number` : `undefined`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:149][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Data.maxSpeed`][api-reference-train/timetable/entry/index.ts~Data.maxSpeed]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.maxSpeed]: #property-datamaxspeed&nbsp;&nbsp;&nbsp;&uarr; "View property Data.maxSpeed"

<kbd>read-only</kbd>

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:150][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Data.name`][api-reference-train/timetable/entry/index.ts~Data.name]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.name]: #property-dataname&nbsp;&nbsp;&nbsp;&uarr; "View property Data.name"

<kbd>read-only</kbd>

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:152][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Data.platform`][api-reference-train/timetable/entry/index.ts~Data.platform]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.platform]: #property-dataplatform&nbsp;&nbsp;&nbsp;&uarr; "View property Data.platform"

<kbd>read-only</kbd> <kbd>optional</kbd>

**Type**:&nbsp;&nbsp;<code>`EntryType` extends <u>[`PassengerStop`][api-reference-train/timetable/entry/index.ts~PassengerStop]</u> ? `string` : `undefined`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:153][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Data.pointId`][api-reference-train/timetable/entry/index.ts~Data.pointId]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.pointId]: #property-datapointid&nbsp;&nbsp;&nbsp;&uarr; "View property Data.pointId"

<kbd>read-only</kbd>

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:154][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Data.radioChannels`][api-reference-train/timetable/entry/index.ts~Data.radioChannels]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.radioChannels]: #property-dataradiochannels&nbsp;&nbsp;&nbsp;&uarr; "View property Data.radioChannels"

<kbd>read-only</kbd> <kbd>optional</kbd>

**Type**:&nbsp;&nbsp;<code><u>[`RadioChannels`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~RadioChannels]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:155][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Data.stationCategory`][api-reference-train/timetable/entry/index.ts~Data.stationCategory]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.stationCategory]: #property-datastationcategory&nbsp;&nbsp;&nbsp;&uarr; "View property Data.stationCategory"

<kbd>read-only</kbd> <kbd>optional</kbd>

**Type**:&nbsp;&nbsp;<code>`EntryType` extends <u>[`PassengerStop`][api-reference-train/timetable/entry/index.ts~PassengerStop]</u> ? `string` : `undefined`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:156][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Data.supervisedBy`][api-reference-train/timetable/entry/index.ts~Data.supervisedBy]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.supervisedBy]: #property-datasupervisedby&nbsp;&nbsp;&nbsp;&uarr; "View property Data.supervisedBy"

<kbd>read-only</kbd> <kbd>optional</kbd>

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:157][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Data.trainType`][api-reference-train/timetable/entry/index.ts~Data.trainType]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.trainType]: #property-datatraintype&nbsp;&nbsp;&nbsp;&uarr; "View property Data.trainType"

<kbd>read-only</kbd>

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:158][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

#### [`property Data.type`][api-reference-train/timetable/entry/index.ts~Data.type]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Data.type]: #property-datatype&nbsp;&nbsp;&nbsp;&uarr; "View property Data.type"

<kbd>read-only</kbd>

**Type**:&nbsp;&nbsp;<code>`EntryType` &#124; &#96;&#36;{`EntryType`}&#96;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:159][api-reference-train/timetable/entry/index.ts]

<br/>

<br/>

<br/>

### [`interface DataUpdated`][api-reference-train/liveData/index.ts~DataUpdated]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~DataUpdated]: #interface-dataupdated&nbsp;&nbsp;&nbsp;&uarr; "View interface DataUpdated"

Specifies an event that fires when the value of `LiveData.data` changes.

**Extends**:&nbsp;&nbsp;<u>[`Base`][api-reference-train/liveData/index.ts~Base]</u>&#60;`Types` &#124; <u>[`Type.DataUpdated`][api-reference-train/liveData/index.ts~DataUpdated]</u>&#62;

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><u>[`Train.Types`][api-reference-train/index.ts~Types]</u></code> |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:543][api-reference-train/liveData/index.ts]

<br/>
<br/>

#### [`property DataUpdated.data`][api-reference-train/liveData/index.ts~DataUpdated.data]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~DataUpdated.data]: #property-dataupdateddata&nbsp;&nbsp;&nbsp;&uarr; "View property DataUpdated.data"

**Type**:&nbsp;&nbsp;<code><u>[`Data`][api-reference-train/liveData/index.ts~Data]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:544][api-reference-train/liveData/index.ts]

<br/>

<br/>

<br/>

### [`interface Destination`][api-reference-train/index.ts~Destination]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Destination]: #interface-destination&nbsp;&nbsp;&nbsp;&uarr; "View interface Destination"

Specifies the destination of a train.

**Extends**:&nbsp;&nbsp;`OriginDestinationBase`

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:271][api-reference-train/index.ts]

<br/>
<br/>

#### [`property Destination.arrivesAt`][api-reference-train/index.ts~Destination.arrivesAt]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Destination.arrivesAt]: #property-destinationarrivesat&nbsp;&nbsp;&nbsp;&uarr; "View property Destination.arrivesAt"

<kbd>read-only</kbd>

Specifies when the train arrives at it's destination in format `"hh:mm:ss"`.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:273][api-reference-train/index.ts]

<br/>

<br/>

<br/>

### [`interface Disabled`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Disabled]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Disabled]: #interface-disabled&nbsp;&nbsp;&nbsp;&uarr; "View interface Disabled"

Specifies a configuration for caching timetable data.

**Extends**:&nbsp;&nbsp;<u>[`Core`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Core]</u>&#60;`false`&#62;

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:357][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

### [`interface DispatchedBy`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~DispatchedBy]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~DispatchedBy]: #interface-dispatchedby&nbsp;&nbsp;&nbsp;&uarr; "View interface DispatchedBy"

Specifies a player dispatching at a station in the raw API format.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:196][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

#### [`property DispatchedBy.ServerCode`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~DispatchedBy.ServerCode]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~DispatchedBy.ServerCode]: #property-dispatchedbyservercode&nbsp;&nbsp;&nbsp;&uarr; "View property DispatchedBy.ServerCode"

Specifies the unique code of the server the player is using in the raw API format.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:198][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property DispatchedBy.SteamId`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~DispatchedBy.SteamId]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~DispatchedBy.SteamId]: #property-dispatchedbysteamid&nbsp;&nbsp;&nbsp;&uarr; "View property DispatchedBy.SteamId"

Specifies the Steam ID of the player in the raw API format.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:200][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

<br/>

### [`interface Dispatcher`][api-reference-station/index.ts~Dispatcher]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Dispatcher]: #interface-dispatcher&nbsp;&nbsp;&nbsp;&uarr; "View interface Dispatcher"

Specifies a dispatcher currently controlling a station.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:235][api-reference-station/index.ts]

<br/>
<br/>

#### [`property Dispatcher.steamId`][api-reference-station/index.ts~Dispatcher.steamId]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Dispatcher.steamId]: #property-dispatchersteamid&nbsp;&nbsp;&nbsp;&uarr; "View property Dispatcher.steamId"

Specifies the Steam ID of the dispatcher.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:237][api-reference-station/index.ts]

<br/>

<br/>

<br/>

### [`interface Enabled`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Enabled]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Enabled]: #interface-enabled&nbsp;&nbsp;&nbsp;&uarr; "View interface Enabled"

Specifies a configuration for caching timetable data.

**Extends**:&nbsp;&nbsp;<u>[`Core`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Core]</u>&#60;`true`&#62;

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:333][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

#### [`property Enabled.retention`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Enabled.retention]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Enabled.retention]: #property-enabledretention&nbsp;&nbsp;&nbsp;&uarr; "View property Enabled.retention"

<kbd>read-only</kbd> <kbd>optional</kbd>

Specifies for how long a timetable record should be cached in seconds.

Defaults to 24 hours.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:341][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>

<br/>

#### [`property Enabled.singleRecordOnly`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Enabled.singleRecordOnly]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Enabled.singleRecordOnly]: #property-enabledsinglerecordonly&nbsp;&nbsp;&nbsp;&uarr; "View property Enabled.singleRecordOnly"

<kbd>read-only</kbd> <kbd>optional</kbd>

Specifies if only one timetable record should be cached.

When set to:
- `true` only the last timetable record will be cached.
- `false` a timetable record will be cached for
  each server that was queried for a timetable.
  Use this when you are actively querying multiple servers.

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:353][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>

<br/>

<br/>

### [`interface Endpoints`][api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts~Endpoints]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts~Endpoints]: #interface-endpoints&nbsp;&nbsp;&nbsp;&uarr; "View interface Endpoints"

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/index.d.ts:110][api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts]

<br/>
<br/>

#### [`property Endpoints.liveData`][api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts~Endpoints.liveData]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts~Endpoints.liveData]: #property-endpointslivedata&nbsp;&nbsp;&nbsp;&uarr; "View property Endpoints.liveData"

<kbd>read-only</kbd>

Specifies the URL for the live data API endpoint.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/index.d.ts:112][api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts]

<br/>

<br/>

#### [`property Endpoints.timetable`][api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts~Endpoints.timetable]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts~Endpoints.timetable]: #property-endpointstimetable&nbsp;&nbsp;&nbsp;&uarr; "View property Endpoints.timetable"

<kbd>read-only</kbd>

Specifies the URL for the timetable API endpoint.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/index.d.ts:114][api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts]

<br/>

<br/>

<br/>

### [`interface Error`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Error]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Error]: #interface-error&nbsp;&nbsp;&nbsp;&uarr; "View interface Error"

Specifies a response for a failed request.

**Extends**:&nbsp;&nbsp;<u>[`Base`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Base]</u>&#60;`false`&#62;

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:39][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`interface Images`][api-reference-station/index.ts~Images]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Images]: #interface-images&nbsp;&nbsp;&nbsp;&uarr; "View interface Images"

Specifies images for a station.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:245][api-reference-station/index.ts]

<br/>
<br/>

#### [`property Images.primary`][api-reference-station/index.ts~Images.primary]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Images.primary]: #property-imagesprimary&nbsp;&nbsp;&nbsp;&uarr; "View property Images.primary"

Specifies an URL to the primary image of the station.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:247][api-reference-station/index.ts]

<br/>

<br/>

#### [`property Images.secondary`][api-reference-station/index.ts~Images.secondary]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Images.secondary]: #property-imagessecondary&nbsp;&nbsp;&nbsp;&uarr; "View property Images.secondary"

Specifies a list of URLs to secondary images of the station.

**Type**:&nbsp;&nbsp;<code>`string`[]</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:249][api-reference-station/index.ts]

<br/>

<br/>

<br/>

### [`interface InPlayableAreaChanged`][api-reference-train/liveData/index.ts~InPlayableAreaChanged]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~InPlayableAreaChanged]: #interface-inplayableareachanged&nbsp;&nbsp;&nbsp;&uarr; "View interface InPlayableAreaChanged"

Specifies an event that fires when the value of `LiveData.inPlayableArea` changes.

**Extends**:&nbsp;&nbsp;<u>[`Base`][api-reference-train/liveData/index.ts~Base]</u>&#60;`Types` &#124; <u>[`Type.InPlayableAreaChanged`][api-reference-train/liveData/index.ts~InPlayableAreaChanged]</u>&#62;

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><u>[`Train.Types`][api-reference-train/index.ts~Types]</u></code> |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:548][api-reference-train/liveData/index.ts]

<br/>
<br/>

#### [`property InPlayableAreaChanged.inPlayableArea`][api-reference-train/liveData/index.ts~InPlayableAreaChanged.inPlayableArea]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~InPlayableAreaChanged.inPlayableArea]: #property-inplayableareachangedinplayablearea&nbsp;&nbsp;&nbsp;&uarr; "View property InPlayableAreaChanged.inPlayableArea"

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:549][api-reference-train/liveData/index.ts]

<br/>

<br/>

<br/>

### [`interface LiveData`][api-reference-station/index.ts~LiveData]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~LiveData]: #interface-livedata&nbsp;&nbsp;&nbsp;&uarr; "View interface LiveData"

Specifies live data of a station.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:253][api-reference-station/index.ts]

<br/>
<br/>

#### [`property LiveData.dispatchers`][api-reference-station/index.ts~LiveData.dispatchers]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~LiveData.dispatchers]: #property-livedatadispatchers&nbsp;&nbsp;&nbsp;&uarr; "View property LiveData.dispatchers"

<kbd>read-only</kbd> <kbd>optional</kbd>

Specifies a list of dispatchers currently controlling this station.

**Type**:&nbsp;&nbsp;<code><u>[`List`][api-reference-station/index.ts~List]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:255][api-reference-station/index.ts]

<br/>

<br/>

<br/>

### [`interface Origin`][api-reference-train/index.ts~Origin]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Origin]: #interface-origin&nbsp;&nbsp;&nbsp;&uarr; "View interface Origin"

Specifies the origin of a train.

**Extends**:&nbsp;&nbsp;`OriginDestinationBase`

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:321][api-reference-train/index.ts]

<br/>
<br/>

#### [`property Origin.departsAt`][api-reference-train/index.ts~Origin.departsAt]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Origin.departsAt]: #property-origindepartsat&nbsp;&nbsp;&nbsp;&uarr; "View property Origin.departsAt"

<kbd>read-only</kbd>

Specifies when the train departs from it's origin in format `"hh:mm:ss"`.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:323][api-reference-train/index.ts]

<br/>

<br/>

<br/>

### [`interface OriginDestinationBase`][api-reference-train/index.d.ts~OriginDestinationBase]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.d.ts~OriginDestinationBase]: #interface-origindestinationbase&nbsp;&nbsp;&nbsp;&uarr; "View interface OriginDestinationBase"

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.d.ts:225][api-reference-train/index.d.ts]

**Extended by**
- <u>[`Destination`][api-reference-train/index.d.ts~Destination]</u>
- <u>[`Origin`][api-reference-train/index.d.ts~Origin]</u>

<br/>
<br/>

#### [`property OriginDestinationBase.stationName`][api-reference-train/index.d.ts~OriginDestinationBase.stationName]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.d.ts~OriginDestinationBase.stationName]: #property-origindestinationbasestationname&nbsp;&nbsp;&nbsp;&uarr; "View property OriginDestinationBase.stationName"

<kbd>read-only</kbd>

Specifies the name of the station.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.d.ts:227][api-reference-train/index.d.ts]

<br/>

<br/>

<br/>

### [`interface Raw`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw]: #interface-raw&nbsp;&nbsp;&nbsp;&uarr; "View interface Raw"

Specifies a timetable entry for a train in the raw API format.

**Extends**:&nbsp;&nbsp;<abbr title='Declared in package "typescript"'>`Omit`</abbr>&#60;<u>[`Timetable`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Timetable]</u> &#124; `"arrivalTime"` &#124; `"platform"` &#124; `"radioChannels"` &#124; `"stationCategory"` &#124; `"stopType"` &#124; `"supervisedBy"` &#124; `"track"`&#62;

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:180][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

#### [`property Raw.arrivalTime`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.arrivalTime]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.arrivalTime]: #property-rawarrivaltime&nbsp;&nbsp;&nbsp;&uarr; "View property Raw.arrivalTime"

Specifies when the train arrives at this point in the raw API format.

**Type**:&nbsp;&nbsp;<code><u>[`ArrivalTime`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~ArrivalTime]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:182][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>

<br/>

#### [`property Raw.mileage`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.mileage]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.mileage]: #property-rawmileage&nbsp;&nbsp;&nbsp;&uarr; "View property Raw.mileage"

Specifies at what distance this point will be passed **in kilometers** and in the raw API format.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:184][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>

<br/>

#### [`property Raw.platform`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.platform]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.platform]: #property-rawplatform&nbsp;&nbsp;&nbsp;&uarr; "View property Raw.platform"

Specifies at which platform the train will stop in Roman numerals in the raw API format.

**Type**:&nbsp;&nbsp;<code><u>[`Platform`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Platform]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:190][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>

<br/>

#### [`property Raw.radioChanels`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.radioChanels]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.radioChanels]: #property-rawradiochanels&nbsp;&nbsp;&nbsp;&uarr; "View property Raw.radioChanels"

Specifies the radio channels required after this point as a comma-separated string in the raw API format.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:196][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>

<br/>

#### [`property Raw.stationCategory`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.stationCategory]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.stationCategory]: #property-rawstationcategory&nbsp;&nbsp;&nbsp;&uarr; "View property Raw.stationCategory"

Specifies the category of the station in the raw API format.

**Type**:&nbsp;&nbsp;<code><u>[`StationCategory`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~StationCategory]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:198][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>

<br/>

#### [`property Raw.stopType`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.stopType]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.stopType]: #property-rawstoptype&nbsp;&nbsp;&nbsp;&uarr; "View property Raw.stopType"

Specifies the type of stop the train will make in the raw API format.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:200][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>

<br/>

#### [`property Raw.supervisedBy`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.supervisedBy]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.supervisedBy]: #property-rawsupervisedby&nbsp;&nbsp;&nbsp;&uarr; "View property Raw.supervisedBy"

Specifies the name of the dispatch station this point belongs to in the raw API format.

**Type**:&nbsp;&nbsp;<code><u>[`SupervisedBy`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~SupervisedBy]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:202][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>

<br/>

#### [`property Raw.track`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.track]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Raw.track]: #property-rawtrack&nbsp;&nbsp;&nbsp;&uarr; "View property Raw.track"

Specifies the number of the track this train will stop at in the raw API format.

**Type**:&nbsp;&nbsp;<code><u>[`Track`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Track]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:204][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>

<br/>

<br/>

### [`interface Regular`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Regular]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Regular]: #interface-regular&nbsp;&nbsp;&nbsp;&uarr; "View interface Regular"

Specifies a configuration of the API.

**Extends**
- <u>[`Core`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Core]</u>
- <abbr title='Declared in package "typescript"'>`Omit`</abbr>&#60;<u>[`Core.Config`][api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts~Config]</u>&#60;`true`&#62; &#124; `"convertData"`&#62;

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:229][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

### [`interface Server`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server]: #interface-server&nbsp;&nbsp;&nbsp;&uarr; "View interface Server"

Specifies a multiplayer server.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:64][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

#### [`property Server.id`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server.id]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server.id]: #property-serverid&nbsp;&nbsp;&nbsp;&uarr; "View property Server.id"

Specifies the unique ID of the server. (independent of `code`)

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:66][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property Server.isActive`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server.isActive]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server.isActive]: #property-serverisactive&nbsp;&nbsp;&nbsp;&uarr; "View property Server.isActive"

Specifies if the server is active.

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:68][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property Server.serverCode`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server.serverCode]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server.serverCode]: #property-serverservercode&nbsp;&nbsp;&nbsp;&uarr; "View property Server.serverCode"

Specifies the unique code of the server.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:70][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property Server.serverName`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server.serverName]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server.serverName]: #property-serverservername&nbsp;&nbsp;&nbsp;&uarr; "View property Server.serverName"

Specifies the name of the server.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:72][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property Server.serverRegion`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server.serverRegion]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Server.serverRegion]: #property-serverserverregion&nbsp;&nbsp;&nbsp;&uarr; "View property Server.serverRegion"

Specifies in which region the server is located.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:74][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

<br/>

### [`interface Signal`][api-reference-train/liveData/index.ts~Signal]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~Signal]: #interface-signal&nbsp;&nbsp;&nbsp;&uarr; "View interface Signal"

Specifies a signal.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:563][api-reference-train/liveData/index.ts]

<br/>
<br/>

#### [`property Signal.data`][api-reference-train/liveData/index.ts~Signal.data]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~Signal.data]: #property-signaldata&nbsp;&nbsp;&nbsp;&uarr; "View property Signal.data"

<kbd>read-only</kbd>

Specifies data about the signal.

**NOTE**: This data (except for the ID prefixing the `@` symbol) hasn't be deciphered yet,
  if you know what this data describes please **open a new issue** in the project repository.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:570][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property Signal.distance`][api-reference-train/liveData/index.ts~Signal.distance]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~Signal.distance]: #property-signaldistance&nbsp;&nbsp;&nbsp;&uarr; "View property Signal.distance"

<kbd>read-only</kbd>

Specifies the distance to the signal in meters.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:572][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property Signal.id`][api-reference-train/liveData/index.ts~Signal.id]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~Signal.id]: #property-signalid&nbsp;&nbsp;&nbsp;&uarr; "View property Signal.id"

<kbd>read-only</kbd>

Specifies the unique ID of the signal.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:574][api-reference-train/liveData/index.ts]

<br/>

<br/>

#### [`property Signal.speed`][api-reference-train/liveData/index.ts~Signal.speed]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~Signal.speed]: #property-signalspeed&nbsp;&nbsp;&nbsp;&uarr; "View property Signal.speed"

<kbd>read-only</kbd>

Specifies the track limit effective at the signal in km/h.

**Type**:&nbsp;&nbsp;<code><u>[`SignalInFrontSpeed`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~SignalInFrontSpeed]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:576][api-reference-train/liveData/index.ts]

<br/>

<br/>

<br/>

### [`interface Station`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Station]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Station]: #interface-station&nbsp;&nbsp;&nbsp;&uarr; "View interface Station"

Specifies an active dispatch station.

**Extends**:&nbsp;&nbsp;<u>[`Station`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Station]</u>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:438][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

#### [`property Station.code`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Station.code]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Station.code]: #property-stationcode&nbsp;&nbsp;&nbsp;&uarr; "View property Station.code"

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:439][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>

<br/>

<br/>

### [`interface Successful`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Successful]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Successful]: #interface-successful&nbsp;&nbsp;&nbsp;&uarr; "View interface Successful"

Specfies a response for a successful request.

**Extends**:&nbsp;&nbsp;<u>[`Base`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Base]</u>&#60;`true`&#62;

| Type params: | *Description* |
| ------------ | ------------- |
| `ResponseData` | The requested data. |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:47][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

#### [`property Successful.count`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Successful.count]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Successful.count]: #property-successfulcount&nbsp;&nbsp;&nbsp;&uarr; "View property Successful.count"

Specifies the number of results.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:49][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property Successful.data`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Successful.data]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Successful.data]: #property-successfuldata&nbsp;&nbsp;&nbsp;&uarr; "View property Successful.data"

Specifies the requested data.

**Type**:&nbsp;&nbsp;<code>`ResponseData`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:51][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property Successful.description`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Successful.description]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Successful.description]: #property-successfuldescription&nbsp;&nbsp;&nbsp;&uarr; "View property Successful.description"

Specifies a description for the response.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:53][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

<br/>

### [`interface Timetable`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Timetable]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Timetable]: #interface-timetable&nbsp;&nbsp;&nbsp;&uarr; "View interface Timetable"

Specifies a configuration for timetable queries.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:314][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

#### [`property Timetable.cache`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Timetable.cache]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Timetable.cache]: #property-timetablecache&nbsp;&nbsp;&nbsp;&uarr; "View property Timetable.cache"

<kbd>read-only</kbd> <kbd>optional</kbd>

Specifies a configuration for caching timetable data.

**Type**:&nbsp;&nbsp;<code><u>[`Cache`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Cache]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:316][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>

<br/>

<br/>

### [`interface TimetableIndexChanged`][api-reference-train/liveData/index.ts~TimetableIndexChanged]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~TimetableIndexChanged]: #interface-timetableindexchanged&nbsp;&nbsp;&nbsp;&uarr; "View interface TimetableIndexChanged"

Specifies an event that fires when the value of `LiveData.timetableIndex` changes.

**Extends**:&nbsp;&nbsp;<u>[`Base`][api-reference-train/liveData/index.ts~Base]</u>&#60;`Types` &#124; <u>[`Type.TimetableIndexChanged`][api-reference-train/liveData/index.ts~TimetableIndexChanged]</u>&#62;

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><u>[`Train.Types`][api-reference-train/index.ts~Types]</u></code> |

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:553][api-reference-train/liveData/index.ts]

<br/>
<br/>

#### [`property TimetableIndexChanged.timetableIndex`][api-reference-train/liveData/index.ts~TimetableIndexChanged.timetableIndex]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~TimetableIndexChanged.timetableIndex]: #property-timetableindexchangedtimetableindex&nbsp;&nbsp;&nbsp;&uarr; "View property TimetableIndexChanged.timetableIndex"

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:554][api-reference-train/liveData/index.ts]

<br/>

<br/>

<br/>

### [`interface TimetableUpdated`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~TimetableUpdated]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~TimetableUpdated]: #interface-timetableupdated&nbsp;&nbsp;&nbsp;&uarr; "View interface TimetableUpdated"

Specifies an event that fires when cached timetable data updated.

**Extends**:&nbsp;&nbsp;<u>[`Base`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Base]</u>&#60;<u>[`Type.TimetableUpdated`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~TimetableUpdated]</u>&#62;

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:424][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

#### [`property TimetableUpdated.timetable`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~TimetableUpdated.timetable]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~TimetableUpdated.timetable]: #property-timetableupdatedtimetable&nbsp;&nbsp;&nbsp;&uarr; "View property TimetableUpdated.timetable"

**Type**:&nbsp;&nbsp;<code><u>[`List`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~List]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:425][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>

<br/>

<br/>

### [`interface Train`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train]: #interface-train&nbsp;&nbsp;&nbsp;&uarr; "View interface Train"

Specifies an active train.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:220][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

#### [`property Train.endStation`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.endStation]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.endStation]: #property-trainendstation&nbsp;&nbsp;&nbsp;&uarr; "View property Train.endStation"

Specifies the name of the destination station.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:222][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property Train.id`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.id]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.id]: #property-trainid&nbsp;&nbsp;&nbsp;&uarr; "View property Train.id"

Specifies the unique ID of the train. (independent from `runId`)

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:224][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property Train.runId`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.runId]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.runId]: #property-trainrunid&nbsp;&nbsp;&nbsp;&uarr; "View property Train.runId"

Specifies the unique ID of this train on the timetable server. (independent from `id`)

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:226][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property Train.serverCode`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.serverCode]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.serverCode]: #property-trainservercode&nbsp;&nbsp;&nbsp;&uarr; "View property Train.serverCode"

Specifies the unique code of the server the train is running on.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:228][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property Train.startStation`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.startStation]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.startStation]: #property-trainstartstation&nbsp;&nbsp;&nbsp;&uarr; "View property Train.startStation"

Specifies the name of the origin station.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:230][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property Train.trainData`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.trainData]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.trainData]: #property-traintraindata&nbsp;&nbsp;&nbsp;&uarr; "View property Train.trainData"

Specifies live data about the train.

**Type**:&nbsp;&nbsp;<code><u>[`TrainData`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:232][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property Train.trainName`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.trainName]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.trainName]: #property-traintrainname&nbsp;&nbsp;&nbsp;&uarr; "View property Train.trainName"

Specifies the name of the train.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:234][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property Train.trainNoLocal`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.trainNoLocal]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.trainNoLocal]: #property-traintrainnolocal&nbsp;&nbsp;&nbsp;&uarr; "View property Train.trainNoLocal"

Specifies the national train number of this train.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:236][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property Train.type`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.type]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.type]: #property-traintype&nbsp;&nbsp;&nbsp;&uarr; "View property Train.type"

Specifies if this train is operated by a `"bot"` or a `"user"`.

**Type**:&nbsp;&nbsp;<code><u>[`Type`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Type]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:238][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property Train.vehicles`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.vehicles]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train.vehicles]: #property-trainvehicles&nbsp;&nbsp;&nbsp;&uarr; "View property Train.vehicles"

Specifies a list of vehicles of this train.

**NOTE**: This data hasn't be deciphered yet, if you know what this data
  describes please **open a new issue** in the project repository.

**Type**:&nbsp;&nbsp;<code><u>[`Vehicles`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Vehicles]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:245][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

<br/>

### [`interface TrainData`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData]: #interface-traindata&nbsp;&nbsp;&nbsp;&uarr; "View interface TrainData"

Specifies live data about a train.

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:281][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

#### [`property TrainData.controlledBySteamId`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.controlledBySteamId]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.controlledBySteamId]: #property-traindatacontrolledbysteamid&nbsp;&nbsp;&nbsp;&uarr; "View property TrainData.controlledBySteamId"

<kbd>optional</kbd>

Specifies the Steam ID of the player controlling this train.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:283][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property TrainData.distanceToSignalInFront`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.distanceToSignalInFront]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.distanceToSignalInFront]: #property-traindatadistancetosignalinfront&nbsp;&nbsp;&nbsp;&uarr; "View property TrainData.distanceToSignalInFront"

<kbd>optional</kbd>

Specifies the distance to the next signal in meters.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:285][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property TrainData.inBorderStationArea`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.inBorderStationArea]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.inBorderStationArea]: #property-traindatainborderstationarea&nbsp;&nbsp;&nbsp;&uarr; "View property TrainData.inBorderStationArea"

Specifies if the train is in the border area of the map. (unplayable area)

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:287][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property TrainData.latitude`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.latitude]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.latitude]: #property-traindatalatitude&nbsp;&nbsp;&nbsp;&uarr; "View property TrainData.latitude"

Specifies the current global latitude of the train.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:289][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property TrainData.longitude`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.longitude]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.longitude]: #property-traindatalongitude&nbsp;&nbsp;&nbsp;&uarr; "View property TrainData.longitude"

Specifies the current global longitude of the train.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:291][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property TrainData.signalInFront`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.signalInFront]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.signalInFront]: #property-traindatasignalinfront&nbsp;&nbsp;&nbsp;&uarr; "View property TrainData.signalInFront"

<kbd>optional</kbd>

Specifies data about the next signal.

**NOTE**: This data (except for the ID prefixing the `@` symbol) hasn't be deciphered yet,
  if you know what this data describes please **open a new issue** in the project repository.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:298][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property TrainData.signalInFrontSpeed`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.signalInFrontSpeed]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.signalInFrontSpeed]: #property-traindatasignalinfrontspeed&nbsp;&nbsp;&nbsp;&uarr; "View property TrainData.signalInFrontSpeed"

<kbd>optional</kbd>

Specifies the track limit effective at the next signal in km/h.

**Type**:&nbsp;&nbsp;<code><u>[`SignalInFrontSpeed`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~SignalInFrontSpeed]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:300][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property TrainData.vdDelayedTimetableIndex`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.vdDelayedTimetableIndex]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.vdDelayedTimetableIndex]: #property-traindatavddelayedtimetableindex&nbsp;&nbsp;&nbsp;&uarr; "View property TrainData.vdDelayedTimetableIndex"

Specifies the index of the current entry in this train's timetable.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:302][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

#### [`property TrainData.velocity`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.velocity]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~TrainData.velocity]: #property-traindatavelocity&nbsp;&nbsp;&nbsp;&uarr; "View property TrainData.velocity"

Specifies the current speed of the train.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:304][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>

<br/>

<br/>

### [`interface Types`][api-reference-train/timetable/entry/index.ts~Types]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Types]: #interface-types&nbsp;&nbsp;&nbsp;&uarr; "View interface Types"

**Extends**:&nbsp;&nbsp;<u>[`Types`][api-reference-train/index.ts~Types]</u>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:176][api-reference-train/timetable/entry/index.ts]

<br/>
<br/>

<br/>

### [`interface User`][api-reference-train/liveData/index.ts~User]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~User]: #interface-user&nbsp;&nbsp;&nbsp;&uarr; "View interface User"

Specifies a train driver.

**Extends**:&nbsp;&nbsp;`Base`&#60;<u>[`Type.User`][api-reference-train/liveData/index.ts~User]</u>&#62;

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:474][api-reference-train/liveData/index.ts]

<br/>
<br/>

#### [`property User.steamId`][api-reference-train/liveData/index.ts~User.steamId]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~User.steamId]: #property-usersteamid&nbsp;&nbsp;&nbsp;&uarr; "View property User.steamId"

Specifies the Steam ID of the train driver.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:476][api-reference-train/liveData/index.ts]

<br/>

<br/>

<br/>

### [`interface WithCore`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~WithCore]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~WithCore]: #interface-withcore&nbsp;&nbsp;&nbsp;&uarr; "View interface WithCore"

Specifies a configuration of the API.

**Extends**:&nbsp;&nbsp;<u>[`Core`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Core]</u>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:223][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

#### [`property WithCore.core`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~WithCore.core]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~WithCore.core]: #property-withcorecore&nbsp;&nbsp;&nbsp;&uarr; "View property WithCore.core"

<kbd>read-only</kbd>

Specifies a Core API class instance.

**Type**:&nbsp;&nbsp;<code><u>[`Api`][api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts~Core]</u>&#60;`true`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:225][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>

<br/>

<br/>

### [`type ActiveServers`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveServers]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveServers]: #type-activeservers&nbsp;&nbsp;&nbsp;&uarr; "View type ActiveServers"

Specifies a configuration for caching active servers.

**Type**:&nbsp;&nbsp;<code><u>[`ActiveServers.Disabled`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Disabled]</u> &#124; <u>[`ActiveServers.Enabled`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Enabled]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:260][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

### [`type ActiveStations`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveStations]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveStations]: #type-activestations&nbsp;&nbsp;&nbsp;&uarr; "View type ActiveStations"

Specifies a configuration for caching active stations.

**Type**:&nbsp;&nbsp;<code><u>[`ActiveStations.Disabled`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Disabled]</u> &#124; <u>[`ActiveStations.Enabled`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Enabled]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:277][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

### [`type ActiveTrains`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveTrains]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~ActiveTrains]: #type-activetrains&nbsp;&nbsp;&nbsp;&uarr; "View type ActiveTrains"

Specifies a configuration for caching active trains.

**Type**:&nbsp;&nbsp;<code><u>[`ActiveTrains.Disabled`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Disabled]</u> &#124; <u>[`ActiveTrains.Enabled`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Enabled]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:294][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

### [`type ApiResponse`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~ApiResponse]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~ApiResponse]: #type-apiresponse&nbsp;&nbsp;&nbsp;&uarr; "View type ApiResponse"

Specifies a response returned by the remote API.

| Type params: | *Description* |
| ------------ | ------------- |
| `ResponseData` | The requested data. |

**Type**:&nbsp;&nbsp;<code><u>[`ApiResponse.Error`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Error]</u> &#124; <u>[`ApiResponse.Successful`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Successful]</u>&#60;`ResponseData`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:28][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type ArrivalTime`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~ArrivalTime]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~ArrivalTime]: #type-arrivaltime&nbsp;&nbsp;&nbsp;&uarr; "View type ArrivalTime"

Specifies when the train arrives at a point.

**Type**:&nbsp;&nbsp;<code><u>[`Timetable.ArrivalTime`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~ArrivalTime]</u> &#124; `null`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:208][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type AutoUpdate`][api-reference-train/liveData/index.ts~AutoUpdate]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~AutoUpdate]: #type-autoupdate&nbsp;&nbsp;&nbsp;&uarr; "View type AutoUpdate"

Specifies if auto updating of live data is enabled.

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:388][api-reference-train/liveData/index.ts]

<br/>
<br/>

<br/>

### [`type AutoUpdateInterval`][api-reference-train/liveData/index.ts~AutoUpdateInterval]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~AutoUpdateInterval]: #type-autoupdateinterval&nbsp;&nbsp;&nbsp;&uarr; "View type AutoUpdateInterval"

Specifies an update interval in milliseconds.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:391][api-reference-train/liveData/index.ts]

<br/>
<br/>

<br/>

### [`type AutoUpdateServer`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~AutoUpdateServer]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~AutoUpdateServer]: #type-autoupdateserver&nbsp;&nbsp;&nbsp;&uarr; "View type AutoUpdateServer"

Specifies the unique code of a server to automatically retrieve data from.

**Type**:&nbsp;&nbsp;<code><u>[`LiveData.Server.ServerCode`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~ServerCode]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:209][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

### [`type Available`][api-reference-train/liveData/index.ts~Available]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~Available]: #type-available&nbsp;&nbsp;&nbsp;&uarr; "View type Available"

Specifies if live data is available.

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:394][api-reference-train/liveData/index.ts]

<br/>
<br/>

<br/>

### [`type Cache`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Cache]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Cache]: #type-cache&nbsp;&nbsp;&nbsp;&uarr; "View type Cache"

Specifies a configuration for caching timetable data.

**Type**:&nbsp;&nbsp;<code><u>[`Cache.Disabled`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Disabled]</u> &#124; <u>[`Cache.Enabled`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Enabled]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:320][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

### [`type Callback`][api-reference-train/timetable/index.ts~Callback]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Callback]: #type-callback&nbsp;&nbsp;&nbsp;&uarr; "View type Callback"

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `Types` | <code><u>[`Timetable.Types`][api-reference-train/index.ts~Types]</u></code> | Type information about the `Timetable` and SDK. |

**Type**:&nbsp;&nbsp;<code>(liveData: <u>[`Timetable`][api-reference-train/timetable/index.ts~Timetable]</u>&#60;`Types`&#62;) => `any`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:212][api-reference-train/timetable/index.ts]

<br/>
<br/>

<br/>

### [`type Code`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Code]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Code]: #type-code&nbsp;&nbsp;&nbsp;&uarr; "View type Code"

Specifies the unique code of the dispatch station.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:452][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

### [`type Config`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Config]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Config]: #type-config&nbsp;&nbsp;&nbsp;&uarr; "View type Config"

Specifies a configuration of the API.

**Type**:&nbsp;&nbsp;<code><u>[`Config.Regular`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Regular]</u> &#124; <u>[`Config.WithCore`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~WithCore]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:212][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

### [`type ContinuesAs`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~ContinuesAs]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~ContinuesAs]: #type-continuesas&nbsp;&nbsp;&nbsp;&uarr; "View type ContinuesAs"

Specifies under which train number a train will continue.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:49][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type ControlledBySteamId`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~ControlledBySteamId]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~ControlledBySteamId]: #type-controlledbysteamid&nbsp;&nbsp;&nbsp;&uarr; "View type ControlledBySteamId"

Specifies the Steam ID of the player controlling a train in the raw API format.

**Type**:&nbsp;&nbsp;<code>`string` &#124; `null`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:358][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type Count`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Count]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Count]: #type-count&nbsp;&nbsp;&nbsp;&uarr; "View type Count"

Specifies the number of results.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:35][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type DepartureTime`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~DepartureTime]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~DepartureTime]: #type-departuretime&nbsp;&nbsp;&nbsp;&uarr; "View type DepartureTime"

Specifies when a train departs at this point.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:134][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type Description`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Description]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Description]: #type-description&nbsp;&nbsp;&nbsp;&uarr; "View type Description"

Specifies a description of a response.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:37][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type DifficultyLevel`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~DifficultyLevel]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~DifficultyLevel]: #type-difficultylevel&nbsp;&nbsp;&nbsp;&uarr; "View type DifficultyLevel"

Specifies the difficulty level for a station in the raw API format. (from `1` to `5`)

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:194][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type DisplayedTrainNumber`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~DisplayedTrainNumber]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~DisplayedTrainNumber]: #type-displayedtrainnumber&nbsp;&nbsp;&nbsp;&uarr; "View type DisplayedTrainNumber"

Specifies which train number is displayed for a train.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:136][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type DistanceToSignalInFront`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~DistanceToSignalInFront]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~DistanceToSignalInFront]: #type-distancetosignalinfront&nbsp;&nbsp;&nbsp;&uarr; "View type DistanceToSignalInFront"

Specifies the distance to the next signal in meters and in the raw API format.

**Type**:&nbsp;&nbsp;<code>`number` &#124; `null`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:371][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type Driver`][api-reference-train/liveData/index.ts~Driver]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~Driver]: #type-driver&nbsp;&nbsp;&nbsp;&uarr; "View type Driver"

Specifies a train driver.

**Type**:&nbsp;&nbsp;<code><u>[`Driver.Bot`][api-reference-train/liveData/index.ts~Bot]</u> &#124; <u>[`Driver.User`][api-reference-train/liveData/index.ts~User]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:466][api-reference-train/liveData/index.ts]

<br/>
<br/>

<br/>

### [`type Emitter`][api-reference-train/timetable/index.ts~Emitter]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Emitter]: #type-emitter&nbsp;&nbsp;&nbsp;&uarr; "View type Emitter"

Specifies a timetable event emitter.

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><u>[`Train.Types`][api-reference-train/index.ts~Types]</u></code> |

**Type**:&nbsp;&nbsp;<code><abbr title='Declared in package "rxjs"'>`RXJS.Observable`</abbr>&#60;<u>[`Event`][api-reference-train/timetable/index.ts~Event]</u>&#60;`Types`&#62;&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:252][api-reference-train/timetable/index.ts]

<br/>
<br/>

<br/>

### [`type EndsAt`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~EndsAt]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~EndsAt]: #type-endsat&nbsp;&nbsp;&nbsp;&uarr; "View type EndsAt"

Specifies when a train arrives at it's destination. Format: `hh:mm:ss`

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:53][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type EndStation`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~EndStation]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~EndStation]: #type-endstation&nbsp;&nbsp;&nbsp;&uarr; "View type EndStation"

Specifies the name of a destination station.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:51][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type Event`][api-reference-train/timetable/index.ts~Event]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Event]: #type-event&nbsp;&nbsp;&nbsp;&uarr; "View type Event"

Specifies a train timetable event.

| Type params: | *Extends* | *Description* |
| ------------ | --------- | ------------- |
| `Types` | <code><u>[`Train.Types`][api-reference-train/index.ts~Types]</u></code> | Type information about the `Timetable` and SDK. |

**Type**:&nbsp;&nbsp;<code><u>[`Event.CurrentChanged`][api-reference-train/timetable/index.ts~CurrentChanged]</u>&#60;`Types`&#62;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:238][api-reference-train/timetable/index.ts]

<br/>
<br/>

<br/>

### [`type First`][api-reference-train/timetable/entry/index.ts~First]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~First]: #type-first&nbsp;&nbsp;&nbsp;&uarr; "View type First"

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:162][api-reference-train/timetable/entry/index.ts]

<br/>
<br/>

<br/>

### [`type GetUpdateDataFunction`][api-reference-train/liveData/index.ts~GetUpdateDataFunction]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~GetUpdateDataFunction]: #type-getupdatedatafunction&nbsp;&nbsp;&nbsp;&uarr; "View type GetUpdateDataFunction"

**Type**:&nbsp;&nbsp;<code>(updateDataFunction: <u>[`UpdateDataFunction`][api-reference-train/liveData/index.ts~UpdateDataFunction]</u>) => `void`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:437][api-reference-train/liveData/index.ts]

<br/>
<br/>

<br/>

### [`type Id`][api-reference-train/liveData/index.ts~Id]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~Id]: #type-id&nbsp;&nbsp;&nbsp;&uarr; "View type Id"

Specifies the unique ID of a signal.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:591][api-reference-train/liveData/index.ts]

<br/>
<br/>

<br/>

### [`type ImageUrl`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~ImageUrl]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~ImageUrl]: #type-imageurl&nbsp;&nbsp;&nbsp;&uarr; "View type ImageUrl"

Specifies the URL of an image.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:158][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type InBorderStationArea`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~InBorderStationArea]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~InBorderStationArea]: #type-inborderstationarea&nbsp;&nbsp;&nbsp;&uarr; "View type InBorderStationArea"

Specifies if a train is in the border area of the map. (unplayable area)

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:312][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type Index`][api-reference-train/timetable/entry/index.ts~Index]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Index]: #type-index&nbsp;&nbsp;&nbsp;&uarr; "View type Index"

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:164][api-reference-train/timetable/entry/index.ts]

<br/>
<br/>

<br/>

### [`type IsActive`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~IsActive]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~IsActive]: #type-isactive&nbsp;&nbsp;&nbsp;&uarr; "View type IsActive"

Specifies if a server is active.

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:80][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type Kilometrage`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Kilometrage]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Kilometrage]: #type-kilometrage&nbsp;&nbsp;&nbsp;&uarr; "View type Kilometrage"

Specifies at what distance a point will be passed.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:144][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type Last`][api-reference-train/timetable/entry/index.ts~Last]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~Last]: #type-last&nbsp;&nbsp;&nbsp;&uarr; "View type Last"

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:166][api-reference-train/timetable/entry/index.ts]

<br/>
<br/>

<br/>

### [`type LastAvailableCheck`][api-reference-train/liveData/index.ts~LastAvailableCheck]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~LastAvailableCheck]: #type-lastavailablecheck&nbsp;&nbsp;&nbsp;&uarr; "View type LastAvailableCheck"

Specifies when live data availability was last checked.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:560][api-reference-train/liveData/index.ts]

<br/>
<br/>

<br/>

### [`type Latititude`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Latititude]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Latititude]: #type-latititude&nbsp;&nbsp;&nbsp;&uarr; "View type Latititude"

Specifies the global latitude of a station in the raw API format.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:207][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type Latititute`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Latititute]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Latititute]: #type-latititute&nbsp;&nbsp;&nbsp;&uarr; "View type Latititute"

Specifies the current global latitude of a train in the raw API format.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:360][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type Latitude`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Latitude]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Latitude]: #type-latitude&nbsp;&nbsp;&nbsp;&uarr; "View type Latitude"

Specifies the current global latitude of a train.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:314][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type Line`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Line]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Line]: #type-line&nbsp;&nbsp;&nbsp;&uarr; "View type Line"

Specifies the number of the line that a train will follow.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:138][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type List`][api-reference-train/timetable/entry/index.ts~List]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/entry/index.ts~List]: #type-list&nbsp;&nbsp;&nbsp;&uarr; "View type List"

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><u>[`Entry.Types`][api-reference-train/timetable/entry/index.ts~Types]</u></code> |

**Type**:&nbsp;&nbsp;<code><u>[`Entry`][api-reference-train/timetable/entry/index.ts~Entry]</u>&#60;`Types`&#62;[]</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/entry/index.ts:168][api-reference-train/timetable/entry/index.ts]

<br/>
<br/>

<br/>

### [`type LocoType`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~LocoType]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~LocoType]: #type-locotype&nbsp;&nbsp;&nbsp;&uarr; "View type LocoType"

Specifies the name of a train's locomotive.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:55][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type Longitude`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Longitude]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Longitude]: #type-longitude&nbsp;&nbsp;&nbsp;&uarr; "View type Longitude"

Specifies the current global longitude of a train.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:316][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type Longitute`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Longitute]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Longitute]: #type-longitute&nbsp;&nbsp;&nbsp;&uarr; "View type Longitute"

Specifies the current global longitude of a train in the raw API format.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:362][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type Map`][api-reference-station/index.ts~Map]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~Map]: #type-map&nbsp;&nbsp;&nbsp;&uarr; "View type Map"

Specifies a map of dispatch stations.

| Type params: | *Extends* |
| ------------ | --------- |
| `Types` | <code><abbr title='Declared in package "typescript"'>`Omit`</abbr>&#60;<u>[`Station.Types`][api-reference-station/index.ts~Types]</u> &#124; `"stationCode"`&#62;</code> |

**Type**:&nbsp;&nbsp;<code>{ [stationCode in `Types`[`"stationCodes"`]]: <u>[`Station`][api-reference-station/index.ts~Station]</u>&#60;`Types` &#38; { stationCode: `stationCode` }&#62; }</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:259][api-reference-station/index.ts]

<br/>
<br/>

<br/>

### [`type MaxSpeed`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~MaxSpeed]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~MaxSpeed]: #type-maxspeed&nbsp;&nbsp;&nbsp;&uarr; "View type MaxSpeed"

Specifies the maximum speed at a point.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:142][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type Mileage`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Mileage]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Mileage]: #type-mileage&nbsp;&nbsp;&nbsp;&uarr; "View type Mileage"

Specifies at what distance a point will be passed **in kilometers**.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:212][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type Mutable`][api-reference-common/index.ts~Mutable]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-common/index.ts~Mutable]: #type-mutable&nbsp;&nbsp;&nbsp;&uarr; "View type Mutable"

Specifies a mutable object. (removes `readonly` keywords)

| Type params: |
| ------------ |
| `T` |

**Type**:&nbsp;&nbsp;<code>{ [P in keyof `T`]: `T`[`P`] }</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[common/index.ts:15][api-reference-common/index.ts]

<br/>
<br/>

<br/>

### [`type Name`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Name]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Name]: #type-name&nbsp;&nbsp;&nbsp;&uarr; "View type Name"

Specifies the name of a station.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:166][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type NameForPerson`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~NameForPerson]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~NameForPerson]: #type-nameforperson&nbsp;&nbsp;&nbsp;&uarr; "View type NameForPerson"

Specifies the name of the dispatcher for a point.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:146][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type NameOfPoint`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~NameOfPoint]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~NameOfPoint]: #type-nameofpoint&nbsp;&nbsp;&nbsp;&uarr; "View type NameOfPoint"

Specifies the name of a point.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:148][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type NoCache`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~NoCache]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~NoCache]: #type-nocache&nbsp;&nbsp;&nbsp;&uarr; "View type NoCache"

Specifies if a cached result can be returned.

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:459][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

### [`type Number`][api-reference-train/index.ts~Number]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Number]: #type-number&nbsp;&nbsp;&nbsp;&uarr; "View type Number"

Specifies the national train number of a train.

**Type**:&nbsp;&nbsp;<code><u>[`Api.Timetable.TrainNoLocal`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainNoLocal]</u></code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:309][api-reference-train/index.ts]

<br/>
<br/>

<br/>

### [`type Platform`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Platform]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Platform]: #type-platform&nbsp;&nbsp;&nbsp;&uarr; "View type Platform"

Specifies at which platform a train will stop in Roman numerals.

**Type**:&nbsp;&nbsp;<code><u>[`Timetable.Platform`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Platform]</u> &#124; `null`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:218][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type PointId`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~PointId]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~PointId]: #type-pointid&nbsp;&nbsp;&nbsp;&uarr; "View type PointId"

Specifies the unique ID of a point.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:156][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type Prefix`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Prefix]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Prefix]: #type-prefix&nbsp;&nbsp;&nbsp;&uarr; "View type Prefix"

Specifies the prefix of a station.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:168][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type RadioChannel`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~RadioChannel]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~RadioChannel]: #type-radiochannel&nbsp;&nbsp;&nbsp;&uarr; "View type RadioChannel"

Specifies a radio channel.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:162][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type RadioChannels`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~RadioChannels]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~RadioChannels]: #type-radiochannels&nbsp;&nbsp;&nbsp;&uarr; "View type RadioChannels"

Specifies the radio channels required after a point as a comma-separated string.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:224][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type Result`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Result]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Result]: #type-result&nbsp;&nbsp;&nbsp;&uarr; "View type Result"

Specifies if a request succeeded.

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:41][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type Retention`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Retention]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Retention]: #type-retention&nbsp;&nbsp;&nbsp;&uarr; "View type Retention"

Specifies for how long a timetable record is cached in seconds.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:360][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

### [`type RunId`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~RunId]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~RunId]: #type-runid&nbsp;&nbsp;&nbsp;&uarr; "View type RunId"

Specifies the unique ID of a train. (independent from the train number)

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:57][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type ServerCode`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~ServerCode]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~ServerCode]: #type-servercode&nbsp;&nbsp;&nbsp;&uarr; "View type ServerCode"

Specifies the unique code of a timetable server.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:59][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type ServerName`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~ServerName]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~ServerName]: #type-servername&nbsp;&nbsp;&nbsp;&uarr; "View type ServerName"

Specifies the name of a server.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:86][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type ServerRegion`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~ServerRegion]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~ServerRegion]: #type-serverregion&nbsp;&nbsp;&nbsp;&uarr; "View type ServerRegion"

Specifies in which region a server is located.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:88][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type SignalInFront`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~SignalInFront]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~SignalInFront]: #type-signalinfront&nbsp;&nbsp;&nbsp;&uarr; "View type SignalInFront"

Specifies data about the next signal in the raw API format.

**NOTE**: This data (except for the ID prefixing the `@` symbol) hasn't be deciphered yet,
  if you know what this data describes please **open a new issue** in the project repository.

**Type**:&nbsp;&nbsp;<code>`string` &#124; `null`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:369][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type SignalInFrontSpeed`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~SignalInFrontSpeed]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~SignalInFrontSpeed]: #type-signalinfrontspeed&nbsp;&nbsp;&nbsp;&uarr; "View type SignalInFrontSpeed"

Specifies the track limit effective at the next signal in km/h and in the raw API format.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:373][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type SingleRecordOnly`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~SingleRecordOnly]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~SingleRecordOnly]: #type-singlerecordonly&nbsp;&nbsp;&nbsp;&uarr; "View type SingleRecordOnly"

Specifies if only one timetable record should be cached.

**Type**:&nbsp;&nbsp;<code>`boolean`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:363][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

### [`type Size`][api-reference-train/timetable/index.ts~Size]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/timetable/index.ts~Size]: #type-size&nbsp;&nbsp;&nbsp;&uarr; "View type Size"

Specifies the number of entries in a timetable.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/timetable/index.ts:260][api-reference-train/timetable/index.ts]

<br/>
<br/>

<br/>

### [`type StartsAt`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~StartsAt]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~StartsAt]: #type-startsat&nbsp;&nbsp;&nbsp;&uarr; "View type StartsAt"

Specifies when a train departs from it's origin. Format: `hh:mm:ss`

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:63][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type StartStation`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~StartStation]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~StartStation]: #type-startstation&nbsp;&nbsp;&nbsp;&uarr; "View type StartStation"

Specifies the name of an origin station.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:61][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type StationCategory`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~StationCategory]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~StationCategory]: #type-stationcategory&nbsp;&nbsp;&nbsp;&uarr; "View type StationCategory"

Specifies the category of a station.

**Type**:&nbsp;&nbsp;<code><u>[`Timetable.StationCategory`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~StationCategory]</u> &#124; `null`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:226][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type SteamId`][api-reference-station/index.ts~SteamId]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-station/index.ts~SteamId]: #type-steamid&nbsp;&nbsp;&nbsp;&uarr; "View type SteamId"

Specifies the Steam ID of a dispatcher.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[station/index.ts:264][api-reference-station/index.ts]

<br/>
<br/>

<br/>

### [`type StopType`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~StopType]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~StopType]: #type-stoptype&nbsp;&nbsp;&nbsp;&uarr; "View type StopType"

Specifies the type of stop a train will make.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:228][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type SupervisedBy`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~SupervisedBy]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~SupervisedBy]: #type-supervisedby&nbsp;&nbsp;&nbsp;&uarr; "View type SupervisedBy"

Specifies the name of the dispatch station a point belongs to.

**Type**:&nbsp;&nbsp;<code><u>[`Timetable.SupervisedBy`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~SupervisedBy]</u> &#124; `null`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:230][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type Time`][api-reference-train/index.ts~Time]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/index.ts~Time]: #type-time&nbsp;&nbsp;&nbsp;&uarr; "View type Time"

Specifies a time string in format: `"hh:mm:ss"`

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/index.ts:327][api-reference-train/index.ts]

<br/>
<br/>

<br/>

### [`type Timestamp`][api-reference-train/liveData/index.ts~Timestamp]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~Timestamp]: #type-timestamp&nbsp;&nbsp;&nbsp;&uarr; "View type Timestamp"

Specifies when live data was last updated.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:595][api-reference-train/liveData/index.ts]

<br/>
<br/>

<br/>

### [`type Track`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Track]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Track]: #type-track&nbsp;&nbsp;&nbsp;&uarr; "View type Track"

Specifies the number of the track a train will stop at.

**Type**:&nbsp;&nbsp;<code><u>[`Timetable.Track`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~Track]</u> &#124; `null`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:232][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type TrainLength`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainLength]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainLength]: #type-trainlength&nbsp;&nbsp;&nbsp;&uarr; "View type TrainLength"

Specifies the length of a train in meters.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:65][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type TrainName`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainName]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainName]: #type-trainname&nbsp;&nbsp;&nbsp;&uarr; "View type TrainName"

Specifies the name of a train or train series.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:67][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type TrainNoInternational`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainNoInternational]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainNoInternational]: #type-trainnointernational&nbsp;&nbsp;&nbsp;&uarr; "View type TrainNoInternational"

Specifies the international train number of a train.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:69][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type TrainNoLocal`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainNoLocal]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainNoLocal]: #type-trainnolocal&nbsp;&nbsp;&nbsp;&uarr; "View type TrainNoLocal"

Specifies the national train number of a train.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:71][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type TrainType`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainType]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainType]: #type-traintype&nbsp;&nbsp;&nbsp;&uarr; "View type TrainType"

Specifies the name of a train series.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:178][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type TrainWeight`][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainWeight]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts~TrainWeight]: #type-trainweight&nbsp;&nbsp;&nbsp;&uarr; "View type TrainWeight"

Specifies the weight of a train in metric tonnes.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts:73][api-reference-node_modules/@simrail-sdk/api-core-node/types/timetable/index.d.ts]

<br/>
<br/>

<br/>

### [`type Type`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Type]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Type]: #type-type&nbsp;&nbsp;&nbsp;&uarr; "View type Type"

Specifies the type of train operator in the raw API format. (`"bot"` or `"user"`)

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:408][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type UpdateDataFunction`][api-reference-train/liveData/index.ts~UpdateDataFunction]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-train/liveData/index.ts~UpdateDataFunction]: #type-updatedatafunction&nbsp;&nbsp;&nbsp;&uarr; "View type UpdateDataFunction"

**Type**:&nbsp;&nbsp;<code>(data: <u>[`Api.LiveData.Train`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Train]</u> &#124; `null`) => `void`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[train/liveData/index.ts:431][api-reference-train/liveData/index.ts]

<br/>
<br/>

<br/>

### [`type Url`][api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts~Url]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts~Url]: #type-url&nbsp;&nbsp;&nbsp;&uarr; "View type Url"

Specifies an API endpoint URL.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/index.d.ts:118][api-reference-node_modules/@simrail-sdk/api-core-node/index.d.ts]

<br/>
<br/>

<br/>

### [`type VdDelayedTimetableIndex`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~VdDelayedTimetableIndex]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~VdDelayedTimetableIndex]: #type-vddelayedtimetableindex&nbsp;&nbsp;&nbsp;&uarr; "View type VdDelayedTimetableIndex"

Specifies the index of the current entry in a train's timetable.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:327][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type Vehicle`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Vehicle]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Vehicle]: #type-vehicle&nbsp;&nbsp;&nbsp;&uarr; "View type Vehicle"

Specifies data about a vehicle of a train.

**NOTE**: This data hasn't be deciphered yet, if you know what this data
  describes please **open a new issue** in the project repository.

**Type**:&nbsp;&nbsp;<code>`string`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:272][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type Vehicles`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Vehicles]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Vehicles]: #type-vehicles&nbsp;&nbsp;&nbsp;&uarr; "View type Vehicles"

Specifies a list of vehicles of a train.

**NOTE**: This data hasn't be deciphered yet, if you know what this data
  describes please **open a new issue** in the project repository.

**Type**:&nbsp;&nbsp;<code><u>[`Vehicles`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Vehicles]</u>[]</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:279][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type Velocity`][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Velocity]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts~Velocity]: #type-velocity&nbsp;&nbsp;&nbsp;&uarr; "View type Velocity"

Specifies the current speed of a train.

**Type**:&nbsp;&nbsp;<code>`number`</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts:329][api-reference-node_modules/@simrail-sdk/api-core-node/types/liveData/index.d.ts]

<br/>
<br/>

<br/>

### [`type Version`][api-reference-node_modules/@simrail-sdk/api/index.d.ts~Version]&nbsp;&nbsp;&nbsp;[&uarr;][api-reference]

[api-reference-node_modules/@simrail-sdk/api/index.d.ts~Version]: #type-version&nbsp;&nbsp;&nbsp;&uarr; "View type Version"

Specifies the version of the API.

**Type**:&nbsp;&nbsp;<code>&#96;&#36;{`number`}`.`&#36;{`number`}`.`&#36;{`number`}&#96; &#124; &#96;&#36;{`number`}`.`&#36;{`number`}`.`&#36;{`number`}`-`&#36;{`string`}&#96;</code>

**Since**: `0.1.0`

**Definition**:&nbsp;&nbsp;[node_modules/@simrail-sdk/api/index.d.ts:462][api-reference-node_modules/@simrail-sdk/api/index.d.ts]

<br/>
<br/>

<br/>

## [About this module][about-this-module]

[about-this-module]: #about-this-module "View About this module"

Package name: `@simrail-sdk/core`

Author: [Niek van Bennekom](https://github.com/niekvb "View GitHub profile")

Version: `0.1.0`

Repository: [`github:simrail-sdk/core` (origin)](https://github.com/simrail-sdk/core.git "View on github")

Keywords: `simrail`, `sdk`, `core`.

[View license][view-license]&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;[view open source licenses][view-open-source-licenses]

[view-license]: ./LICENSE.md "View license"
[view-open-source-licenses]: ./OSL.md "View open source licenses"

*SCTL version: `0.1.11-dev`*
<br/>
<br/>


### [Module dependencies][module-dependencies]

[module-dependencies]: #module-dependencies "View Module dependencies"

#### [Module package dependencies][module-package-dependencies]

[module-package-dependencies]: #module-package-dependencies "View Module package dependencies"


**Production packages**: (2)

- `@simrail-sdk/api`: SimRail SDK - API.

- `rxjs`: Reactive Extensions for modern JavaScript.
<br/>
<br/>


**Development packages**: (2)

- `@types/node`: TypeScript definitions for node.

- `typescript`: TypeScript is a language for application scale JavaScript development.
<br/>
<br/>


#### [Internal module dependencies][internal-module-dependencies]

[internal-module-dependencies]: #internal-module-dependencies "View Internal module dependencies"

This module contains and uses the following internal modules:


- `common/index.js`

- `index.js`

- `server/index.js`

- `station/index.js`

- `train/index.js`

- `train/liveData/index.js`

- `train/timetable/entry/index.js`

- `train/timetable/index.js`
<br/>
<br/>


Dependency tree:

[![Dependency tree graph][dependency-tree-image]][dependency-tree-image]

[dependency-tree-image]: ./stats/dependencyTree.png "Dependency tree"
<br/>
<br/>


### [Module code statistics][module-code-statistics]

[module-code-statistics]: #module-code-statistics "View Module code statistics"

| File type | Number of files | Lines with code | Lines with comments | Blank lines |
| --------- | --------------- | --------------- | ------------------- | ----------- |
| Markdown | 3 | 4967 | 0 | 3633 |
| TypeScript | 24 | 1860 | 1729 | 591 |
| JavaScript | 15 | 1194 | 15 | 0 |
| JSON | 3 | 131 | 0 | 1 |
| YAML | 1 | 44 | 3 | 3 |
| **All (total)** | **46** | **8196** | **1747** | **4228** |
