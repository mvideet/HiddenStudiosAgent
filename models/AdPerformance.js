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
      // Increment the ad's total impressions
      ad.total_impressions += this.impressions;
      
      // Find all campaigns that include this ad
      const campaigns = await Campaign.find({ 'games.ads.ad_id': this.ad_id });
      
      // Update campaign-specific impressions in the Ad model
      for (let i = 0; i < campaigns.length; i++) {
        const campaign = campaigns[i];
        
        // Find or create campaign entry in ad.campaigns
        let campaignEntry = ad.campaigns.find(c => c.campaign_id === campaign.campaign_id);
        if (campaignEntry) {
          campaignEntry.impressions += this.impressions;
        } else {
          ad.campaigns.push({
            campaign_id: campaign.campaign_id,
            impressions: this.impressions
          });
        }
        
        // Update the campaign's ad entry current_impressions
        let updated = false;
        for (const game of campaign.games) {
          for (const adEntry of game.ads) {
            if (adEntry.ad_id === this.ad_id) {
              adEntry.current_impressions += this.impressions;
              updated = true;
              break;
            }
          }
          if (updated) break;
        }
        
        // Save the updated campaign
        await campaign.save();
      }
      
      // Save the updated ad
      await ad.save();
    }
  } catch (error) {
    console.error('Error updating impression counts:', error);
  }
});

module.exports = mongoose.model('AdPerformance', AdPerformanceSchema); 