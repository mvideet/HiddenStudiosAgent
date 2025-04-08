const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  campaign_id: {
    type: String,
    required: true,
    unique: true
  },
  campaign_name: {
    type: String,
    required: true
  },
  // A list of games with their associated ads for this campaign
  games: [{
    game_id: {
      type: String,
      required: true,
      ref: 'Game'
    },
    ads: [{
      type: String,
      ref: 'Ad'
    }]
  }],
  start_time: {
    type: Date,
    required: true
  },
  end_time: {
    type: Date,
    required: true
  },
  target_impressions: {
    type: Number,
    required: true
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

// Virtual property to calculate remaining impressions
CampaignSchema.virtual('remaining_impressions').get(function() {
  return this.target_impressions - this.total_impressions;
});

module.exports = mongoose.model('Campaign', CampaignSchema); 