const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema({
  stockName: { type: String, required: true },
  stockKey: { type: String, required: true },
  stockSymbol: { type: String, required: true },
});

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  firstName: { type: String },
  photo: { type: String },
  watchlist: [stockSchema]
});

module.exports = mongoose.model("User", userSchema);
