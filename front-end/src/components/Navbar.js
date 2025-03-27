import React, { useState, useEffect, useCallback, useRef } from "react";
import { RxHamburgerMenu } from "react-icons/rx";
import { CgProfile } from "react-icons/cg";
import { MdOutlineNotificationAdd } from "react-icons/md";
import { FaCaretUp, FaCaretDown } from "react-icons/fa";
import logo from "./logo1.jpg";
import "./style.css";
import { CiSearch } from "react-icons/ci";
import datas from "./Datas.json";
import debounce from "debounce";
import proto from "./marketDataFeed.proto";
import { Buffer } from "buffer";
import login from "./Login.png";
import Register from "./register";
import { auth, db } from "./firebase-config";
import { doc, getDoc } from "firebase/firestore";
import Profile from "./profile";
import { useNavigate } from "react-router-dom";
import StockTicker from "./StockTicker";

const protobuf = require("protobufjs");

let protobufRoot = null;
const initProtobuf = async () => {
  protobufRoot = await protobuf.load(proto);
  console.log("Protobuf part initialization complete");
};

const getUrl = async (token) => {
  const apiUrl = "https://api-v2.upstox.com/feed/market-data-feed/authorize";
  let headers = {
    "Content-type": "application/json",
    Authorization: "Bearer " + token,
  };
  const response = await fetch(apiUrl, { method: "GET", headers });
  if (!response.ok) throw new Error("Network response was not ok");
  const res = await response.json();
  return res.data.authorizedRedirectUri;
};

