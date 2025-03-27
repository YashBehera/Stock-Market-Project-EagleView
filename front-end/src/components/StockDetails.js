import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveTreeMap } from "@nivo/treemap";
import { Buffer } from "buffer";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import datas from "./Datas.json";
import financials from "./financials.json";
import proto from "./marketDataFeed.proto";
import Navbar from "./Navbar";
const protobuf = require("protobufjs");

// Initialize Protobuf
let protobufRoot = null;
const initProtobuf = async () => {
  protobufRoot = await protobuf.load(proto);
  console.log("Protobuf initialization complete in StockDetail");
};

// Function to get WebSocket URL
const getUrl = async (auth_token) => {
  const apiUrl = "https://api-v2.upstox.com/feed/market-data-feed/authorize";
  const headers = {
    "Content-type": "application/json",
    Authorization: "Bearer " + auth_token,
  };
  const response = await fetch(apiUrl, { method: "GET", headers });
  if (!response.ok) throw new Error("Network response was not ok");
  const res = await response.json();
  return res.data.authorizedRedirectUri;
};

// Fetch Market Quote Data
const fetchMarketQuote = async (auth_token, instrumentKey) => {
  const apiUrl = `https://api-v2.upstox.com/market-quote/quotes?symbol=${instrumentKey}`;
  const headers = {
    Accept: "application/json",
    "Api-Version": "2.0",
    Authorization: "Bearer " + auth_token,
  };
  const response = await fetch(apiUrl, { method: "GET", headers });
  if (!response.ok)
    throw new Error(`Market quote fetch failed: ${response.status}`);
  const res = await response.json();
  return res.data[instrumentKey];
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
    console.warn("Protobuf not initialized yet!");
    return null;
  }
  const FeedResponse = protobufRoot.lookupType(
    "com.upstox.marketdatafeeder.rpc.proto.FeedResponse"
  );
  return FeedResponse.decode(buffer);
};

// Function to calculate market cap (unchanged)
const calculateMarketCap = (faceValue, equityCapital, ltp) => {
  if (!faceValue || !equityCapital || !ltp) return "N/A";
  const equityCapitalNum = parseFloat(equityCapital.replace(/,/g, ""));
  const faceValueNum = parseFloat(faceValue);
  const ltpNum = parseFloat(ltp);
  const sharesOutstanding = equityCapitalNum / faceValueNum;
  const marketCapInCrores = sharesOutstanding * ltpNum;
  return marketCapInCrores.toFixed(2);
};

