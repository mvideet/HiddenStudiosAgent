const mongoose = require('mongoose');
const uuid = require('uuid');
const Campaign = require('./models/Campaign');
const Ad = require('./models/Ad');
const AdPerformance = require('./models/AdPerformance');

/**
 * Record impressions for an ad within a campaign
 * @param {string} campaignId - The ID of the campaign
 * @param {string} gameId - The ID of the game
 * @param {string} adId - The ID of the ad 
 * @param {number} count - Number of impressions to record (default: 1)
 * @returns {Promise<Object>} Result object with updated campaign and ad
 */
async function recordImpressions(campaignId, gameId, adId, count = 1) {
  try {
    // Find the campaign
    const campaign = await Campaign.findOne({ campaign_id: campaignId });
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    
    // Find the game within the campaign
    const game = campaign.games.find(g => g.game_id === gameId);
    if (!game) {
      throw new Error(`Game not found in campaign: ${gameId}`);
    }
    
    // Find the ad within the game
    const adEntry = game.ads.find(a => a.ad_id === adId);
    if (!adEntry) {
      throw new Error(`Ad not found in game: ${adId}`);
    }
    
    // Update the impression count in the campaign
    adEntry.current_impressions += count;
    await campaign.save();
    
    // Find or create the ad in the database
    let ad = await Ad.findOne({ ad_id: adId });
    if (!ad) {
      console.log(`Ad ${adId} not found in database, creating it...`);
      ad = new Ad({
        ad_id: adId,
        ad_type: "static",
        size: "medium",
        name: adId,
        product_or_brand: "product",
        contrast: 1.0,
        billboard_id: null,
        game_id: gameId,
        campaigns: [{
          campaign_id: campaignId,
          impressions: 0
        }],
        total_impressions: 0,
        impression_multiplier: 1.0,
        ad_space: "sidebar",
        createdAt: new Date()
      });
    }
    
    // Create a new AdPerformance record
    const adPerformance = new AdPerformance({
      performance_id: uuid.v4(),
      ad_id: adId,
      date: new Date(),
      impressions: count
    });
    
    // Save the performance record (which will trigger the post-save hook)
    await adPerformance.save();
    
    // Update the ad manually if the hook failed
    ad.total_impressions += count;
    
    // Find or create the campaign entry in ad.campaigns
    let campaignEntry = ad.campaigns.find(c => c.campaign_id === campaignId);
    if (campaignEntry) {
      campaignEntry.impressions += count;
    } else {
      ad.campaigns.push({
        campaign_id: campaignId,
        impressions: count
      });
    }
    
    // Save the updated ad
    await ad.save();
    
    // Return the updated objects
    return {
      campaign,
      ad,
      performance: adPerformance,
      updated: {
        campaignImpressions: adEntry.current_impressions,
        totalAdImpressions: ad.total_impressions
      }
    };
  } catch (error) {
    console.error('Error recording impressions:', error);
    throw error;
  }
}

/**
 * Check if a campaign has met its impression targets
 * @param {string} campaignId - The ID of the campaign to check
 * @returns {Promise<Object>} Status object with campaign completion information
 */
async function checkCampaignStatus(campaignId) {
  try {
    const campaign = await Campaign.findOne({ campaign_id: campaignId });
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    
    const isComplete = campaign.isComplete();
    const totalTargetImpressions = campaign.target_impressions;
    const totalCurrentImpressions = campaign.total_impressions;
    const percentComplete = (totalCurrentImpressions / totalTargetImpressions) * 100;
    
    // Get status of each ad
    const adStatus = [];
    for (const game of campaign.games) {
      for (const ad of game.ads) {
        const adPercentComplete = (ad.current_impressions / ad.target_impressions) * 100;
        adStatus.push({
          game_id: game.game_id,
          ad_id: ad.ad_id,
          target_impressions: ad.target_impressions,
          current_impressions: ad.current_impressions,
          percent_complete: adPercentComplete,
          is_complete: ad.current_impressions >= ad.target_impressions
        });
      }
    }
    
    return {
      campaign_id: campaignId,
      is_complete: isComplete,
      total_target_impressions: totalTargetImpressions,
      total_current_impressions: totalCurrentImpressions,
      percent_complete: percentComplete,
      ad_status: adStatus
    };
  } catch (error) {
    console.error('Error checking campaign status:', error);
    throw error;
  }
}

module.exports = {
  recordImpressions,
  checkCampaignStatus
}; 