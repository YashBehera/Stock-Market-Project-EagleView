const axios = require('axios');
const BSE_data = require('./resources/BSE.json');


// Define your logic function to process the data from the API response
async function satisfiesLogic(apiData) {


  if (!apiData.data || !apiData.data.candles) {
    //console.error("Invalid data format or missing 'candles'");
    return false; // Return false to handle gracefully
  }

  let avg90day = 0;
  let avg360day = 0;

  // Ensure candles array has at least 360 elements
  if (apiData.data.candles.length < 360) {
    //console.error("Not enough data points in candles array");
    return false;
  }

  // Calculate the 90-day average
  for (let i = 0; i < 90; i++) {
    if (!apiData.data.candles[i] || apiData.data.candles[i].length < 6) {
      //console.error(Invalid data for candle at index ${i});
      return false;
    }
    avg90day += parseFloat(apiData.data.candles[i][5]);
  }
  avg90day = avg90day / 90;

  // Calculate the 360-day average
  for (let i = 90; i < 360; i++) {
    if (!apiData.data.candles[i] || apiData.data.candles[i].length < 6) {
      //console.error(Invalid data for candle at index ${i});
      return false;
    }
    avg360day += parseFloat(apiData.data.candles[i][5]);
  }
  avg360day /= 360;

  return avg90day > 2 * avg360day;
}
// Function to fetch data from the API
async function fetchData(instrument_key) {
  const currentDate = new Date();
  const dateString = ${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')};

  let Instrument_key = encodeURIComponent(instrument_key); // URL encoded '|' as "%7C"

  const config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: https://api.upstox.com/v2/historical-candle/${Instrument_key}/day/${dateString}/2015-09-06,
    headers: {
      'Accept': 'application/json',
      'Authorization': Bearer YOUR_TOKEN_HERE // Replace with your actual token
    }
  };

  try {
    const response = await axios(config);
    return response.data; // Return the fetched data
  } catch (error) {
    //console.error(Error fetching data for ${instrument_key}:, error);
    return null; // Handle the error and return null or suitable response
  }
}

// Main function to process each item in BSE_data
async function processData() {
  let nameArray = [];

  // Loop through BSE_data
  for (let i = 0; i < 70; i++) {
    const instrument_key = BSE_data[i].instrument_key;
    const name = BSE_data[i].name;

    // Fetch data for each instrument_key
    const apiData = await fetchData(instrument_key);

    if (apiData && await satisfiesLogic(apiData)) {
      // If the logic returns true, add the name to the array
      nameArray.push(name);
    }
  }

  // Log the final array
  console.log(nameArray);
}

processData();