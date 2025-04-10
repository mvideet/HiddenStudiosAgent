const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const { recordImpressions, checkCampaignStatus } = require('./track-impressions');

// Load environment variables
dotenv.config();

// Models
const AdPerformance = require('./models/AdPerformance');
const Campaign = require('./models/Campaign');
const Ad = require('./models/Ad');

// Show execution time
const startTime = Date.now();
const getElapsedTime = () => {
  const elapsed = Date.now() - startTime;
  return (elapsed / 1000).toFixed(2);
};

/**
 * Maps request ad names to actual ad names in database
 * @param {string} requestAdName - Ad name from the request (e.g., BoxAd1)
 * @returns {string} - Corresponding name in the database (e.g., ad1)
 */
function mapAdName(requestAdName) {
  console.log(`[${getElapsedTime()}s] Mapping request ad name: ${requestAdName}`);
  
  // Extract the number from the end of the request ad name (more flexible pattern)
  const match = requestAdName.match(/[0-9]+$/);
  if (match) {
    const mappedName = `ad${match[0]}`;
    console.log(`[${getElapsedTime()}s] Mapped to: ${mappedName}`);
    return mappedName;
  }
  
  // If no number found at the end, look for any number in the name
  const anyNumberMatch = requestAdName.match(/[0-9]+/);
  if (anyNumberMatch) {
    const mappedName = `ad${anyNumberMatch[0]}`;
    console.log(`[${getElapsedTime()}s] Found number anywhere, mapped to: ${mappedName}`);
    return mappedName;
  }
  
  console.log(`[${getElapsedTime()}s] No mapping found, using original name: ${requestAdName}`);
  return requestAdName;
}

/**
 * Process impressions from a JSON file
 * @param {string} filePath - Path to the impression request JSON file
 */
