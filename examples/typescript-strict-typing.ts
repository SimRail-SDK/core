import Sdk from "../";
import { Server, Station, Types } from "@simrail-sdk/core-setup-pl";

// Inject `Types` into the `Sdk` instance to enable strict type checking.
const sdk = new Sdk<Types>({} as any);

const en1 = sdk.server(Server.Code.EN1);
const en2 = sdk.server("en2");

const będzin     = sdk.station("en1", Station.Code.B);
// const düsseldorf = sdk.station("en1", "Dü"); // <-- Fails because Düsseldorf doesn't exist.
const katowice   = sdk.station("en1", "KO");

const train4144 = sdk.train("en1", "4144");
// const train4145 = sdk.train("en1", "4145"); // <-- Fails because 4145 doesn't exist.

// Obtaining a list of server/station codes:
const serverCodes  = Object.values(Server.Code);
const stationCodes = Object.values(Station.Code);
