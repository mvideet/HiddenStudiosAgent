const mongoose = require('mongoose');

const AdPerformanceSchema = new mongoose.Schema({
  performance_id: {
    type: String,
    required: true,
    unique: true
  },
  ad_id: {
    type: String,
    required: true,
    ref: 'Ad'
  },
  date: { //for each date, how many impressions were there?
    type: Date,
    required: true,
    default: Date.now
  },
  impressions: {
    type: Number,
    required: true,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add method to update the associated Ad and Campaign impression counts
AdPerformanceSchema.post('save', async function() {
  try {
    // Get the models
    const Ad = mongoose.model('Ad');
    const Campaign = mongoose.model('Campaign');
    
    // Update the ad's total_impressions
    const ad = await Ad.findOne({ ad_id: this.ad_id });
    if (ad) {
      ad.total_impressions += this.impressions;
      await ad.save();
      
      // Update all campaigns associated with this ad
      if (ad.campaigns && ad.campaigns.length > 0) {
        for (const campaignId of ad.campaigns) {
          const campaign = await Campaign.findOne({ campaign_id: campaignId });
          if (campaign) {
            // Calculate new total impressions for the campaign
            const allAdIds = [];
            campaign.games.forEach(game => {
              allAdIds.push(...game.ads);
            });
            
            const ads = await Ad.find({ ad_id: { $in: allAdIds } });
            const totalImpressions = ads.reduce((sum, ad) => sum + ad.total_impressions, 0);
            
            campaign.total_impressions = totalImpressions;
            await campaign.save();
          }
        }
      }
    }
  } catch (error) {
    console.error('Error updating impression counts:', error);
  }
});

module.exports = mongoose.model('AdPerformance', AdPerformanceSchema); 