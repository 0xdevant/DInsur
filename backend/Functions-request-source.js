// This example shows how to make a call to an open API (no authentication required)
// to retrieve flight info from a flight number

// Flight schedule information of Hong Kong International Airport https://data.gov.hk/en-data/dataset/aahk-team1-flight-info/resource/8f41b55c-a2ef-4963-bb25-96d8b21f3db4

// Refer to https://github.com/smartcontractkit/functions-hardhat-starter-kit#javascript-code

const moment = require("moment/moment");

function checkIfFlightDelayed(scheduledTime, depatureTime) {
  return moment(depatureTime, "HH:mm").isAfter(moment(scheduledTime, "HH:mm"));
}

// Arguments can be provided when a request is initated on-chain and used in the request source code as shown below
const momented_date = args[0];
const flightNo = args[1].replace(" ", "");
const isArrival = args[2];

// make HTTP request
const url = `https://www.hongkongairport.com/flightinfo-rest/rest/flights/past`;
console.log(
  `HTTP GET Request to ${url}?date=${date}&lang=en&cargo=false&arrival=${isArrival}`
);

// construct the HTTP Request object. See: https://github.com/smartcontractkit/functions-hardhat-starter-kit#javascript-code
// params used for URL query parameters
// Example of query: https://www.hongkongairport.com/flightinfo-rest/rest/flights/past?date=2023-06-09&lang=en&cargo=false&arrival=false
const flightScheduleInfoRequest = Functions.makeHttpRequest({
  url: url,
  params: {
    date: date,
    lang: "en",
    cargo: false,
    arrival: isArrival,
  },
});

// Execute the API request (Promise)
const flightScheduleInfoResponse = await flightScheduleInfoRequest;
if (flightScheduleInfoResponse.error) {
  console.error(flightScheduleInfoResponse.error);
  throw Error("Request failed");
}

const data = flightScheduleInfoResponse["data"];
if (data.problemNo) {
  console.error(data.message);
  throw Error(`Functional error. Read message: ${data.message}`);
}

const isDelayed = 0; // 0: not delayed 1: delayed

for (const dateInfo of data) {
  if (momented_date === dateInfo.date) {
    for (timeslot of dateInfo.list) {
      for (flightInfo of timeslot.flight) {
        // extract the list of flight info
        const reg = /\w+:\w+/g;
        if (flightInfo.no === flightNo) {
          const depatureTime = timeslot.status.match(reg)[0];
          if (checkIfFlightDelayed(timeslot.time, depatureTime)) {
            isDelayed = 1;
          }
          isDelayed = 0;
        }
      }
    }
  }
}

console.log(`${flightNo} is: ${isDelayed ? "delayed" : "not delayed"}`);

// Solidity doesn't support decimals so multiply by 100 and round to the nearest integer
// Use Functions.encodeUint256 to encode an unsigned integer to a Buffer
return Functions.encodeUint256(isDelayed);
