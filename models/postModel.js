const mongoose = require("mongoose")
const User = require("./userModel")

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, require: true },
  author: { type: mongoose.Schema.Types.ObjectId, require: true, ref: "User" },
})

module.exports = mongoose.model("Post", postSchema)
