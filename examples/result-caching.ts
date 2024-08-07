import Sdk from "../";

const endpoints: Sdk.Api.Endpoints = {
    liveData: "https://panel.simrail.eu:8084",
    timetable: "https://api1.aws.simrail.eu:8082/api",
};

// Cache configuration can be specified at SDK class construction.
const sdk = new Sdk({
    api: {
        endpoints,

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

    },
});


// If you need to, flush cached data.
sdk.api.flushCache();
// Or
sdk.api.flushActiveServerCache();
sdk.api.flushActiveStationCache();
sdk.api.flushActiveTrainCache();
sdk.api.flushTimetableCache();
