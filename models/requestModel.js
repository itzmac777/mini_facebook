const mongoose = require("mongoose")
const User = require("./userModel")

const requestSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  to: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  status: { type: String, default: "pending" },
  createdAt: { type: Number, default: Date.now },
})

module.exports = mongoose.model("Request", requestSchema)
