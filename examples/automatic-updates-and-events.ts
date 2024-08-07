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


};
