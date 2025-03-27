import React, { useEffect, useState, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import datas from "../components/filtered_unique_datas.json";
import "./watchlist.css";
import proto from "../components/marketDataFeed.proto";
import { Buffer } from "buffer";
import debounce from "debounce";
import axios from "axios";
import { FaPlus } from "react-icons/fa6";
import { RxCross2 } from "react-icons/rx";
import { faBookmark as solidBookmark } from "@fortawesome/free-solid-svg-icons"; // Solid icon
import { faBookmark as outlineBookmark } from "@fortawesome/free-regular-svg-icons"; // Outline icon
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { auth, db } from "../components/firebase-config";
import { doc, getDoc } from "firebase/firestore";
import Profile from "../components/profile";
import Register from "../components/register";
import login from "../components/Login.png";

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

const fetchWatchlist = async (uid, setWatchlist, setError, setLoading) => {
  try {
    setLoading(true);
    const response = await axios.get(
      `http://localhost:4000/api/watchlist/${uid}`
    );
    setWatchlist(response.data.watchlist);
  } catch (err) {
    console.error("Error fetching watchlist:", err);
    if (err.response && err.response.status === 404) {
      setError("User not found or no watchlist available.");
    } else {
      setError("Failed to load the watchlist.");
    }
  } finally {
    setLoading(false);
  }
};

export default function Watchlist({ auth_token }) {
  const [isConnected, setIsConnected] = useState(false);
  const [feedData, setFeedData] = useState([]);
  const [results, setResults] = useState([]);
  const [searchFeed, setSearchFeed] = useState({});
  const [showCheckbox, setShowCheckbox] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStocks, setSelectedStocks] = useState({}); // Track selected stocks
  const stocksPerPage = 10;
  const [searchTerm, setSearchTerm] = useState(""); // New state for search term
  const [filteredSearchResults, setFilteredSearchResults] = useState([]); // New state for filtered results
  const [uid, setUid] = useState(null);
  const [message, setMessage] = useState("");
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null); // Create a reference for the dropdown
  const [userDetails, setUserDetails] = useState(null);
  const [hasRegistered, setHasRegistered] = useState(false);

  useEffect(() => {
    setResults(datas);
  }, []);

  useEffect(() => {
    // Update filteredSearchResults whenever results or searchTerm changes
    const searchResults = results.filter(
      (stock) =>
        stock.name.toLowerCase().startsWith(searchTerm.toLowerCase()) ||
        stock.trading_symbol.toLowerCase().startsWith(searchTerm.toLowerCase())
    );
    setFilteredSearchResults(searchResults);
  }, [results, searchTerm]);

  const toggleCheckboxMode = () => {
    setShowCheckbox((prev) => !prev);
  };

  const handleCheckboxChange = (stock, checked) => {
    setSelectedStocks((prev) => {
      const newSelectedStocks = { ...prev };
      if (checked) {
        // Add the selected stock with all details
        newSelectedStocks[stock.instrument_key] = {
          stockSymbol: stock.trading_symbol,
          stockKey: stock.instrument_key,
          stockName: stock.name,
          lastPrice: stock.lastPrice,
          openPrice: stock.openPrice,
          low: stock.low,
          high: stock.high,
          one_day_change: stock.one_day_change,
          price_change: stock.price_change,
        };
      } else {
        // Remove the stock if unchecked
        delete newSelectedStocks[stock.instrument_key];
      }
      console.log("Selected Stocks:", newSelectedStocks); // Console the selected stocks
      return newSelectedStocks;
    });
  };

  const isStockSelected = (instrumentKey) => !!selectedStocks[instrumentKey];

  const anyStockSelected = Object.values(selectedStocks).some(
    (isSelected) => isSelected
  );

  useEffect(() => {
    // Check for user authentication status
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUid(user.uid); // Get the UID from the authenticated user
      } else {
        setUid(null); // User is not authenticated
      }
    });

    return () => unsubscribe(); // Clean up subscription on unmount
  }, []);

  useEffect(() => {
    if (uid) {
      fetchWatchlist(uid, setWatchlist, setError, setLoading);
    }
  }, [uid]);

  const handleSubmit = async () => {
    if (!uid) {
      setMessage("User is not authenticated.");
      setIsDropdownOpen(true);
      return;
    }

    const selectedStockArray = Object.values(selectedStocks);
    if (selectedStockArray.length === 0) {
      alert("No stocks selected.");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:4000/api/watchlist/add",
        { uid, stocks: selectedStockArray },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200) {
        alert("Stocks added to watchlist successfully!");
        fetchWatchlist(uid, setWatchlist, setError, setLoading); // Refresh watchlist
      } else {
        alert("Failed to add stocks to watchlist.");
      }
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      alert("An error occurred while adding stocks to watchlist.");
    }

    setSelectedStocks([]);
  };
  const removeStockFromWatchlist = async (instrumentKey) => {
    console.log("Removing stock:", { uid, instrumentKey });

    // Optimistically remove the stock from the UI
    setWatchlist((prevWatchlist) =>
      prevWatchlist.filter((stock) => stock.stockKey !== instrumentKey)
    );

    try {
      // Send the delete request to the backend
      const response = await axios.delete(
        `http://localhost:4000/api/watchlist/remove`,
        {
          data: { uid, instrumentKey }, // Send data in body for DELETE request
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status === 200) {
        console.log(`Stock with key ${instrumentKey} removed from server.`);
      } else {
        throw new Error("Failed to remove stock from server.");
      }
    } catch (error) {
      console.error(
        "Error removing stock:",
        error.response?.data || error.message
      );
      alert("Failed to remove stock from watchlist.");

      // Optional rollback: Re-add the stock if the backend request fails
      setWatchlist((prevWatchlist) => [
        ...prevWatchlist,
        { instrumentKey }, // Re-add stock if the delete fails
      ]);
    }
  };

  useEffect(() => {
    const connectWebSocket = async (token) => {
      try {
        const wsUrl = await getUrl(token);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
          console.log("Connected");

          const Instrument_Keys = results.map((stock) => stock.instrument_key);

          const data = {
            guid: "someguid",
            method: "sub",
            data: {
              mode: "full",
              instrumentKeys: Instrument_Keys, // Subscribe to all 5000+ stocks
            },
          };
          ws.send(Buffer.from(JSON.stringify(data)));
        };

        ws.onclose = () => {
          setIsConnected(false);
          console.log("Disconnected");
        };

        ws.onmessage = async (event) => {
          try {
            const arrayBuffer = await blobToArrayBuffer(event.data);
            const buffer = Buffer.from(arrayBuffer);
            const response = decodeProfobuf(buffer);

            // Ensure response and feeds are valid
            if (!response || !response.feeds) {
              console.warn("Invalid response or feeds missing:", response);
              return; // Exit early if response is invalid
            }

            const feeds = response.feeds;
            console.log("Received Feeds:", feeds);

            const updatedResults = results.map((stock) => {
              const data = feeds[stock.instrument_key]; // Safely access feed data

              if (data && data.ff) {
                const lastPrice = data.ff.marketFF?.ltpc?.ltp || NaN;
                const closePrice = data.ff.marketFF?.ltpc?.cp || NaN;

                const openPrice = parseFloat(
                  data.ff.marketFF?.marketOHLC?.ohlc?.[0]?.open || NaN
                );
                const high = parseFloat(
                  data.ff.marketFF?.marketOHLC?.ohlc?.[0]?.high || NaN
                );
                const low = parseFloat(
                  data.ff.marketFF?.marketOHLC?.ohlc?.[0]?.low || NaN
                );

                const one_day_change =
                  !isNaN(lastPrice) && !isNaN(closePrice) && closePrice !== 0
                    ? ((lastPrice - closePrice) / closePrice) * 100
                    : NaN;

                const price_change =
                  !isNaN(lastPrice) && !isNaN(closePrice)
                    ? lastPrice - closePrice
                    : NaN;

                return {
                  ...stock,
                  lastPrice: isNaN(lastPrice) ? "N/A" : lastPrice.toFixed(2),
                  openPrice: isNaN(openPrice) ? "N/A" : openPrice.toFixed(2),
                  low: isNaN(low) ? "N/A" : low.toFixed(2),
                  high: isNaN(high) ? "N/A" : high.toFixed(2),
                  one_day_change: isNaN(one_day_change)
                    ? "N/A"
                    : one_day_change.toFixed(2),
                  price_change: isNaN(price_change)
                    ? "N/A"
                    : price_change.toFixed(2),
                };
              } else {
                console.warn(
                  `No valid data found for instrument: ${stock.instrument_key}`
                );
                return {
                  ...stock,
                  lastPrice: "N/A",
                  openPrice: "N/A",
                  low: "N/A",
                  high: "N/A",
                  one_day_change: "N/A",
                  price_change: "N/A",
                };
              }
            });

            setResults(updatedResults);
            console.log(
              "Updated Results with Prices and Change:",
              updatedResults
            );
          } catch (error) {
            console.error("Error processing WebSocket message:", error);
          }
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
    connectWebSocket(auth_token);
  }, [auth_token, searchFeed]);

  const fetchData = useCallback(
    debounce((value) => {
      const instrumentKeys = datas.map(
        (stock) => `${stock.segment}|${stock.trading_symbol}`
      );

      setSearchFeed((prev) => {
        let newFeed = {};
        instrumentKeys.forEach((key) => {
          if (!prev[key]) newFeed[key] = null;
        });
        return { ...prev, ...newFeed };
      });

      console.log("Fetched instrument keys:", instrumentKeys);
    }, 300),
    []
  );
  useEffect(() => {
    console.log("Initial Results:", results);
    fetchData();
  }, []);

  const filteredResults = (
    filteredSearchResults.length > 0 ? filteredSearchResults : results
  ).filter((stock) => stock.lastPrice !== "N/A" && stock.openPrice !== "N/A");

  const indexOfLastStock = Math.min(
    currentPage * stocksPerPage,
    filteredResults.length
  );
  const indexOfFirstStock = (currentPage - 1) * stocksPerPage;
  const currentStocks = filteredResults.slice(
    indexOfFirstStock,
    indexOfLastStock
  );

  // Handle the Next Page button click
  const nextPage = () => {
    if (currentPage < Math.ceil(filteredResults.length / stocksPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToFirstPage = () => setCurrentPage(1);

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
    <div>
      <Navbar token={auth_token} />
      <div className="watchlist-container">
        <div className="flex flex-row items-start justify-center gap-24 mx-20 text-black ">
          <div>
            <div className="h-44 w-64 border-[1px] border-solid border-gray-300 p-0 ml-2 mt-[4.5rem]">
              <div className=" flex flex-col h-24 bg-gray-100 leading-4">
                <span className="font-medium m-2 text-base">Equity</span>
                <span className="mx-2 text-sm text-gray-500">
                  Looks like you don't have any Watchlist here !
                </span>
              </div>
              <div>
                <div className=" flex flex-row items-center justify-start h-10 w-64 border-b-[1px] border-t-[1px] border-solid border-gray-300 font-medium px-2 gap-2">
                  <FaPlus className="flex items-center justify-center" />
                  <span className=" flex items-center justify-center text-gray-800">
                    {" "}
                    Create Equity Watchlist
                  </span>
                </div>
              </div>
              <div className=" flex flex-row items-center justify-start h-10 w-64 border-b-[1px] border-t-[1px] border-solid border-gray-300 font-medium px-2 gap-2">
                <span className=" flex items-center justify-center text-gray-800">
                  {" "}
                  Mutual Funds
                </span>
              </div>
            </div>

            <div className="watchlist">
              <h2>Your Watchlist</h2>
              {watchlist.length === 0 ? (
                <p>No stocks added to your watchlist yet.</p>
              ) : (
                <ul>
                  {watchlist.map((stock, index) => (
                    <li key={index}>
                      <strong>{stock.stockName}</strong>
                      <button
                        className="ml-5"
                        onClick={() => removeStockFromWatchlist(stock.stockKey)}
                      >
                        <RxCross2 />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="text-black m-4">
            <div className="watchlist-container">
              <h2 className="watchlist-title">Stocks Watchlist</h2>
              <input
                type="text"
                placeholder="Search Stocks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-4 p-2 border border-gray-300 rounded focus:outline-none"
              />

              <table className="stocks-table">
                <thead>
                  <tr>
                    <th>
                      <button onClick={toggleCheckboxMode}>+</button>
                    </th>
                    <th>Name</th>
                    <th>Stock Type</th>
                    <th>Current Price</th>
                    <th>One day Change</th>
                    <th>1D Low</th>
                    <th>1D High</th>
                  </tr>
                </thead>
                <tbody>
                  {currentStocks.map((stock, index) => {
                    const isChecked = isStockSelected(stock.instrument_key); // Place it here

                    return (
                      <tr key={index}>
                        <td>
                          {showCheckbox ? (
                            <FontAwesomeIcon
                              icon={isChecked ? solidBookmark : outlineBookmark}
                              size="lg"
                              style={{ color: isChecked ? "gold" : "gray" }}
                              onClick={() =>
                                handleCheckboxChange(stock, !isChecked)
                              } // Toggle stock
                            />
                          ) : (
                            indexOfFirstStock + index + 1
                          )}
                        </td>
                        <td>{stock.name}</td>
                        <td>
                          {stock.segment === "BSE_EQ" ||
                          stock.segment === "NSE_EQ"
                            ? "EQUITY"
                            : "F/O"}
                        </td>
                        <td>₹{stock.lastPrice}</td>
                        <td
                          className={
                            stock.one_day_change < 0 ? "negative" : "positive"
                          }
                        >
                          {stock.price_change} (
                          {stock.one_day_change > 0
                            ? `+${stock.one_day_change}%`
                            : `${stock.one_day_change}%`}
                          )
                        </td>
                        <td>₹{stock.low}</td>
                        <td>₹{stock.high}</td>
                      </tr>
                    );
                  })}
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
                <span>Page {currentPage}</span>
                <button
                  onClick={nextPage}
                  disabled={
                    currentPage === Math.ceil(results.length / stocksPerPage)
                  }
                  className="next"
                >
                  Next
                </button>
              </div>
              {showCheckbox && anyStockSelected && (
                <button
                  onClick={() => handleSubmit()}
                  disabled={!anyStockSelected}
                  className="add mt-2 ml-[33.5rem]"
                >
                  Add to Watchlist
                </button>
              )}
              {isDropdownOpen && (
                <>
                  <div className="overlay fixed top-0 left-0 w-full h-full bg-zinc-900 opacity-50 z-10"></div>
                  <div
                    ref={dropdownRef}
                    className="dropdown-menu absolute right-[30rem] top-[25vh] h-[26rem] w-[40rem]
           bg-white shadow-2xl rounded-3xl p-[6px] z-50 animate-slide-down flex items-center gap-2"
                  >
                    <div>
                      <img src={login} className="h-[25rem] w-[30rem]" />
                    </div>
                    {userDetails && hasRegistered ? (
                      <div className="text-black">
                        <Profile />
                      </div>
                    ) : (
                      <div>
                        <Register />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
