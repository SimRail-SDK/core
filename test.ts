import * as Setup from "@simrail-sdk/core-setup-pl";
import Sdk from ".";

const endpoints: Sdk.Api.Endpoints = {
    liveData: "https://panel.simrail.eu:8084",
    timetable: "https://api1.aws.simrail.eu:8082/api",
};

const apiConfig: Omit<Sdk.Api.Config, "base"> = {
    liveData: {
        cache: {
            activeServers:  { enabled: true, retention: 30 },
            activeStations: { enabled: true, retention: 30 },
            activeTrains:   { enabled: true, retention: 5  },
        },
    },
    timetable: {
        cache: {
            enabled: true,
            retention: 1440,
            singleRecordOnly: true,
        },
    },
};

const core = new Sdk.Api.Core({ endpoints });
const api  = new Sdk.Api({ core, ...apiConfig });
const sdk  = new Sdk<Setup.Types>({ api });


(async () => {

    const srv = await sdk.servers();
    srv.en1.name;
    srv.en2.name;

    const en1 = await sdk.server("en1");
    en1.code;
    en1.data;
    en1.id;
    en1.isActive;
    en1.name;
    en1.region;
    en1.sdk;
    en1.toJson();
    en1.update().then();

    const en1_dg = await en1.station("DG") ?? await sdk.station(en1.code, "DG");
    en1_dg.code;
    en1_dg.data;
    en1_dg.difficultyLevel;
    en1_dg.dispatchers[0].steamId;
    en1_dg.id;
    en1_dg.images.primary;
    en1_dg.images.secondary[0];
    en1_dg.images.secondary[1];
    en1_dg.latitude;
    en1_dg.longitude;
    en1_dg.name;
    en1_dg.prefix;
    en1_dg.sdk;
    en1_dg.server;
    en1_dg.toJson();
    en1_dg.update().then();
    const en2_dg = await en1_dg.switchServer("en2");
    en2_dg.dispatchers[0].steamId;

    const en1_4144 = await en1.train("4144") ?? await sdk.train(en1.code, "4144");
    en1_4144.continuesAs;
    en1_4144.data;
    en1_4144.destination.arrivesAt;
    en1_4144.destination.stationName;
    en1_4144.destroy();
    en1_4144.id;
    en1_4144.intNumber;
    en1_4144.length;
    en1_4144.locoType;
    en1_4144.name;
    en1_4144.number;
    en1_4144.origin.departsAt;
    en1_4144.origin.stationName;
    en1_4144.sdk;
    en1_4144.server;
    en1_4144.serverCode;
    en1_4144.toJson();
    en1_4144.update().then();
    en1_4144.weight;
    const en2_4144 = await en1_4144.switchServer("en2");
    en2_4144.id;

    en1_4144.liveData.autoUpdate;
    en1_4144.liveData.autoUpdateInterval;
    en1_4144.liveData.available;
    en1_4144.liveData.data;
    en1_4144.liveData.destroy();
    en1_4144.liveData.driver;
    en1_4144.liveData.events.subscribe(); 
    en1_4144.liveData.inPlayableArea;
    en1_4144.liveData.lastAvailableCheck;
    en1_4144.liveData.latitude;
    en1_4144.liveData.longitude;
    en1_4144.liveData.signal?.data;
    en1_4144.liveData.signal?.distance;
    en1_4144.liveData.signal?.id;
    en1_4144.liveData.signal?.speed;
    en1_4144.liveData.sdk;
    en1_4144.liveData.speed;
    en1_4144.liveData.start();
    en1_4144.liveData.stop();
    en1_4144.liveData.timestamp;
    en1_4144.liveData.timetableIndex;
    en1_4144.liveData.train;
    await en1_4144.liveData.update();
    en1_4144.liveData.vehicles;

    en1_4144.timetable.current.arrivesAt;
    en1_4144.timetable.current.data;
    en1_4144.timetable.current.departsAt;
    en1_4144.timetable.current.first;
    en1_4144.timetable.current.index;
    en1_4144.timetable.current.kilometrage;
    en1_4144.timetable.current.last;
    en1_4144.timetable.current.line;
    en1_4144.timetable.current.localTrack;
    en1_4144.timetable.current.maxSpeed;
    en1_4144.timetable.current.name;
    en1_4144.timetable.current.next();
    en1_4144.timetable.current.platform;
    en1_4144.timetable.current.pointId;
    en1_4144.timetable.current.previous();
    en1_4144.timetable.current.radioChannels[0];
    en1_4144.timetable.current.stationCategory;
    en1_4144.timetable.current.supervisedBy;
    en1_4144.timetable.current.timetable;
    en1_4144.timetable.current.trainType;
    en1_4144.timetable.current.type;
    en1_4144.timetable.currentIndex;
    en1_4144.timetable.destroy();
    en1_4144.timetable.entries;
    en1_4144.timetable.entry(0);
    en1_4144.timetable.events.subscribe();
    en1_4144.timetable.history;
    en1_4144.timetable.sdk;
    en1_4144.timetable.size;
    en1_4144.timetable.train;
    en1_4144.timetable.upcoming;
    await en1_4144.timetable.update();

})();

