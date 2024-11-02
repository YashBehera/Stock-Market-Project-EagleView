import React, { useEffect, useState } from "react";
import "./StockTicker.css"; // Add CSS for the scrolling animation

// Example stock data
const stockData = [
  { name: "NIFTY BANK", price: 51957.05, change: -0.7 },
  { name: "BAJFINANCE", price: 6958.35, change: -0.91 },
  { name: "BHARTIARTL", price: 1645.30, change: 0.50 },
  { name: "HDFCBANK", price: 1742.00, change: -0.56 },
  { name: "HINDUNILVR", price: 2560.45, change: 0.50 },
  { name: "INDIGO", price: 4098.10, change: 0.62 }
];

const StockTicker = () => {
  const [stocks, setStocks] = useState(stockData);

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulating dynamic price changes
      const updatedStocks = stocks.map(stock => {
        const randomChange = (Math.random() * 2 - 1).toFixed(2); // Random price change
        const newPrice = (stock.price + parseFloat(randomChange)).toFixed(2);
        const priceChange = ((newPrice - stock.price) / stock.price * 100).toFixed(2);

        return {
          ...stock,
          price: parseFloat(newPrice),
          change: parseFloat(priceChange)
        };
      });
      setStocks(updatedStocks);
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [stocks]);

  return (
    <div className="stock-ticker">
      <div className="stock-ticker-content">
        {stocks.map((stock, index) => (
          <div key={index} className="stock">
            <span className="stock-name">{stock.name}</span>
            <span className={`stock-price ${stock.change >= 0 ? 'positive' : 'negative'}`}>
              {stock.price} {stock.change >= 0 ? "▲" : "▼"} {Math.abs(stock.change)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StockTicker;

