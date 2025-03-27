const express = require("express");
const User = require("../models/User"); // Import the User model
const router = express.Router();

// Route to create or update user data
router.post("/", async (req, res) => {
  const { uid, firstName, email, photo } = req.body;

  if (!uid || !email) {
    return res.status(400).json({
      message: "UID and email are required",
    });
  }

  try {
    let user = await User.findOne({ uid });

    if (user) {
      // Update existing user details
      user.firstName = firstName || user.firstName;
      user.email = email || user.email;
      user.photo = photo || user.photo;
    } else {
      // Create a new user if not found
      user = new User({ uid, firstName, email, photo, watchlist: [] });
    }

    await user.save();
    res.status(200).json({ message: "User data saved successfully", user });
  } catch (error) {
    console.error("Error saving user data:", error);
    res.status(500).json({ message: "Error saving user data", error });
  }
});

// Route to fetch the user's watchlist
router.get("/watchlist/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    const user = await User.findOne({ uid });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ watchlist: user.watchlist });
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    res.status(500).json({ message: "Error fetching watchlist", error });
  }
});


// Route to add stocks to the user's watchlist
router.post("/watchlist/add", async (req, res) => {
  const { uid, stocks } = req.body;

  if (!uid || !Array.isArray(stocks) || stocks.length === 0) {
    return res.status(400).json({
      message: "UID and an array of stocks are required",
    });
  }

  try {
    const user = await User.findOne({ uid });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Add new stocks to the watchlist, avoiding duplicates
    stocks.forEach((stock) => {
      const exists = user.watchlist.some(
        (s) => s.stockKey === stock.stockKey
      );
      if (!exists) user.watchlist.push(stock);
    });

    await user.save();
    res.status(200).json({ message: "Stocks added to watchlist", watchlist: user.watchlist });
  } catch (error) {
    console.error("Error adding stocks to watchlist:", error);
    res.status(500).json({ message: "Error adding stocks", error });
  }
});

// Route to remove a stock from the user's watchlist
// Route to remove a stock from the user's watchlist
router.delete("/watchlist/remove", async (req, res) => {
  const { uid, instrumentKey } = req.body; // Changed from stockKey to instrumentKey

  if (!uid || !instrumentKey) {
    return res.status(400).json({
      message: "UID and instrumentKey are required", // Updated message
    });
  }

  try {
    const user = await User.findOne({ uid });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove the stock with the matching instrumentKey
    user.watchlist = user.watchlist.filter(
      (stock) => stock.stockKey !== instrumentKey // Updated to use instrumentKey
    );

    await user.save();
    res.status(200).json({ message: "Stock removed from watchlist", watchlist: user.watchlist });
  } catch (error) {
    console.error("Error removing stock from watchlist:", error);
    res.status(500).json({ message: "Error removing stock", error });
  }
});


module.exports = router;