async function processImpressions(filePath) {
  try {
    console.log(`[${getElapsedTime()}s] Processing impression request from ${filePath}...`);
    
    // Read and parse the JSON file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const requestData = JSON.parse(fileContent);
    
    // Validate the request data
    if (!requestData.impressions || !Array.isArray(requestData.impressions)) {
      throw new Error('Invalid impression request format');
    }
    
    // Connect to MongoDB
    console.log(`[${getElapsedTime()}s] Connecting to MongoDB...`);
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`[${getElapsedTime()}s] Connected to MongoDB`);
    
    // Process all impressions
    const results = {
      total_impressions: 0,
      successful: 0,
      failed: 0,
      ads_updated: 0,
      campaigns_updated: 0
    };
    
    // Keep track of updated campaigns for final status report
    const updatedCampaignIds = new Set();
    
    // Process each impression entry
    for (const impression of requestData.impressions) {
      const gameId = impression.game_id;
      const requestAdName = impression.ad_name;
      const dbAdName = mapAdName(requestAdName);
      const count = impression.count || 1;
      
      console.log(`[${getElapsedTime()}s] Processing ${count} impressions for ad ${requestAdName} (mapped to ${dbAdName}) in game ${gameId}`);
      
      try {
        // Find ad by name and game ID
        let ad = await Ad.findOne({ 
          name: requestAdName,  // We can now search directly by the ad name
          game_id: gameId
        });
        
        if (!ad) {
          console.warn(`[${getElapsedTime()}s] No ad found with name ${requestAdName} in game ${gameId}, trying alternative approaches...`);
          
          // Try to find by ad_loc if available
          if (impression.ad_loc) {
            ad = await Ad.findOne({
              game_id: gameId,
              ad_loc: impression.ad_loc
            });
            
            if (ad) {
              console.log(`[${getElapsedTime()}s] Found ad by location ${impression.ad_loc}: ${ad.name} (${ad.ad_id})`);
            }
          }
          
          // If still not found, try other approaches
          if (!ad) {
            // Try to find by similar name (case insensitive)
            const adsByName = await Ad.find({ game_id: gameId });
            console.log(`[${getElapsedTime()}s] Found ${adsByName.length} ads in game ${gameId}`);
            
            // Log all available ads
            adsByName.forEach(a => {
              console.log(`[${getElapsedTime()}s] - Available ad: ${a.name} (${a.ad_id}), Location: ${a.ad_loc || 'None'}`);
            });
            
            // Try matching by name containing the number
            let matchedAd = null;
            const numberMatch = requestAdName.match(/[0-9]+/);
            if (numberMatch) {
              const number = numberMatch[0];
              matchedAd = adsByName.find(a => a.name.includes(number));
              if (matchedAd) {
                console.log(`[${getElapsedTime()}s] Found ad by number match: ${matchedAd.name} (${matchedAd.ad_id})`);
              }
            }
            
            // If still no match, try the first ad in the game as a fallback
            if (!matchedAd && adsByName.length > 0) {
              matchedAd = adsByName[0];
              console.log(`[${getElapsedTime()}s] Using first available ad as fallback: ${matchedAd.name} (${matchedAd.ad_id})`);
            }
            
            if (!matchedAd) {
              console.warn(`[${getElapsedTime()}s] No ads found for game ${gameId}, skipping`);
              results.failed++;
              continue;
            }
            
            ad = matchedAd;
          }
        }
        
        console.log(`[${getElapsedTime()}s] Found ad with ID: ${ad.ad_id}`);
        
        // Find all campaigns that include this ad
        const campaigns = await Campaign.find({ 'games.ads.ad_id': ad.ad_id });
        if (campaigns.length === 0) {
          console.warn(`[${getElapsedTime()}s] No campaigns found for ad ${requestAdName} (${ad.ad_id}), skipping`);
          results.failed++;
          continue;
        }
        
        console.log(`[${getElapsedTime()}s] Found ${campaigns.length} campaigns for ad ${requestAdName} (${ad.ad_id})`);
        
        // Create a new AdPerformance record
        const adPerformance = new AdPerformance({
          performance_id: impression.performance_id || uuidv4(),
          ad_id: ad.ad_id,
          date: impression.date ? new Date(impression.date) : new Date(),
          impressions: count,
          createdAt: requestData.created_at ? new Date(requestData.created_at) : new Date()
        });
        
        // Save the performance record (this will trigger the post-save hook)
        await adPerformance.save();
        console.log(`[${getElapsedTime()}s] Created AdPerformance record for ${requestAdName} with ID: ${adPerformance.performance_id}`);
        
        // Track which campaigns were updated (for reporting)
        campaigns.forEach(campaign => {
          updatedCampaignIds.add(campaign.campaign_id);
          results.campaigns_updated++;
        });
        
        results.successful++;
        results.total_impressions += count;
        results.ads_updated++;
      } catch (error) {
        console.error(`[${getElapsedTime()}s] Error processing impressions for ad ${requestAdName}:`, error.message);
        results.failed++;
      }
    }
    
    // Get final status for all updated campaigns
    console.log(`[${getElapsedTime()}s] Getting status for ${updatedCampaignIds.size} updated campaigns`);
    
    const campaignStatuses = [];
    
    for (const campaignId of updatedCampaignIds) {
      // Get campaign status
      const campaign = await Campaign.findOne({ campaign_id: campaignId });
      
      // Skip if campaign no longer exists
      if (!campaign) continue;
      
      // Calculate completion metrics
      const totalTargetImpressions = campaign.target_impressions;
      let totalCurrentImpressions = 0;
      
      // Get status of each ad
      const adStatus = [];
      for (const game of campaign.games) {
        for (const ad of game.ads) {
          const adPercentComplete = (ad.current_impressions / ad.target_impressions) * 100;
          totalCurrentImpressions += ad.current_impressions;
          
          // Find the ad to get its name
          const adDoc = await Ad.findOne({ ad_id: ad.ad_id });
          const adName = adDoc ? adDoc.name : ad.ad_id;
          
          // Try to find the original request ad name that maps to this DB ad name
          const requestAdName = requestData.impressions.find(imp => mapAdName(imp.ad_name) === adName)?.ad_name || adName;
          
          adStatus.push({
            game_id: game.game_id,
            ad_id: ad.ad_id,
            ad_name: requestAdName,
            db_name: adName,
            target_impressions: ad.target_impressions,
            current_impressions: ad.current_impressions,
            percent_complete: adPercentComplete,
            is_complete: ad.current_impressions >= ad.target_impressions
          });
        }
      }
      
      const percentComplete = (totalCurrentImpressions / totalTargetImpressions) * 100;
      const isComplete = campaign.isComplete();
      
      campaignStatuses.push({
        campaign_id: campaignId,
        campaign_name: campaign.campaign_name,
        is_complete: isComplete,
        total_target_impressions: totalTargetImpressions,
        total_current_impressions: totalCurrentImpressions,
        percent_complete: percentComplete,
        ad_status: adStatus
      });
    }
    
    // Print summary
    console.log('\n======= IMPRESSION PROCESSING SUMMARY =======');
    console.log(`Batch ID: ${requestData.batch_id || 'N/A'}`);
    console.log(`Created At: ${requestData.created_at || new Date().toISOString()}`);
    console.log(`Total impressions recorded: ${results.total_impressions}`);
    console.log(`Successful ad updates: ${results.successful}`);
    console.log(`Failed ad updates: ${results.failed}`);
    console.log(`Campaigns updated: ${updatedCampaignIds.size}`);
    
    // Show detailed status for each campaign
    console.log('\nCampaign Statuses:');
    for (const status of campaignStatuses) {
      console.log(`\nCampaign: ${status.campaign_name} (${status.campaign_id})`);
      console.log(`Completion: ${status.percent_complete.toFixed(2)}%`);
      console.log(`Is Complete: ${status.is_complete ? 'Yes' : 'No'}`);
      
      console.log('Ad Status:');
      status.ad_status.forEach(ad => {
        console.log(`- Ad ${ad.ad_name} (${ad.ad_id}, DB name: ${ad.db_name}):`);
        console.log(`  Target: ${ad.target_impressions} impressions`);
        console.log(`  Current: ${ad.current_impressions} impressions`);
        console.log(`  Progress: ${ad.percent_complete.toFixed(2)}%`);
        console.log(`  Complete: ${ad.is_complete ? 'Yes' : 'No'}`);
      });
    }
    
    console.log('===========================================\n');
    
    return {
      results,
      campaignStatuses
    };
  } catch (error) {
    console.error(`[${getElapsedTime()}s] Error processing impressions:`, error);
    throw error;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log(`[${getElapsedTime()}s] MongoDB connection closed`);
    }
  }
}

/**
 * Main function to run the script
 */
async function main() {
  const filePath = process.argv[2] || './sample_impression_unified_request.json';
  
  try {
    await processImpressions(filePath);
    console.log(`[${getElapsedTime()}s] Impression processing completed successfully`);
  } catch (error) {
    console.error(`[${getElapsedTime()}s] Impression processing failed:`, error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = { processImpressions }; 