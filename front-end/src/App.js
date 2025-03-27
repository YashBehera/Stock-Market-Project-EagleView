import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import StockTicker from "./components/StockTicker"; // Assuming StockTicker is in components folder
import Home from "./pages/Home";
import Watchlist from "./pages/Watchlist";
import MarketWatch from "./pages/MarketWatch";
import StockDetails from "./components/StockDetails";

export default function App() {
  const auth_token = "#eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiI4TEFQNkgiLCJqdGkiOiI2N2UyM2YyNDFkODkwODFmZWUxNTYxN2EiLCJpc011bHRpQ2xpZW50IjpmYWxzZSwiaWF0IjoxNzQyODgwNTQ4LCJpc3MiOiJ1ZGFwaS1nYXRld2F5LXNlcnZpY2UiLCJleHAiOjE3NDI5NDAwMDB9.FpxM4QpiqKuTWPAQ2cPnPO_J8cAMKvuHUDXohgGEtlw";

  return (
    <Router>
      <div className="app-container">
        {/* <StockTicker auth_token={auth_token}/> */}
        <Routes>
          <Route path="/" element={<Home auth_token={auth_token} />} />
          <Route path="/watchlist" element={<Watchlist auth_token={auth_token} />} />
          <Route path="/marketWatch" element={<MarketWatch />} />
          <Route path="/:symbol" element={<StockDetails auth_token={auth_token} />} />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    </Router>
  );
}