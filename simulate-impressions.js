const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Get random number between min and max (inclusive)
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Simulate impressions for a campaign
const simulateImpressions = async () => {
  try {
    console.log('Fetching active campaigns...');
    const campaignsResponse = await axios.get(`${API_URL}/campaigns/active`);
    const campaigns = campaignsResponse.data.data;
    
    if (campaigns.length === 0) {
      console.log('No active campaigns found. Please create a campaign first.');
      return;
    }
    
    console.log(`Found ${campaigns.length} active campaigns`);
    
    // Select a campaign - either random or the first one
    const campaignIndex = getRandomInt(0, campaigns.length - 1);
    const selectedCampaign = campaigns[campaignIndex];
    
    console.log(`Selected campaign: ${selectedCampaign.campaign_name} (${selectedCampaign.campaign_id})`);
    
    // Get detailed campaign info with ads
    const campaignDetailResponse = await axios.get(`${API_URL}/campaign/${selectedCampaign.campaign_id}/status`);
    const campaignDetail = campaignDetailResponse.data.data;
    
    console.log(`Campaign has ads across ${campaignDetail.ad_status.length} slots`);
    
    // Generate random impressions for each ad
    for (const adStatus of campaignDetail.ad_status) {
      // Generate a random number of impressions, but make sure we don't go over the target
      const remainingImpressions = adStatus.target_impressions - adStatus.current_impressions;
      
      if (remainingImpressions <= 0) {
        console.log(`Ad ${adStatus.ad_id} has already met its target impressions. Skipping.`);
        continue;
      }
      
      // Generate random impressions between 1% and 10% of the remaining target
      const maxImpression = Math.max(100, Math.floor(remainingImpressions * 0.1));
      const impressions = getRandomInt(Math.min(10, maxImpression), maxImpression);
      
      console.log(`Recording ${impressions} impressions for ad ${adStatus.ad_id} in game ${adStatus.game_id}`);
      
      // Use the new record-impressions endpoint
      await axios.post(`${API_URL}/record-impressions`, {
        campaignId: selectedCampaign.campaign_id,
        gameId: adStatus.game_id,
        adId: adStatus.ad_id,
        count: impressions
      });
    }
    
    // Get updated campaign status
    const updatedStatusResponse = await axios.get(`${API_URL}/campaign/${selectedCampaign.campaign_id}/status`);
    const updatedStatus = updatedStatusResponse.data.data;
    
    console.log('\nUpdated Campaign Status:');
    console.log(`Campaign: ${selectedCampaign.campaign_name}`);
    console.log(`Total Target Impressions: ${updatedStatus.total_target_impressions}`);
    console.log(`Total Current Impressions: ${updatedStatus.total_current_impressions}`);
    console.log(`Overall Completion: ${updatedStatus.percent_complete.toFixed(2)}%`);
    console.log(`Campaign Complete: ${updatedStatus.is_complete ? 'Yes' : 'No'}`);
    
    console.log('\nDetailed Ad Status:');
    for (const adStatus of updatedStatus.ad_status) {
      console.log(`- Ad ${adStatus.ad_id} in game ${adStatus.game_id}:`);
      console.log(`  Target: ${adStatus.target_impressions} impressions`);
      console.log(`  Current: ${adStatus.current_impressions} impressions`);
      console.log(`  Progress: ${adStatus.percent_complete.toFixed(2)}%`);
      console.log(`  Complete: ${adStatus.is_complete ? 'Yes' : 'No'}`);
    }
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
};

// Execute the simulation
simulateImpressions(); 