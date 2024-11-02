import React, { useState, useEffect } from 'react';
import data from '../components/filtered_unique_datas.json';

const MarketWatch = () => {
  const [stockData, setStockData] = useState([]);
  const apiKey = 'PLrSzVG8Gyt9Z5H2Ol6kPdfIQxjjgtaR';
  const baseUrl = 'https://financialmodelingprep.com/api/v3/quote';

  useEffect(() => {
    // Extract the first 5 stock symbols from datas.json
    const stockSymbols = data.slice(0, 5).map(stock => stock.trading_symbol);

    const fetchStockData = async () => {
        try {
          console.log("Fetching data for symbols:", stockSymbols);

          // Map each symbol to a fetch request
          const requests = stockSymbols.map(symbol =>
            fetch(`${baseUrl}/${symbol}?apikey=${apiKey}`)
              .then(response => {
                console.log(`Response for ${symbol}:`, response);
                return response.json();
              })
              .then(data => {
                console.log(`Data for ${symbol}:`, data);
                return data;
              })
          );

          // Await all fetch requests
          const results = await Promise.all(requests);
          console.log("All fetched data:", results);

          // Update state
          setStockData(results.flat()); // Flatten in case API response is nested
        } catch (error) {
          console.error("Error fetching stock data:", error);
        }
      };


    fetchStockData();
  }, []);

  return (
    <div>
      <h1>Market Watch</h1>
      {stockData.length > 0 ? (
        <ul>
          {stockData.map(stock => (
            <li key={stock.symbol}>
              <strong>{stock.name}</strong> ({stock.symbol}): ${stock.price}
            </li>
          ))}
        </ul>
      ) : (
        <p>Loading stock data...</p>
      )}
    </div>
  );
};

export default MarketWatch;
