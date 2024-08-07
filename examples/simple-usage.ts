import Sdk from "../";

const sdk = new Sdk({
    api: {
        endpoints: {
            liveData: "https://panel.simrail.eu:8084",
            timetable: "https://api1.aws.simrail.eu:8082/api",
        },
    },
});

async () => {

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
    // ...

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
    // ...
    
    // Access live data
    const coords = [t4144.liveData.longitude, t4144.liveData.latitude];
    const speed = t4144.liveData.speed;
    // ...


};
