const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { processUnifiedRequestFile } = require('./process-unified-request');
const { recordImpressions, checkCampaignStatus } = require('./track-impressions');

// Load environment variables
dotenv.config();

// MongoDB connection string
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/adplatform';

/**
 * Run a Python script and return its output
 */
function runPythonScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [scriptPath]);
    
    let output = '';
    let error = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}: ${error}`));
      } else {
        resolve(output);
      }
    });
  });
}

/**
 * Example of processing a campaign and tracking impressions
 */
async function runExample() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
    });
    console.log('Connected to MongoDB');
    
    // Process a unified request
    console.log('\n1. Processing unified request...');
    const campaignData = await processUnifiedRequestFile('./sample_unified_request.json');
    
    // Create the campaign in the database
    console.log('\n2. Saving campaign to database...');
    const Campaign = mongoose.model('Campaign');
    const campaign = new Campaign(campaignData);
    await campaign.save();
    console.log(`Campaign saved with ID: ${campaign.campaign_id}`);
    
    // Display initial campaign status
    console.log('\n3. Initial campaign status:');
    const initialStatus = await checkCampaignStatus(campaign.campaign_id);
    console.log(`Campaign is ${initialStatus.percent_complete.toFixed(2)}% complete`);
    
    // Simulate recording impressions for ads
    console.log('\n4. Simulating impressions for ads...');
    
    // Record impressions for the first ad
    const firstGame = campaign.games[0];
    const firstAd = firstGame.ads[0];
    console.log(`Recording 10000 impressions for ad ${firstAd.ad_id} in game ${firstGame.game_id} (25% of target)`);
    await recordImpressions(campaign.campaign_id, firstGame.game_id, firstAd.ad_id, 10000);
    
    // Record impressions for the second ad
    const secondAd = firstGame.ads[1];
    console.log(`Recording 15000 impressions for ad ${secondAd.ad_id} in game ${firstGame.game_id} (50% of target)`);
    await recordImpressions(campaign.campaign_id, firstGame.game_id, secondAd.ad_id, 15000);
    
    // Record impressions for the third ad
    const secondGame = campaign.games[1];
    const thirdAd = secondGame.ads[0];
    console.log(`Recording 30000 impressions for ad ${thirdAd.ad_id} in game ${secondGame.game_id} (100% of target)`);
    await recordImpressions(campaign.campaign_id, secondGame.game_id, thirdAd.ad_id, 30000);
    
    // Check updated status
    console.log('\n5. Updated campaign status:');
    const updatedStatus = await checkCampaignStatus(campaign.campaign_id);
    console.log(`Campaign is now ${updatedStatus.percent_complete.toFixed(2)}% complete`);
    
    // Show detailed status for all ads
    console.log('\n6. Detailed ad status:');
    updatedStatus.ad_status.forEach(ad => {
      console.log(`Ad ${ad.ad_id} in game ${ad.game_id}:`);
      console.log(`  - Target: ${ad.target_impressions} impressions`);
      console.log(`  - Current: ${ad.current_impressions} impressions`);
      console.log(`  - Progress: ${ad.percent_complete.toFixed(2)}%`);
      console.log(`  - Complete: ${ad.is_complete ? 'Yes' : 'No'}`);
    });
    
    // Complete the remaining impressions to finish the campaign
    console.log('\n7. Completing remaining impressions...');
    
    // Get the remaining impressions needed for the first ad
    const remainingFirstAd = firstAd.target_impressions - 10000;
    console.log(`Recording ${remainingFirstAd} more impressions for ad ${firstAd.ad_id} (completing it)`);
    await recordImpressions(campaign.campaign_id, firstGame.game_id, firstAd.ad_id, remainingFirstAd);
    
    // Get the remaining impressions needed for the second ad
    const remainingSecondAd = secondAd.target_impressions - 15000;
    console.log(`Recording ${remainingSecondAd} more impressions for ad ${secondAd.ad_id} (completing it)`);
    await recordImpressions(campaign.campaign_id, firstGame.game_id, secondAd.ad_id, remainingSecondAd);
    
    // Check final status
    console.log('\n8. Final campaign status:');
    const finalStatus = await checkCampaignStatus(campaign.campaign_id);
    console.log(`Campaign is now ${finalStatus.percent_complete.toFixed(2)}% complete`);
    console.log(`Campaign is complete: ${finalStatus.is_complete ? 'Yes' : 'No'}`);
    
    // Show detailed status for all ads
    console.log('\n9. Final ad status:');
    finalStatus.ad_status.forEach(ad => {
      console.log(`Ad ${ad.ad_id} in game ${ad.game_id}:`);
      console.log(`  - Target: ${ad.target_impressions} impressions`);
      console.log(`  - Current: ${ad.current_impressions} impressions`);
      console.log(`  - Progress: ${ad.percent_complete.toFixed(2)}%`);
      console.log(`  - Complete: ${ad.is_complete ? 'Yes' : 'No'}`);
    });
    
    console.log('\nExample completed successfully');
  } catch (error) {
    console.error('Error running example:', error);
  } finally {
    // Disconnect from MongoDB
    if (mongoose.connection.readyState) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample()
    .then(() => console.log('Done'))
    .catch(err => console.error('Error:', err));
}

module.exports = { runExample }; 