const blobToArrayBuffer = async (blob) => {
  if ("arrayBuffer" in blob) return await blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject();
    reader.readAsArrayBuffer(blob);
  });
};

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

  const navigate = useNavigate();

  const handleWatchlistClick = () => navigate("/watchlist");
  const handleScreenerClick = () => navigate("/");
  const handleMarketWatchClick = () => navigate("/marketWatch");

  const [isConnected, setIsConnected] = useState(false);
  const [feedData, setFeedData] = useState([]);
  const [price1, setPrice1] = useState([]);
  const [price2, setPrice2] = useState([]);
  const [price3, setPrice3] = useState([]);
  const [searchFeed, setSearchFeed] = useState({});
  const [results, setResults] = useState([]);
  const [input, setInput] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [userDetails, setUserDetails] = useState(null);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchUserData = async () => {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        const docRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserDetails(docSnap.data());
          setHasRegistered(true);
        }
      }
    });
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    const connectWebSocket = async (token) => {
      try {
        const wsUrl = await getUrl(token);
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          setIsConnected(true);
          const selectedInstrumentKeys = [
            "NSE_INDEX|Nifty 50",
            "NSE_INDEX|Nifty Bank",
            "BSE_INDEX|SENSEX",
          ];
          const Instrument_Keys = results.map((stock) => stock.instrument_key);
          const data = {
            guid: "someguid",
            method: "sub",
            data: { mode: "full", instrumentKeys: selectedInstrumentKeys },
          };
          const data2 = {
            guid: "someguid",
            method: "sub",
            data: { mode: "full", instrumentKeys: Instrument_Keys },
          };
          ws.send(Buffer.from(JSON.stringify(data)));
          ws.send(Buffer.from(JSON.stringify(data2)));
        };
        ws.onmessage = async (event) => {
          const arrayBuffer = await blobToArrayBuffer(event.data);
          let buffer = Buffer.from(arrayBuffer);
          let response = decodeProfobuf(buffer);
          const feeds = response.feeds;
          const updatedResults = results.map((stock) => {
            const data = feeds[`${stock.instrument_key}`];
            return data && data.ff && data.ff.marketFF && data.ff.marketFF.ltpc
              ? { ...stock, lastPrice: data.ff.marketFF.ltpc.ltp || "N/A" }
              : stock;
          });
          setResults(updatedResults);
          if (
            feeds &&
            feeds["BSE_INDEX|SENSEX"] &&
            feeds["NSE_INDEX|Nifty 50"] &&
            feeds["NSE_INDEX|Nifty Bank"]
          ) {
            setPrice1(feeds["NSE_INDEX|Nifty 50"].ff.indexFF.ltpc.ltp);
            setPrice2(feeds["NSE_INDEX|Nifty Bank"].ff.indexFF.ltpc.ltp);
            setPrice3(feeds["BSE_INDEX|SENSEX"].ff.indexFF.ltpc.ltp);
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
        ws.onclose = () => setIsConnected(false);
        ws.onerror = (error) => setIsConnected(false);
        return () => ws.close();
      } catch (error) {
        console.error("WebSocket connection error:", error);
      }
    };
    initProtobuf();
    connectWebSocket(token);
  }, [token, searchFeed]);

  const fetchData = useCallback(
    debounce((value) => {
      const filteredResults = datas.filter(
        (stock) =>
          value &&
          stock &&
          ((stock.name &&
            stock.name.toLowerCase().startsWith(value.toLowerCase())) ||
            (stock.trading_symbol &&
              stock.trading_symbol
                .toLowerCase()
                .startsWith(value.toLowerCase())))
      );
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
    }, 1000),
    []
  );

  const handleChange = (value) => {
    setInput(value);
    fetchData(value);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    if (input && !recentSearches.includes(input))
      setRecentSearches([input, ...recentSearches]);
    setInput("");
    setResults([]);
  };

  const handleResultClick = (search) => {
    setInput(`${search.name} (${search.trading_symbol})`);
    setResults([]);
    navigate(`/${search.trading_symbol}`);
  };

  const isFO = (symbol) =>
    symbol.includes("CE") || symbol.includes("PE") || symbol.includes("FUT");

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
    if (!hasRegistered) setHasRegistered(true);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen)
      document.addEventListener("mousedown", handleClickOutside);
    else document.removeEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  return (
    <div className="navbar flex flex-col items-center justify-between p-0 w-screen bg-gray-900 text-white shadow-md sticky top-0 z-50">
      <StockTicker auth_token={token} />
      <nav className="navbar flex items-center justify-between px-6 py-2 w-screen bg-gray-900 text-white shadow-md sticky top-0 z-50">
        {/* Left Section: Logo and Brand */}
        <div className="flex items-center gap-4">
          <button className="text-2xl hover:text-gray-300 transition-colors">
            <RxHamburgerMenu />
          </button>
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="EagleView Logo"
              className="h-8 w-8 rounded-full"
            />
            <button
              onClick={handleScreenerClick}
              className="text-xl font-semibold hover:text-gray-200 transition-colors"
            >
              EagleView
              <span className="text-xs ml-1 align-super">IN</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-grow max-w-md mx-4">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex items-center bg-gray-800 rounded-full px-4 py-2 border border-gray-700 focus-within:border-blue-500 transition-colors">
              <CiSearch className="text-xl mr-2" />
              <input
                type="text"
                placeholder="Search stocks, mutual funds, ETFs..."
                value={input}
                onChange={(e) => handleChange(e.target.value)}
                className="bg-transparent w-full text-sm focus:outline-none placeholder-gray-400"
              />
            </div>
            {results.length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto text-black">
                <ul>
                  {results.map((search, index) => (
                    <li
                      key={index}
                      onClick={() => handleResultClick(search)}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{search.name}</span>
                        <span className="text-sm text-gray-600">
                          {search.lastPrice}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{search.trading_symbol}</span>
                        <span
                          className={`px-2 py-1 rounded-full text-orange-600 ${
                            isFO(search.trading_symbol)
                              ? "bg-orange-100"
                              : "bg-green-100"
                          }`}
                        >
                          {isFO(search.trading_symbol) ? "F&O" : "Stock"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        </div>

        {/* Navigation Links and Market Data */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleMarketWatchClick}
            className="text-sm font-medium hover:text-gray-200 px-3 py-1 rounded-lg hover:bg-gray-800 transition-all"
          >
            Market Watch
          </button>
          <button
            onClick={handleScreenerClick}
            className="text-sm font-medium hover:text-gray-200 px-3 py-1 rounded-lg hover:bg-gray-800 transition-all"
          >
            Screener
          </button>
          <button
            onClick={handleWatchlistClick}
            className="text-sm font-medium hover:text-gray-200 px-3 py-1 rounded-lg hover:bg-gray-800 transition-all"
          >
            Watchlist
          </button>
        </div>

        {/* Right Section: Notifications and Profile */}
        <div className="flex items-center gap-4">
          <button className="text-2xl hover:text-gray-300 transition-colors">
            <MdOutlineNotificationAdd />
          </button>
          <div className="relative">
            <button
              onClick={toggleDropdown}
              className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-full hover:bg-gray-700 transition-colors"
            >
              {userDetails ? (
                <>
                  <img
                    src={userDetails.photo}
                    alt="Profile"
                    className="h-6 w-6 rounded-full"
                  />
                  <span className="text-sm font-medium">
                    {userDetails.firstName}
                  </span>
                </>
              ) : (
                <>
                  <CgProfile className="text-xl" />
                  <span className="text-sm">Login/SignUp</span>
                </>
              )}
            </button>
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 bg-black opacity-30 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                ></div>
                <div
                  ref={dropdownRef}
                  className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl p-4 z-50 text-black animate-fade-in"
                >
                  <div className="flex gap-4">
                    <img
                      src={login}
                      alt="Login"
                      className="w-2/3 h-64 object-cover rounded-lg"
                    />
                    {userDetails && hasRegistered ? <Profile /> : <Register />}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}