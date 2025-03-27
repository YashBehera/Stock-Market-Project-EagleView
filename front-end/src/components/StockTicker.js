import React, { useEffect, useState } from "react";
import "./StockTicker.css";
import datas from "./Datas.json";
import proto from "./marketDataFeed.proto";
import { Buffer } from "buffer";

const protobuf = require("protobufjs");

// Initialize Protobuf
let protobufRoot = null;
const initProtobuf = async () => {
  protobufRoot = await protobuf.load(proto);
  console.log("Protobuf initialization complete in StockTicker");
};

// Function to get WebSocket URL
const getUrl = async (token) => {
  const apiUrl = "https://api-v2.upstox.com/feed/market-data-feed/authorize";
  const headers = {
    "Content-type": "application/json",
    Authorization: "Bearer " + token,
  };
  const response = await fetch(apiUrl, { method: "GET", headers });
  if (!response.ok) throw new Error("Network response was not ok");
  const res = await response.json();
  return res.data.authorizedRedirectUri;
};

// Helper function to convert Blob to ArrayBuffer
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
    console.warn("Protobuf not initialized yet in StockTicker!");
    return null;
  }
  const FeedResponse = protobufRoot.lookupType(
    "com.upstox.marketdatafeeder.rpc.proto.FeedResponse"
  );
  return FeedResponse.decode(buffer);
};

const StockTicker = ({ auth_token }) => {
  const indexStocks = [
    { trading_symbol: "NIFTY 50", instrument_key: "NSE_INDEX|Nifty 50" },
    { trading_symbol: "BANKNIFTY", instrument_key: "NSE_INDEX|Nifty Bank" },
    { trading_symbol: "SENSEX", instrument_key: "BSE_INDEX|SENSEX" },
  ];

  // Select specific stocks from datas.json
  const equityStocks = [
    datas.find((stock) => stock.trading_symbol === "RELIANCE"),
    datas.find((stock) => stock.trading_symbol === "TCS"),
    datas.find((stock) => stock.trading_symbol === "HDFCBANK"),
    datas.find((stock) => stock.trading_symbol === "INFY"),
    datas.find((stock) => stock.trading_symbol === "BAJFINANCE"),
    datas.find((stock) => stock.trading_symbol === "BHARTIARTL"),
    datas.find((stock) => stock.trading_symbol === "INDIGO"),
    datas.find((stock) => stock.trading_symbol === "ITC"),
    datas.find((stock) => stock.trading_symbol === "MARUTI"),
  ].filter(Boolean);

  const selectedStocks = [...indexStocks, ...equityStocks];

  const initialStocks = selectedStocks.map((stock) => ({
    name: stock.trading_symbol,
    price: null,
    change: 0,
    instrument_key: stock.instrument_key,
    isIndex: stock.instrument_key.includes("INDEX"),
  }));

  const [stocks, setStocks] = useState(initialStocks);

  useEffect(() => {
    const connectWebSocket = async () => {
      if (!auth_token) {
        console.error("No auth_token provided to StockTicker");
        return;
      }

      try {
        await initProtobuf();
        const wsUrl = await getUrl(auth_token);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("WebSocket Connected in StockTicker");
          const instrumentKeys = selectedStocks.map((stock) => stock.instrument_key);
          const data = {
            guid: "someguid",
            method: "sub",
            data: {
              mode: "full",
              instrumentKeys: instrumentKeys,
            },
          };
          ws.send(Buffer.from(JSON.stringify(data)));
        };

        ws.onmessage = async (event) => {
          const arrayBuffer = await blobToArrayBuffer(event.data);
          const buffer = Buffer.from(arrayBuffer);
          const response = decodeProfobuf(buffer);

          if (response && response.feeds) {
            const feeds = response.feeds;
            const updatedStocks = stocks.map((stock) => {
              const feedData = feeds[stock.instrument_key];
              if (feedData && feedData.ff) {
                const newPrice = stock.isIndex
                  ? feedData.ff.indexFF?.ltpc?.ltp || stock.price
                  : feedData.ff.marketFF?.ltpc?.ltp || stock.price;
                const priceChange = stock.price
                  ? ((newPrice - stock.price) / stock.price * 100).toFixed(2)
                  : 0;
                return {
                  ...stock,
                  price: newPrice,
                  change: parseFloat(priceChange),
                };
              }
              return stock;
            });
            setStocks(updatedStocks);
          }
        };

        ws.onclose = () => {
          console.log("WebSocket Disconnected in StockTicker");
        };

        ws.onerror = (error) => {
          console.error("WebSocket error in StockTicker:", error);
        };

        return () => ws.close();
      } catch (error) {
        console.error("WebSocket connection error in StockTicker:", error);
      }
    };

    connectWebSocket();
  }, [auth_token]);

  // Duplicate the stock items for seamless looping
  const renderStockItems = () => {
    return stocks.map((stock, index) => (
      <div key={index} className="stock-item">
        <span className="stock-name">{stock.name}</span>
        <span className={`stock-price ${stock.change >= 0 ? "positive" : "negative"}`}>
          {stock.price ? stock.price.toLocaleString() : "Loading..."}
          {stock.price && (stock.change >= 0 ? " ▲" : " ▼")}
          {stock.price && `${Math.abs(stock.change)}%`}
        </span>
      </div>
    ));
  };

  return (
    <div className="stock-ticker">
      <div className="stock-ticker-wrapper">
        <div className="stock-ticker-content">
          {renderStockItems()}
          {renderStockItems()} {/* Duplicate for seamless loop */}
        </div>
      </div>
    </div>
  );
};

export default StockTicker;