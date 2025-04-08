const mongoose = require('mongoose');

// Define the schema for the Games collection
const GameSchema = new mongoose.Schema({
  game_id: {
    type: String,
    required: true,
    unique: true, // Ensure game_id is unique
    primary: true // Mark as primary key
  },
  title: {
    type: String,
    required: true
  },
  region: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    required: true
  },
  plays: {
    type: Number,
    default: 0
  },
  thumbnail_url: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps
});

// Create and export the Game model
const Game = mongoose.model('Game', GameSchema);
module.exports = Game; 