import React from 'react'
import Home from './pages/Home'
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Watchlist from "./pages/Watchlist";
import MarketWatch from './pages/MarketWatch';


export default function App() {
  const auth_token = "eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiI4TEFQNkgiLCJqdGkiOiI2NzI1Y2VhZWQyYjIwYzNhYTAwNjZiOTAiLCJpc011bHRpQ2xpZW50IjpmYWxzZSwiaWF0IjoxNzMwNTMwOTkwLCJpc3MiOiJ1ZGFwaS1nYXRld2F5LXNlcnZpY2UiLCJleHAiOjE3MzA1ODQ4MDB9.HPlxG4DBL1UPqmsFRTEmM0WScwmeZi09sxvruWtKAFE";
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home auth_token={auth_token}/>}  />
        <Route path="/watchlist" element={<Watchlist auth_token={auth_token}/>} />
        <Route path="/marketWatch" element={<MarketWatch/>}/>
      </Routes>
    </Router>
  )
}
