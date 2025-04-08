const mongoose = require('mongoose');

const BillboardSchema = new mongoose.Schema({
  billboard_id: {
    type: String,
    required: true,
    unique: true
  },
  game_id: {
    type: String,
    required: true,
    ref: 'Game'
  },
  position: {
    type: Number,
    required: true,
    min: 1,
    max: 10 // Each game has 10 ad spaces
  },
  ad_id: {
    type: String,
    ref: 'Ad',
    default: null // Can be null if no ad is assigned
  },
  campaign_id: {
    type: String,
    ref: 'Campaign',
    default: null // Can be null if no campaign is assigned
  },
  is_occupied: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Billboard', BillboardSchema); 