const FinancialTable = ({ data, type }) => {
  if (!data) return <p className="text-gray-500 text-center mt-4">No data available</p>;

  const years = Object.keys(data).sort();
  const headers = years.map((year) => (
    <th
      key={year}
      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 border-b border-gray-200 text-right"
    >
      {`Mar ${year.slice(0, 4)}`}
    </th>
  ));

  // Define fields to display based on type
  let fields = [];
  if (type === "balance_sheet") {
    fields = [
      "total assets",
      "fixed assets",
      "investments",
      "other assets",
      "total liabilities",
      "equity capital",
      "reserves",
      "borrowings",
      "short term borrowings",
      "trade payables",
      "other liability items",
    ].filter(field => Object.keys(data[years[0]]).includes(field));
  } else if (type === "cash_flow") {
    fields = Object.keys(data[years[0]]);
  } else if (type === "profit_loss") {
    fields = [
      "Sales",
      "Expenses",
      "Operating Profit",
      "OPM %",
      "Other Income",
      "Interest",
      "Depreciation",
      "Profit before tax",
      "Tax %",
      "Net Profit",
      "EPS in Rs",
      "Dividend Payout %",
    ].filter(field => Object.keys(data[years[0]]).includes(field));
  }

  // Calculate TTM values (using the latest year's values as TTM for simplicity)
  const ttmValues = {};
  fields.forEach(field => {
    const latestYear = years[years.length - 1];
    ttmValues[field] = data[latestYear][field] || "N/A";
  });

  // Format rows for the table
  const rows = fields.map((field, index) => (
    <tr
      key={field}
      className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100 transition-colors`}
    >
      <td className="px-4 py-2 text-sm text-gray-800 border-b border-gray-200 sticky left-0 bg-inherit">
        {field === "Sales" || field === "Expenses" || field === "Net Profit" ? (
          <span className="font-medium">{field} +</span>
        ) : field === "OPM %" || field === "Tax %" || field === "Dividend Payout %" ? (
          <span>{field}</span>
        ) : (
          <span className="pl-4">{field}</span>
        )}
      </td>
      {years.map((year) => (
        <td
          key={`${field}-${year}`}
          className="px-4 py-2 text-sm text-gray-600 border-b border-gray-200 text-right"
        >
          {data[year][field] !== null && data[year][field] !== undefined
            ? data[year][field]
            : "N/A"}
        </td>
      ))}
      <td className="px-4 py-2 text-sm text-gray-600 border-b border-gray-200 text-right">
        {ttmValues[field]}
      </td>
    </tr>
  ));

  // Footer metrics (hardcoded for now, can be calculated if data is available)
  const footerMetrics = [
    {
      title: "Compounded Sales Growth",
      values: { "10 Years": "45%", "5 Years": "45%", "3 Years": "45%", "TTM": "10%" },
    },
    {
      title: "Compounded Profit Growth",
      values: { "10 Years": "71%", "5 Years": "71%", "3 Years": "18%", "TTM": "18%" },
    },
    {
      title: "Stock Price CAGR",
      values: { "10 Years": "29%", "5 Years": "29%", "3 Years": "29%", "1 Year": "29%" },
    },
    {
      title: "Return on Equity",
      values: { "10 Years": "41%", "5 Years": "41%", "3 Years": "41%", "TTM": "41%" },
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-full h-auto mt-6 mb-0 mx-0 overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-md shadow-gray-200/50"
    >
      <div className="p-4 h-full flex flex-col">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          {type === "balance_sheet" ? "Balance Sheet" : type === "cash_flow" ? "Cash Flow" : "Profit & Loss"}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Consolidated Figures in Rs. Crores / View Standalone
        </p>
        <div className="flex-1 overflow-y-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-sm font-medium text-gray-600 border-b border-gray-200 sticky left-0 bg-gray-100 text-left">
                  {type === "balance_sheet" ? "Balance Sheet" : type === "cash_flow" ? "Cash Flow" : "Profit & Loss"}
                </th>
                {headers}
                <th className="px-4 py-2 text-sm font-medium text-gray-600 border-b border-gray-200 text-right">
                  TTM
                </th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
        {/* Footer Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {footerMetrics.map((metric, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-2">{metric.title}</h4>
              <div className="space-y-1">
                {Object.entries(metric.values).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-600">{key}:</span>
                    <span className="text-gray-800 font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// Sales and Profit Growth Bar Graph
const SalesProfitBarGraph = ({ data }) => {
  if (!data || !data.profit_loss) return null;

  const formattedData = Object.keys(data.profit_loss).map((year) => ({
    year,
    sales: parseFloat(data.profit_loss[year]["Sales"].replace(/,/g, "")) || 0,
    profit:
      parseFloat(data.profit_loss[year]["Net Profit"].replace(/,/g, "")) || 0,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="h-96 w-full bg-white rounded-lg shadow-md shadow-gray-200/50 p-4 mt-6 border border-gray-200"
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Sales & Profit Growth
      </h3>
      <ResponsiveBar
        data={formattedData}
        keys={["sales", "profit"]}
        indexBy="year"
        margin={{ top: 20, right: 130, bottom: 50, left: 60 }}
        padding={0.3}
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        colors={["#60A5FA", "#F472B6"]} // Soft blue and pink
        borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: "Year",
          legendPosition: "middle",
          legendOffset: 32,
          tickValues: formattedData
            .map((d) => d.year)
            .filter((_, i) => i % 2 === 0), // Show every other year
          legendTextColor: "#4B5563",
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: "Amount (₹ Cr)",
          legendPosition: "middle",
          legendOffset: -40,
          legendTextColor: "#4B5563",
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
        legends={[
          {
            dataFrom: "keys",
            anchor: "bottom-right",
            direction: "column",
            justify: false,
            translateX: 120,
            translateY: 0,
            itemsSpacing: 2,
            itemWidth: 100,
            itemHeight: 20,
            itemTextColor: "#4B5563",
            itemOpacity: 0.85,
            symbolSize: 20,
            effects: [{ on: "hover", style: { itemOpacity: 1 } }],
          },
        ]}
        theme={{
          textColor: "#4B5563",
          background: "#FFFFFF",
          grid: { line: { stroke: "#E5E7EB" } },
        }}
        animate={true}
        motionStiffness={90}
        motionDamping={15}
      />
    </motion.div>
  );
};

// Balance Sheet Treemap
const BalanceSheetTreeMap = ({ data }) => {
  if (!data || !data.balance_sheet) return null;

  // Get the latest year and prepare data
  const latestYear = Object.keys(data.balance_sheet).sort().pop();
  const balanceSheetData = {
    name: "Balance Sheet",
    children: Object.entries(data.balance_sheet[latestYear])
      .filter(
        ([_, value]) =>
          value !== null &&
          value !== "0" &&
          parseFloat(value.replace(/,/g, "")) > 0
      ) // Exclude null, "0", or negative values
      .map(([key, value]) => ({
        name: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), // Capitalize each word
        value: parseFloat(value.replace(/,/g, "")) || 0, // Convert to number, default to 0
      })),
  };

  // Ensure there's data to display
  if (balanceSheetData.children.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="h-96 w-full bg-white rounded-lg shadow-md shadow-gray-200/50 p-4 mt-6 border border-gray-200"
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Balance Sheet Breakdown ({latestYear})
      </h3>
      <div className="h-full">
        <ResponsiveTreeMap
          data={balanceSheetData}
          identity="name"
          value="value"
          valueFormat=".2s" // Format values (e.g., 3019 → "3.02k")
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          label={
            (node) => `${node.id}: ₹${node.formattedValue} Cr` // Clear label with ₹ and Cr
          }
          labelSkipSize={12} // Skip labels for small nodes
          labelTextColor={{ from: "color", modifiers: [["darker", 2]] }}
          colors={["#60A5FA", "#F472B6", "#FBBF24", "#34D399"]} // Pastel colors: blue, pink, yellow, green
          borderWidth={1}
          borderColor={{ from: "color", modifiers: [["darker", 0.3]] }}
          theme={{
            textColor: "#4B5563", // Dark gray for readability
            fontSize: 12, // Consistent font size
            background: "#FFFFFF",
            tooltip: {
              container: { background: "#FFFFFF", color: "#4B5563" },
            },
          }}
          animate={true}
          motionStiffness={90}
          motionDamping={15}
        />
      </div>
    </motion.div>
  );
};

const ShareholdingPatternBarGraph = ({ data }) => {
  if (!data || !data.shareholding_pattern) return null;

  // Format the data for the bar graph
  const formattedData = [];
  const years = Object.keys(data.shareholding_pattern).sort();
  years.forEach((year) => {
    const quarters = Object.keys(data.shareholding_pattern[year]).sort();
    quarters.forEach((quarter) => {
      const entry = data.shareholding_pattern[year][quarter];
      formattedData.push({
        quarter: `${year} ${quarter}`,
        promoters: parseFloat(entry.promoters.replace("%", "")) || 0,
        fiis: parseFloat(entry.fiis.replace("%", "")) || 0,
        diis: parseFloat(entry.diis.replace("%", "")) || 0,
        public: parseFloat(entry.public.replace("%", "")) || 0,
      });
    });
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.9 }}
      className="h-96 w-full bg-white rounded-lg shadow-md shadow-gray-200/50 p-4 mt-6 border border-gray-200"
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Quarterly Shareholding Pattern
      </h3>
      <ResponsiveBar
        data={formattedData}
        keys={["promoters", "fiis", "diis", "public"]}
        indexBy="quarter"
        margin={{ top: 20, right: 130, bottom: 50, left: 60 }}
        padding={0.3}
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        colors={["#60A5FA", "#F472B6", "#FBBF24", "#34D399"]} // Blue, Pink, Yellow, Green
        borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 45,
          legend: "Quarter",
          legendPosition: "middle",
          legendOffset: 40,
          tickValues: formattedData
            .map((d) => d.quarter)
            .filter((_, i) => i % 2 === 0), // Show every other quarter
          legendTextColor: "#4B5563",
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: "Percentage (%)",
          legendPosition: "middle",
          legendOffset: -40,
          legendTextColor: "#4B5563",
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
        legends={[
          {
            dataFrom: "keys",
            anchor: "bottom-right",
            direction: "column",
            justify: false,
            translateX: 120,
            translateY: 0,
            itemsSpacing: 2,
            itemWidth: 100,
            itemHeight: 20,
            itemTextColor: "#4B5563",
            itemOpacity: 0.85,
            symbolSize: 20,
            effects: [{ on: "hover", style: { itemOpacity: 1 } }],
          },
        ]}
        theme={{
          textColor: "#4B5563",
          background: "#FFFFFF",
          grid: { line: { stroke: "#E5E7EB" } },
        }}
        animate={true}
        motionStiffness={90}
        motionDamping={15}
        layout="vertical"
        enableLabel={false} // Disable labels on bars to avoid clutter
      />
    </motion.div>
  );
};

export default function StockDetails({ auth_token }) {
  const { symbol } = useParams();
  const [ltp, setLtp] = useState(null);
  const [marketCap, setMarketCap] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [stockName, setStockName] = useState("");
  const [faceValue, setFaceValue] = useState(null);
  const [equityCapital, setEquityCapital] = useState(null);
  const [financialData, setFinancialData] = useState(null);

  useEffect(() => {
    const fetchFinancialData = () => {
      const stockFinancials = financials.find((item) => item._id === symbol);
      if (stockFinancials) {
        setFaceValue(stockFinancials.face_value);
        setEquityCapital(
          stockFinancials.balance_sheet["2024"]["equity capital"]
        );
        setFinancialData(stockFinancials);
      } else {
        console.error(
          `Financial data for ${symbol} not found in financials.json`
        );
        setFaceValue(null);
        setEquityCapital(null);
        setFinancialData(null);
      }
    };

    const connectWebSocket = async () => {
      try {
        const stock = datas.find((item) => item.trading_symbol === symbol);
        if (!stock) {
          console.error(
            `Stock with trading_symbol ${symbol} not found in datas.json`
          );
          return;
        }
        const instrumentKey = stock.instrument_key;
        setStockName(stock.name);

        fetchFinancialData();

        const quoteData = await fetchMarketQuote(auth_token, instrumentKey);
        if (quoteData) {
          setLtp(quoteData.last_price);
          console.log("Market Quote Data:", quoteData);
        }

        const wsUrl = await getUrl(auth_token);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
          console.log("WebSocket Connected in StockDetail");
          const data = {
            guid: "someguid",
            method: "sub",
            data: { mode: "full", instrumentKeys: [instrumentKey] },
          };
          ws.send(Buffer.from(JSON.stringify(data)));
        };

        ws.onmessage = async (event) => {
          const arrayBuffer = await blobToArrayBuffer(event.data);
          const buffer = Buffer.from(arrayBuffer);
          const response = decodeProfobuf(buffer);

          if (response && response.feeds) {
            const feedData = response.feeds[instrumentKey];
            if (
              feedData &&
              feedData.ff &&
              feedData.ff.marketFF &&
              feedData.ff.marketFF.ltpc
            ) {
              const lastPrice = feedData.ff.marketFF.ltpc.ltp || "N/A";
              setLtp(lastPrice);
              console.log(`LTP for ${symbol}: ${lastPrice}`);
            } else {
              console.warn(`No LTP data for ${instrumentKey}`);
            }
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          console.log("WebSocket Disconnected in StockDetail");
        };

        ws.onerror = (error) => {
          setIsConnected(false);
          console.log("WebSocket error in StockDetail:", error);
        };

        return () => ws.close();
      } catch (error) {
        console.error("WebSocket connection error in StockDetail:", error);
      }
    };

    initProtobuf();
    connectWebSocket();
  }, [symbol, auth_token]);

  useEffect(() => {
    const marketCapValue = calculateMarketCap(faceValue, equityCapital, ltp);
    setMarketCap(marketCapValue);
  }, [ltp, faceValue, equityCapital]);

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center font-sans ">
      <Navbar token={auth_token} />
      <div className="max-w-full mx-0 px-4 sm:px-6 lg:px-8 py-10 ">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl p-6 mb-8 shadow-md shadow-gray-200/50 border border-gray-200 flex flex-col items-center justify-center"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
            {stockName || "Loading..."}{" "}
            <span className="text-blue-500">({symbol})</span>
          </h1>
          <div className="flex flex-wrap gap-6 text-gray-600 text-sm">
            <div className="flex items-center">
              <span className="font-medium text-gray-500">Last Price:</span>
              <span className="ml-2 text-lg font-semibold text-blue-500">
                ₹{ltp !== null ? ltp : "Loading..."}
              </span>
            </div>
            <div className="flex items-center">
              <span className="font-medium text-gray-500">Market Cap:</span>
              <span className="ml-2 text-lg font-semibold text-blue-500">
                ₹{marketCap !== null ? `${marketCap} Cr` : "Loading..."}
              </span>
            </div>
          </div>
          <hr className="my-4 border-gray-200" />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex gap-4 sticky top-0 z-20 py-4 -mx-6 px-6 w-full"
          >
            {["Balance Sheet", "Cash Flow", "Income Sheet"].map((tab) => (
              <a
                key={tab}
                href={`#${tab.toLowerCase().replace(" ", "-")}`}
                className="flex-1 h-10 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-black hover:text-white transition-all duration-300 flex items-center justify-center shadow-sm"
              >
                {tab}
              </a>
            ))}
          </motion.div>
        </motion.div>

        <div className="space-y-12">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h2
              id="balance-sheet"
              className="text-2xl font-semibold text-gray-900 mb-4 tracking-tight"
            >
              Balance Sheet
            </h2>
            <FinancialTable
              data={financialData?.balance_sheet}
              type="balance_sheet"
            />
            <BalanceSheetTreeMap data={financialData} />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <h2
              id="cash-flow"
              className="text-2xl font-semibold text-gray-900 mb-4 tracking-tight"
            >
              Cash Flow
            </h2>
            <FinancialTable data={financialData?.cash_flow} type="cash_flow" />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <h2
              id="income-sheet"
              className="text-2xl font-semibold text-gray-900 mb-4 tracking-tight"
            >
              Income Sheet
            </h2>
            <FinancialTable
              data={financialData?.profit_loss}
              type="profit_loss"
            />
            <SalesProfitBarGraph data={financialData} />
          </motion.section>
        </div>
      </div>
    </div>
  );
}
