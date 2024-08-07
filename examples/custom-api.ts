import CoreApi from "@simrail-sdk/api-core-node";
import Api from "@simrail-sdk/api";
import Sdk from "../";

const endpoints: Api.Endpoints = {
    liveData: "https://panel.simrail.eu:8084",
    timetable: "https://api1.aws.simrail.eu:8082/api",
};

// By default the SDK will use the API class from package `@simrail-sdk/api`.
// To provide another API class or a custom one, just include the instance in the SDK config.
const api = new Api({ endpoints });
const sdk = new Sdk({ api }); // <-- Inject API here

// Or alternatively, to provide a different *Core API* class, include this in the API config.
const coreApi = new CoreApi({ endpoints });
const api2    = new Api({ core: coreApi }); // <-- Inject Core API here
const sdk2    = new Sdk({ api: api2 });     // <-- Inject API here
