import React, { useState, useEffect, useCallback, useRef } from "react";
import { RxHamburgerMenu } from "react-icons/rx";
import { CgProfile } from "react-icons/cg";
import { MdOutlineNotificationAdd } from "react-icons/md";
import { FaCaretUp } from "react-icons/fa";
import { FaCaretDown } from "react-icons/fa";
import logo from "./logo1.jpg";
import "./style.css";
import { CiSearch } from "react-icons/ci";
import datas from "./Datas.json";
import debounce from "debounce";
import proto from "./marketDataFeed.proto";
import { Buffer } from "buffer";
import login from "./Login.png";
import Register from "./register";

const protobuf = require("protobufjs");

let protobufRoot = null;
const initProtobuf = async () => {
  protobufRoot = await protobuf.load(proto);
  console.log("Protobuf part initialization complete");
};

// Function to get WebSocket URL
const getUrl = async (token) => {
  const apiUrl = "https://api-v2.upstox.com/feed/market-data-feed/authorize";
  let headers = {
    "Content-type": "application/json",
    Authorization: "Bearer " + token,
  };
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: headers,
  });
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  const res = await response.json();
  return res.data.authorizedRedirectUri;
};

// Helper functions for handling Blob and ArrayBuffer
const blobToArrayBuffer = async (blob) => {
  if ("arrayBuffer" in blob) return await blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject();
    reader.readAsArrayBuffer(blob);
  });
};

// Decode Protobuf messages
const decodeProfobuf = (buffer) => {
  if (!protobufRoot) {
    console.warn("Protobuf part not initialized yet!");
    return null;
  }
  const FeedResponse = protobufRoot.lookupType(
    "com.upstox.marketdatafeeder.rpc.proto.FeedResponse"
  );
  return FeedResponse.decode(buffer);
};

