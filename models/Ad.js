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
  name: {
    type: String,
    required: true
  },
  product_or_brand: {
    type: String,
    enum: ['product', 'brand'],
    required: true
  },
  contrast: {
    type: Number,
    default: 1.0
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
  ad_loc: {
    type: Number,
    min: 1,
    max: 10,
    default: null
  },
  campaigns: [{
    campaign_id: {
      type: String,
      ref: 'Campaign'
    },
    impressions: {
      type: Number,
      default: 0
    }
  }],
  total_impressions: {
    type: Number,
    default: 0
  },
  impression_multiplier: {
    type: Number,
    default: 1.0
  },
  ad_space: {
    type: String,
    default: 'sidebar'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add method to increment impressions for a specific campaign
AdSchema.methods.addImpression = function(campaignId, count = 1) {
  // Update total impressions
  this.total_impressions += count;
  
  // Find or create the campaign entry
  const campaignEntry = this.campaigns.find(c => c.campaign_id === campaignId);
  if (campaignEntry) {
    campaignEntry.impressions += count;
  } else {
    this.campaigns.push({
      campaign_id: campaignId,
      impressions: count
    });
  }
  
  return this.save();
};

module.exports = mongoose.model('Ad', AdSchema); 