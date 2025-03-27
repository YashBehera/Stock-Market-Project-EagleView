import React, { useState ,useEffect} from "react";
import "./style.css";
import { FaAsterisk } from "react-icons/fa";
import { TbTriangleFilled } from "react-icons/tb";
import { PiHourglassLowFill } from "react-icons/pi";
import { GiSlowBlob } from "react-icons/gi";
import myVideo7 from "./video7.mp4";
import datas from "./filtered_unique_datas.json"

export default function Body({token}) {
  const [selectedStocks, setSelectedStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(""); // Tracks the selected category
  const stocksPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);


  const handleButtonClick = (category) => {
    setSelectedCategory(category); // Set the selected category
    setSelectedStocks([]); // Clear previous stocks
    if (category === "shortTerm") {
      processData(); // Fetch data only for Slow Accumulation
    }
  };

  const satisfiesLogic = (apiData) => {
    if (!apiData.data || !apiData.data.candles) return false;

    if (apiData.data.candles.length < 360) return false;

    const avg90day = apiData.data.candles
      .slice(0, 90)
      .reduce((sum, candle) => sum + (parseFloat(candle[5]) || 0), 0) / 90;

    const avg360day = apiData.data.candles
      .slice(90, 360)
      .reduce((sum, candle) => sum + (parseFloat(candle[5]) || 0), 0) / 270;

    return avg90day > 2 * avg360day;
  };

/*   const fetchData = async (instrument_key) => {
    if (!instrument_key) {
      console.error("Invalid instrument key:", instrument_key);
      return null;
    }

    const currentDate = new Date();
    const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const url = `https://api.upstox.com/v2/historical-candle/${instrument_key}/day/${dateString}/2015-09-06`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiI4TEFQNkgiLCJqdGkiOiI2NmVkOGY0MjQ2ZTQwNTBkMGY1ODg5OGYiLCJpc011bHRpQ2xpZW50IjpmYWxzZSwiaWF0IjoxNzI2ODQ0NzM4LCJpc3MiOiJ1ZGFwaS1nYXRld2F5LXNlcnZpY2UiLCJleHAiOjE3MjY4Njk2MDB9.VKOOBM1hbFPsjSfD_O7ec2pqTVGblM0auQ2xKcDtuuk', // Replace with your actual token
        },
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching data for ${instrument_key}:`, error);
      return null;
    }
  }; */

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed, so +1
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`; // Returns date as YYYY-MM-DD
  };

  const fetchData = async (instrument_key) => {
    if (!instrument_key) {
      console.error("Invalid instrument key:", instrument_key);
      return null;
    }


    const currentDate = new Date();
    const dateString = formatDate(currentDate);
    const url = `https://api.upstox.com/v2/historical-candle/${instrument_key}/day/${dateString}/2015-09-06`;

    const headers = {
      Accept: "application/json",
      Authorization:"Bearer" +token,
    };

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching data for ${instrument_key}:`, error);
      return null;
    }
  };
  const rateLimitConfig = {
    maxRequestsPerSecond: 25,
    maxRequestsPerMinute: 250,
    maxRequestsPer30Minutes: 1000,
    backoffInitialDelay: 1000, // in ms (1 second)
    backoffMaxDelay: 60000, // in ms (60 seconds)
  };

  // Function to handle the exponential backoff
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Track requests made in the last second and minute
  let requestsInLastSecond = 0;
  let requestsInLastMinute = 0;
  let requestsInLast30Minutes = 0;

  const trackRequests = () => {
    requestsInLastSecond += 1;
    requestsInLastMinute += 1;
    requestsInLast30Minutes += 1;

    // Reset counters after each time window
    setTimeout(() => (requestsInLastSecond -= 1), 1000); // Reset every second
    setTimeout(() => (requestsInLastMinute -= 1), 60000); // Reset every minute
    setTimeout(() => (requestsInLast30Minutes -= 1), 1800000); // Reset every 30 minutes
  };



  const canMakeRequest = () => {
    return (
      requestsInLastSecond < rateLimitConfig.maxRequestsPerSecond &&
      requestsInLastMinute < rateLimitConfig.maxRequestsPerMinute &&
      requestsInLast30Minutes < rateLimitConfig.maxRequestsPer30Minutes
    );
  };

  const fetchDataWithRateLimit = async (instrument_key, attempt = 0) => {
    if (!canMakeRequest()) {
      await wait(1000);
      return fetchDataWithRateLimit(instrument_key, attempt);
    }

    try {
      trackRequests();
      const apiData = await fetchData(instrument_key);
      return apiData;
    } catch (error) {
      if (error.status === 429) {
        const delay = Math.min(
          rateLimitConfig.backoffInitialDelay * 2 ** attempt,
          rateLimitConfig.backoffMaxDelay
        );
        console.log(`Rate limit hit. Backing off for ${delay / 1000} seconds.`);
        await wait(delay);
        return fetchDataWithRateLimit(instrument_key, attempt + 1);
      } else {
        console.error(`Failed to fetch data for ${instrument_key}:`, error);
        return null;
      }
    }
  };

  // Call fetchDataWithRateLimit for each stock

const processData = async () => {
  setLoading(true); // Set loading to true when fetching starts
  const nameArray = [];

  for (const stock of datas) {
    const { instrument_key, name, segment } = stock;

    if (segment !== "BSE_EQ") continue;

    // Fetch data with rate limiting
    const apiData = await fetchDataWithRateLimit(instrument_key);

    if (apiData && satisfiesLogic(apiData)) {
      nameArray.push(name);

      // Dynamically update the state with the new stock
      setSelectedStocks((prevStocks) => [...prevStocks, name]);
    }
  }

  setLoading(false); // Set loading to false when fetching is complete
};


  useEffect(() => {
    processData();
  }, []);

  useEffect(() => {
    if (loading || selectedStocks.length === 0) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [loading, selectedStocks]);

  const indexOfLastStock = Math.min(
    currentPage * stocksPerPage,
    selectedStocks.length
  );
  const indexOfFirstStock = (currentPage - 1) * stocksPerPage;
  const currentStocks = selectedStocks.slice(
    indexOfFirstStock,
    indexOfLastStock
  );

  // Handle the Next Page button click
  const nextPage = () => {
    if (currentPage < Math.ceil(selectedStocks.length / stocksPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToFirstPage = () => setCurrentPage(1);

  return (
    <div className="body w-screen min-h-screen overflow-y-auto flex items-center justify-start text-black flex-col absolute">
      <div className="w-screen h-[25rem]  border-none rounded-b-[6rem] overflow-hidden">
        <video
          className="w-full h-full object-cover"
          loop
          muted
          controls={false}
          autoPlay
        >
          <source src={myVideo7} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      <div className=" flex flex-col absolute top-[10rem] right-4 ">
        <div className="flex justify-center items-center leading-8 gap-2 animate-bounce">
          <span className="text-[2.55rem] text-white font-semibold text-justify">
            Find the right pick with
          </span>
          <span className="text-[2.55rem] text-orange-300 font-semibold">
            Stock Screener
          </span>
        </div>

        <div className="flex items-center justify-center">
          <span className="text-lg text-white font-normal">
            All the tools you need to make wise & effective investment decisions
          </span>
        </div>

        <div className="flex items-center justify-center mt-6">
          <button className="flex absolute items-center justify-center h-8 w-40 bg-white rounded-2xl">
            <span className="font-semibold text-sm ">Start Screening</span>
          </button>
        </div>
      </div>

      <div className="h-64 bg-gray-100 rounded-3xl flex flex-col fade-in-up z-100 absolute top-[21rem]">
        <div className="mt-2 ml-6 mb-2">
          <span className="text-3xl text-gray-800 font-semibold">
            Popular Screens
          </span>
        </div>
        <div className="flex mx-6 gap-5">
          <button
            className="flex flex-col justify-start h-48 w-56 bg-white rounded-3xl border-[1px] border-solid border-gray-300 shadow-md hover:shadow-gray-400"
            onClick={() => handleButtonClick("longTerm")}
          >
            <div className="m-2">
              <div className="flex font-bold text-4xl text-green-600">
                <TbTriangleFilled />
              </div>
              <div className="flex mt-4  font-medium text-xl ">
                <span>Long-Term Gainers</span>
              </div>
              <div className=" flex h-5 w-52 border-solid border-[1px] border-gray-300 rounded-xl l mt-2">
                <span className="font-extralight ml-1 text-[0.8rem]">
                  5Y revenue growth , ROCE
                </span>
                <span className="ml-1 text-gray-400 font-semibold text-[0.8rem]">
                  +6 more
                </span>
              </div>
              <div className="flex mt-2">
                <span className="flex text-gray-800 text-left text-sm">
                  Investment strategy that involves selecting high-quality
                  stocks and holding them for a long time.
                </span>
              </div>
            </div>
          </button>

          <button
            className="flex flex-col justify-start h-48 w-56 bg-white rounded-3xl border-[1px] border-solid border-gray-300 shadow-md hover:shadow-gray-400"
            onClick={() => handleButtonClick("top10")}
          >
            <div className="m-2">
              <div className="flex font-bold text-3xl text-yellow-400">
                <FaAsterisk />
              </div>
              <div className="flex mt-4  font-medium text-xl ">
                <span>Top 10 Gainers</span>
              </div>
              <div className=" flex h-5 w-52 border-solid border-[1px] border-gray-300 rounded-xl l mt-2">
                <span className="font-extralight ml-1 text-[0.8rem]">
                  EPS , P/E Ratio , ROE
                </span>
                <span className="ml-1 text-gray-400 font-semibold text-[0.8rem]">
                  +4 more
                </span>
              </div>
              <div className="flex mt-2">
                <span className="flex text-gray-800 text-left text-sm">
                  These stocks can offer significant short- term trading
                  opportunities.
                </span>
              </div>
            </div>
          </button>

          <button
            className="flex flex-col justify-start h-48 w-56 bg-white rounded-3xl border-[1px] border-solid border-gray-300 shadow-md hover:shadow-gray-400"
            onClick={() => handleButtonClick("shortTerm")}
          >
            <div className="m-2">
              <div className="flex font-bold text-3xl text-red-700">
                <PiHourglassLowFill />
              </div>
              <div className="flex mt-4  font-medium text-xl ">
                <span>Slow Accumulation</span>
              </div>
              <div className=" flex  h-5 w-52 border-solid border-[1px] border-gray-300 rounded-xl l mt-2">
                <span className="font-extralight ml-1 text-[0.8rem]">
                  D/E Ratio , volume
                </span>
                <span className="ml-1 text-gray-400 font-semibold text-[0.8rem]">
                  +4 more
                </span>
              </div>
              <div className="flex mt-2">
                <span className="flex text-gray-800 text-left text-sm">
                  Slow accumulation stocks are characterized by strong
                  fundamentals and steady growth.
                </span>
              </div>
            </div>
          </button>

          <button className="flex flex-col justify-start h-48 w-56 bg-white rounded-3xl border-[1px] border-solid border-gray-300 shadow-md hover:shadow-gray-400">
            <div className="m-2">
              <div className="flex font-bold text-3xl text-blue-600">
                <GiSlowBlob />
              </div>
              <div className="flex mt-4  font-medium text-xl ">
                <span>Near 52W Low</span>
              </div>
              <div className=" flex  h-5 w-52 border-solid border-[1px] border-gray-300 rounded-xl l mt-2">
                <span className="font-extralight ml-1 text-[0.8rem]">
                  D/E Ratio , dividend yield
                </span>
                <span className="ml-1 text-gray-400 font-semibold text-[0.8rem]">
                  +3 more
                </span>
              </div>
              <div className="flex mt-2">
                <span className="flex text-gray-800 text-left text-sm">
                  These stocks may be undervalued due to temporary market
                  corrections.
                </span>
              </div>
            </div>
          </button>
        </div>

        {selectedCategory && selectedStocks.length > 0 && (
          <div className="table-container">
            <table className="styled-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {currentStocks.map((stock, index) => (
                  <tr key={index}>
                    <td>{indexOfFirstStock + index + 1}</td>
                    <td>{stock}</td>
                  </tr>
                ))}
              </tbody>                                                                            
            </table>
            <div className="pagination">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className="previous"
                >
                  Previous
                </button>
                <button
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                  className="first"
                >
                  First Page
                </button>
                <span className="mb-20">Page {currentPage}</span>
                <button
                  onClick={nextPage}
                  disabled={
                    currentPage === Math.ceil(selectedStocks.length / stocksPerPage)
                  }
                  className="next"
                >
                  Next
                </button>
              </div>
          </div>
        )}
      </div>
    </div>
  );
}
