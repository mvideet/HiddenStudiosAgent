const mongoose = require('mongoose');

const AdSchema = new mongoose.Schema({
  ad_id: {
    type: String,
    required: true,
    unique: true
  },
  ad_type: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  brand_name: {
    type: String,
    required: true
  },
  product_name: {
    type: String,
    required: true
  },
  colors: {
    type: [String],
    required: true
  },
  billboard_id: {
    type: String,
    ref: 'Billboard'
  },
  game_id: {
    type: String,
    ref: 'Game',
    required: true
  },
  campaigns: {
    type: [String],
    ref: 'Campaign',
    default: []
  },
  total_impressions: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Ad', AdSchema); 