export default function Navbar({ token }) {
  useEffect(() => {
    document.body.style.backgroundColor = "white";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  const [isConnected, setIsConnected] = useState(false);
  const [feedData, setFeedData] = useState([]);
  const [price1, setPrice1] = useState([]);
  const [price2, setPrice2] = useState([]);
  const [price3, setPrice3] = useState([]);
  const [searchFeed, setSearchFeed] = useState({});
  const [results, setResults] = useState([]);
  const [input, setInput] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);

  // Establish WebSocket connection
  useEffect(() => {
    const connectWebSocket = async (token) => {
      try {
        const wsUrl = await getUrl(token);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
          console.log("Connected");

          // Extract all instrument keys from Datas.json
          const selectedInstrumentKeys = [
            "NSE_INDEX|Nifty 50", // Replace with your desired instrument key
            "NSE_INDEX|Nifty Bank", // Replace with your desired instrument key
            "BSE_INDEX|SENSEX", // Replace with your desired instrument key
          ];

          const Instrument_Keys = results.map((stock) => stock.instrument_key);
          // const combinedInstrumentKeys = selectedInstrumentKeys.concat(Instrument_Keys);

          const data = {
            guid: "someguid",
            method: "sub",
            data: {
              mode: "full",
              instrumentKeys: selectedInstrumentKeys, // Subscribe to all 5000+ stocks
            },
          };
          const data2 = {
            guid: "someguid",
            method: "sub",
            data: {
              mode: "full",
              instrumentKeys: Instrument_Keys, // Subscribe to all 5000+ stocks
            },
          };

          ws.send(Buffer.from(JSON.stringify(data)));
          ws.send(Buffer.from(JSON.stringify(data2)));
        };

        ws.onclose = () => {
          setIsConnected(false);
          console.log("Disconnected");
        };

        ws.onmessage = async (event) => {
          const arrayBuffer = await blobToArrayBuffer(event.data);
          let buffer = Buffer.from(arrayBuffer);
          let response = decodeProfobuf(buffer);

          // Access the ltp from the feeds
          const feeds = response.feeds;
          console.log(feeds);
          const updatedResults = results.map((stock) => {
            const data = feeds[`${stock.instrument_key}`];
            if (data && data.ff && data.ff.marketFF && data.ff.marketFF.ltpc) {
              const lastPrice = data.ff.marketFF.ltpc.ltp || "N/A";
              console.log(lastPrice);
              return {
                ...stock,
                lastPrice,
              };
            } else {
              console.warn(
                `No LTP found for instrument: ${stock.instrument_key}`
              );
              return stock;
            }
          });
          setResults(updatedResults); // Update the state with the new results containing last prices

          console.log("Updated Results with LTP:", updatedResults);

          if (
            feeds &&
            feeds["BSE_INDEX|SENSEX"] &&
            feeds["NSE_INDEX|Nifty 50"] &&
            feeds["NSE_INDEX|Nifty Bank"]
          ) {
            const price1 = feeds["NSE_INDEX|Nifty 50"].ff.indexFF.ltpc.ltp;
            const price2 = feeds["NSE_INDEX|Nifty Bank"].ff.indexFF.ltpc.ltp;
            const price3 = feeds["BSE_INDEX|SENSEX"].ff.indexFF.ltpc.ltp;
            console.log("Last Traded Price (LTP):", price1);
            console.log("Last Traded Price (LTP):", price2);
            console.log("Last Traded Price (LTP):", price3);
            // Set the price state with the ltp value
            setPrice1(price1);
            setPrice2(price2);
            setPrice3(price3);
          }

          Object.keys(searchFeed).forEach((key) => {
            if (feeds[key]) {
              setSearchFeed((prev) => ({
                ...prev,
                [key]: feeds[key].ff.indexFF.ltp,
              }));
            }
          });

          setFeedData((currentData) => [
            ...currentData,
            JSON.stringify(response),
          ]);
        };

        ws.onerror = (error) => {
          setIsConnected(false);
          console.log("WebSocket error:", error);
        };

        return () => ws.close();
      } catch (error) {
        console.error("WebSocket connection error:", error);
      }
    };

    initProtobuf();
    connectWebSocket(token);
  }, [token, searchFeed]);

  /* const headers = {
    Accept: "application/json",
    Authorization:"Bearer eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiI4TEFQNkgiLCJqdGkiOiI2NmYzOThmZGJiNzEyOTRmYWJhODFjYTMiLCJpc011bHRpQ2xpZW50IjpmYWxzZSwiaWF0IjoxNzI3MjQwNDQ1LCJpc3MiOiJ1ZGFwaS1nYXRld2F5LXNlcnZpY2UiLCJleHAiOjE3MjczMDE2MDB9.btofJVTC6NOfqlWLnCww9KBGWXw1hpBRLwSZRc5tghM",
  } */

  const fetchData = useCallback(
    debounce((value) => {
      const filteredResults = datas.filter((stock) => {
        return (
          value &&
          stock &&
          ((stock.name &&
            stock.name.toLowerCase().startsWith(value.toLowerCase())) ||
            (stock.trading_symbol &&
              stock.trading_symbol
                .toLowerCase()
                .startsWith(value.toLowerCase())))
        );
      });

      console.log(filteredResults);

      const instrumentKeys = filteredResults.map(
        (stock) => `${stock.segment}|${stock.trading_symbol}`
      );
      setResults(filteredResults);

      setSearchFeed((prev) => {
        let newFeed = {};
        instrumentKeys.forEach((key) => {
          if (!prev[key]) newFeed[key] = null;
        });
        return { ...prev, ...newFeed };
      });
    }, 300),
    []
  );

  const handleChange = (value) => {
    setInput(value);
    fetchData(value);
  };

  const handleSearch = (event) => {
    event.preventDefault();

    if (input && !recentSearches.includes(input)) {
      setRecentSearches([input, ...recentSearches]);
    }
    setInput("");
    setResults([]);
  };

  const handleResultClick = (search) => {
    setInput(`${search.name} (${search.trading_symbol})`);
    setResults([]);
  };

  const isFO = (symbol) => {
    return (
      symbol.includes("CE") || symbol.includes("PE") || symbol.includes("FUT")
    );
  };

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null); // Create a reference for the dropdown

  // Toggle the dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen((prevState) => !prevState);
  };

  // Close the dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false); // Close the dropdown if clicking outside
      }
    };

    // Add event listener when the dropdown is open
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    // Clean up event listener on unmount
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <div className=" navbar flex items-center justify-between px-5 w-screen bg-zinc-900 sticky">
      <div className="flex items-center gap-5 h-14 w-64 text-3xl text-white z-0">
        <div>
          <RxHamburgerMenu />
          <div className="text-white"></div>
        </div>
        <div className="flex items-center">
          <div className="flex items-center gap-1">
            <span className="font-bold ">EagleView</span>
            <span className="text-xs flex items-center mb-5">IN</span>
          </div>
          <div>
            <img src={logo} className="h-10 ml-2" />
          </div>
        </div>
      </div>

      <div className="flex flex-row items-center justify-center w-[440px] text-white ml-2">
        <form onSubmit={handleSearch} className="search-box">
          <div>
            <div className="flex items-center justify-center gap-4 ">
              <div className="flex gap-5 items-center justify-center h-10 pl-4 rounded-3xl border-solid border-[1px] w-96">
                <input
                  type="text"
                  placeholder="Search stocks , mutual funds , ETCs etc."
                  value={input}
                  onChange={(e) => handleChange(e.target.value)}
                  className="search-input focus:outline-none border-none w-96"
                />
                <button
                  type="submit"
                  className="h-10  bg-zinc-900 w-14 flex items-center justify-center rounded-r-3xl border-solid border-[1px]"
                >
                  <CiSearch className="text-3xl" />
                </button>
                {results.length > 0 && (
                  <div className="search-dropdown rounded-3xl">
                    <ul className="flex flex-col">
                      {results.map((search, index) => (
                        <li
                          key={index}
                          onClick={() => handleResultClick(search)}
                          className="flex flex-col"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm">
                              {search.name}
                            </span>
                            <span className="font-medium text-sm">
                              {search.lastPrice}
                            </span>
                          </div>
                          <span className="text-gray-700 text-sm flex flex-row gap-1">
                            <div>{search.trading_symbol}</div>
                            <button className="flex-row h-5 w-12 bg-orange-100 rounded-3xl mt-0">
                              <span className="flex items-center justify-center text-orange-500 text-xs font-medium">
                                {isFO(search.trading_symbol) ? "F&O" : "Stock"}
                              </span>
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="flex items-center justify-center text-white">
        <form>
          <div className="flex items-center justify-center gap-4 font-bold">
            <button className="flex-row h-10 w-20 hover:bg-zinc-700 rounded-3xl mt-0">
              <span className="flex items-center justify-center font-bold leading-5">
                Market Watch
              </span>
            </button>

            <button className="flex-row h-10 w-20 hover:bg-zinc-700 rounded-3xl mt-0">
              <span className="flex items-center justify-center">Screener</span>
            </button>
            <button className="flex-row h-10 w-24 hover:bg-zinc-700 rounded-3xl leading-5 mt-0">
              <span className="flex items-center justify-center">Nifty 50</span>
              <span className=" flex justify-center items-center text-xs font-bold text-green-600">
                {price1}
                <FaCaretUp className=" h-4" />
              </span>
            </button>
            <button className="flex-row h-10 w-24 hover:bg-zinc-700 rounded-3xl leading-5 mt-0">
              <span className="flex items-center justify-center">
                Bank Nifty
              </span>
              <span className=" flex justify-center items-center text-xs font-bold text-red-600">
                {price2}
                <FaCaretDown className=" h-4" />
              </span>
            </button>
            <button className="flex-row h-10 w-24 hover:bg-zinc-700 rounded-3xl leading-5 mt-0">
              <span className="flex items-center justify-center">Sensex</span>
              <span className=" flex justify-center items-center text-xs font-bold text-green-600">
                {price3}
                <FaCaretUp className=" h-4" />
              </span>
            </button>
            <button className="flex-row h-10 w-24 hover:bg-zinc-700 rounded-3xl leading-4 mt-0">
              <span className="flex items-center justify-center">
                Watchlist
              </span>
              <span className="text-xs font-thin">Add/Remove</span>
            </button>
          </div>
        </form>
      </div>

      <div className="flex items-center justify-center gap-10 text-white">
        <div className="text-3xl">
          <MdOutlineNotificationAdd />
        </div>
        <button onClick={toggleDropdown}>
          <div className="flex-row items-center justify-center text-2xl mb-0 h-10 w-24 bg-white rounded-3xl">
            <CgProfile className="flex ml-8 justify-center items-center text-black" />
            <span className="font-light text-xs flex justify-center text-black">
              Login/SignUp
            </span>
          </div>
        </button>
        {isDropdownOpen && (
          <>
            <div className="overlay fixed top-0 left-0 w-full h-full bg-zinc-900 opacity-50 z-10"></div>
            <div
              ref={dropdownRef}
              className="dropdown-menu absolute right-[30rem] top-[25vh] h-80 w-[40rem]
           bg-white shadow-2xl rounded-3xl p-[10px] z-50 animate-slide-down flex items-center gap-2"
            >
              <div>
                <img src={login} className="h-[19rem] " />
              </div>
              <div className="bg-gray-100 h-[18rem] w-80 text-black rounded-3xl shadow-xl shadow-gray-400 mr-2">
                <div className="flex mt-5 ml-2">
                  <span className="text-3xl font-bold">EagleView</span>
                  <div>
                    <img src={logo} className="h-8 ml-2" />
                  </div>
                </div>

                <div className="ml-2 mt-6">
                  <span className="font-medium text-gray-800">Enter your phone number</span>
                </div>

                <div className="flex items-center justify-between mt-2 gap-2">
                  <div className="h-10 w-16 border-2 border-solid border-gray-300 rounded-lg ml-2">
                    <input type="text" placeholder="+91" className="w-16 h-10 focus:outline-none px-3"/>
                  </div>
                  <div className="h-10 w-52 border-2 border-solid border-gray-300 rounded-lg mr-4">
                    <input type="text" placeholder="Phone number" className="w-52 h-10 focus:outline-none px-2"/>
                  </div>
                </div>

                <button className=" flex items-center justify-center mt-3 h-10 w-72 bg-black rounded-lg ml-2 mr-4">
                  <span className="text-white font-medium ">Get OTP</span>
                </button>

                <div className="mt-2 ml-2 mr-4">
                  <span className="text-[0.8rem] text-gray-700 ">By logging in, you agree to our <button className="text-blue-800">Terms & Conditions</button></span>
                </div>

                <div className="flex flex-row items-center justify center ml-2 mr-4 mt-2 gap-3 leading-3">
                  <div >
                    <input type="checkbox" className="h-5 w-5"/>
                  </div>
                  <div >
                    <span className="text-xs">You agree to receive investment, SIP & other updates on WhatsApp</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
