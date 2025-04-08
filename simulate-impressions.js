const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Get random number between min and max (inclusive)
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Simulate impressions for a campaign
const simulateImpressions = async () => {
  try {
    console.log('Fetching campaigns...');
    const campaignsResponse = await axios.get(`${API_URL}/campaigns`);
    const campaigns = campaignsResponse.data.data;
    
    if (campaigns.length === 0) {
      console.log('No campaigns found. Please create a campaign first.');
      return;
    }
    
    console.log(`Found ${campaigns.length} campaigns`);
    const campaign = campaigns[0]; // Use the first campaign
    
    console.log(`Simulating impressions for campaign: ${campaign.campaign_name} (${campaign.campaign_id})`);
    
    // Get all ads for this campaign
    let allAdIds = [];
    for (const game of campaign.games) {
      allAdIds = [...allAdIds, ...game.ads];//this is a list of ad ids
    }
    
    console.log(`Campaign has ${allAdIds.length} ads across ${campaign.games.length} games`);
    
    // Generate random impressions for each ad
    for (const adId of allAdIds) {
      const impressions = getRandomInt(100, 1000);
      console.log(`Recording ${impressions} impressions for ad ${adId}`);
      
      await axios.post(`${API_URL}/performances/record`, {
        ad_id: adId,
        impressions: impressions
      });
    }
    
    // Get updated campaign performance
    const performanceResponse = await axios.get(`${API_URL}/campaigns/${campaign.campaign_id}/performance`);
    const performance = performanceResponse.data.data;
    
    console.log('\nUpdated Campaign Performance:');
    console.log(`Campaign: ${performance.campaign_name}`);
    console.log(`Target Impressions: ${performance.target_impressions}`);
    console.log(`Total Impressions: ${performance.total_impressions}`);
    console.log(`Remaining Impressions: ${performance.remaining_impressions}`);
    
    console.log('\nPerformance by Game:');
    for (const gameId in performance.performance_by_game) {
      const gamePerformance = performance.performance_by_game[gameId];
      console.log(`- Game ${gameId}: ${gamePerformance.total_impressions} impressions`);
    }
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
};

// Execute the simulation
simulateImpressions(); 