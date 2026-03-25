const mongoose = require("mongoose");

const boardSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model("Board", boardSchema);