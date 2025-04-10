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
  region: {
    type: String,
    required: true,
    enum: ['NA', 'EU', 'ASIA', 'GLOBAL'],
    default: 'GLOBAL'
  },
  // A list of games with their associated ads for this campaign
  games: [{
    game_id: {
      type: String,
      required: true,
      ref: 'Game'
    },
    ads: [{
      ad_id: {
        type: String,
        ref: 'Ad',
        required: true
      },
      target_impressions: {
        type: Number,
        required: true
      },
      current_impressions: {
        type: Number,
        default: 0
      }
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual property to calculate total target impressions
CampaignSchema.virtual('target_impressions').get(function() {
  let total = 0;
  this.games.forEach(game => {
    game.ads.forEach(ad => {
      total += ad.target_impressions;
    });
  });
  return total;
});

// Virtual property to calculate total current impressions
CampaignSchema.virtual('total_impressions').get(function() {
  let total = 0;
  this.games.forEach(game => {
    game.ads.forEach(ad => {
      total += ad.current_impressions;
    });
  });
  return total;
});

// Virtual property to calculate remaining impressions
CampaignSchema.virtual('remaining_impressions').get(function() {
  return this.target_impressions - this.total_impressions;
});

// Method to check if the campaign is complete
CampaignSchema.methods.isComplete = function() {
  for (const game of this.games) {
    for (const ad of game.ads) {
      if (ad.current_impressions < ad.target_impressions) {
        return false;
      }
    }
  }
  return true;
};

module.exports = mongoose.model('Campaign', CampaignSchema); 