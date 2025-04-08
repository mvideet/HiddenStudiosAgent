const fs = require('fs');
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Load the sample JSON data
const loadSampleData = () => {
  try {
    const rawData = fs.readFileSync('./sample_unified_request.json');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error loading sample data:', error);
    process.exit(1);
  }
};

// Upload data to server
const uploadUnifiedCampaign = async () => {
  try {
    console.log('Checking available games...');
    const gamesResponse = await axios.get(`${API_URL}/games`);
    const games = gamesResponse.data.data;
    
    console.log('Available games:');
    games.forEach(game => {
      console.log(`- ${game.title} (ID: ${game.game_id})`);
    });
    
    // Step 2: Get billboards for each game in the campaign
    const campaignData = loadSampleData();
    
    // For each game in our campaign, get billboard IDs
    for (const gameSelection of campaignData.gameSelections) {
      console.log(`\nFetching billboards for game ${gameSelection.gameId}...`);
      const billboardsResponse = await axios.get(`${API_URL}/billboards/game/${gameSelection.gameId}`);
      const billboards = billboardsResponse.data.data;
      
      console.log(`Found ${billboards.length} billboards for game ${gameSelection.gameId}`);
      
      // Assign billboards to each ad in this game
      for (let i = 0; i < gameSelection.ads.length; i++) {
        if (i < billboards.length) {
          gameSelection.ads[i].billboardId = billboards[i].billboard_id;
          console.log(`Assigned billboard ${billboards[i].billboard_id} to ad ${i+1}`);
        } else {
          console.error(`Not enough billboards for game ${gameSelection.gameId}`);
          process.exit(1);
        }
      }
    }
    
    console.log('\nUploading campaign data...');
    
    // Step 3: Submit the campaign
    const response = await axios.post(`${API_URL}/submit-campaign`, campaignData);
    
    console.log('\nCampaign submitted successfully!');
    console.log('Campaign details:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
};

// Execute the upload
uploadUnifiedCampaign(); 