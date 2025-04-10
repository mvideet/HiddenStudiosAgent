#!/usr/bin/env node
/**
 * Campaign Import Pipeline
 * 
 * This script takes a JSON file (similar to sample_unified_request.json format)
 * and imports the data into MongoDB.
 * 
 * Usage:
 *   node import-pipeline.js <path-to-json-file>
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const { processAdImage } = require('./process-unified-request');

// Load environment variables
dotenv.config();

// Import models
const Campaign = require('./models/Campaign');
const Ad = require('./models/Ad');

// Show execution time
const startTime = Date.now();
const getElapsedTime = () => {
  const elapsed = Date.now() - startTime;
  return (elapsed / 1000).toFixed(2);
};

// Main execution function
async function importPipeline(filePath) {
  let connection = null;
  
  try {
    console.log(`[${getElapsedTime()}s] Starting import pipeline...`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Read and parse the JSON file
    console.log(`[${getElapsedTime()}s] Reading file: ${filePath}`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    console.log(`[${getElapsedTime()}s] File parsed successfully`);
    
    // Connect to MongoDB
    console.log(`[${getElapsedTime()}s] Connecting to MongoDB...`);
    connection = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`[${getElapsedTime()}s] MongoDB connected`);
    
    // Create campaign document
    const campaign = new Campaign({
      campaign_id: uuidv4(),
      campaign_name: jsonData.campaignName,
      region: jsonData.region || 'GLOBAL',
      start_time: new Date(jsonData.startDate),
      end_time: new Date(jsonData.endDate),
      games: []
    });
    
    console.log(`[${getElapsedTime()}s] Created campaign: ${campaign.campaign_name} (${campaign.campaign_id})`);
    
    // Calculate default target impressions if needed
    const totalAds = jsonData.gameSelections.reduce((sum, game) => sum + game.ads.length, 0);
    const defaultTargetImpressions = Math.floor(jsonData.targetImpressions / Math.max(1, totalAds));
    
    // Track processed ads for summary
    const processedAds = {
      total: 0,
      successful: 0,
      failed: 0
    };
    
    // Process each game and its ads
    for (const gameSelection of jsonData.gameSelections) {
      const gameEntry = {
        game_id: gameSelection.gameId,
        ads: []
      };
      
      console.log(`[${getElapsedTime()}s] Processing game: ${gameSelection.gameId}`);
      
      // Process each ad for this game
      for (const adData of gameSelection.ads) {
        processedAds.total++;
        const adName = adData.adNum || path.basename(adData.filePath, path.extname(adData.filePath));
        console.log(`[${getElapsedTime()}s] Processing ad: ${adName} from ${adData.filePath}`);
        
        try {
          // Process the image file to extract ad properties
          console.log(`[${getElapsedTime()}s] Analyzing image...`);
          const processedAdData = await processAdImage(adData.filePath, gameSelection.gameId);
          console.log(`[${getElapsedTime()}s] Image analysis complete`);
          
          // Map contrast values if needed
          const contrast = typeof processedAdData.contrast === 'number' 
            ? processedAdData.contrast 
            : mapContrastToNumber(processedAdData.contrast);
          
          // Create the Ad document in MongoDB
          const ad = new Ad({
            ad_id: processedAdData.ad_id,
            ad_type: processedAdData.ad_type,
            size: processedAdData.size,
            name: adName,
            contrast: contrast,
            product_or_brand: processedAdData.product_or_brand,
            game_id: gameSelection.gameId,
            billboard_id: adData.billboardId || null,
            ad_space: processedAdData.ad_space,
            impression_multiplier: processedAdData.impression_multiplier,
            ad_loc: adData.adLoc || null,
            campaigns: [{
              campaign_id: campaign.campaign_id,
              impressions: 0
            }],
            total_impressions: 0
          });
          
          // Save the ad to the database
          console.log(`[${getElapsedTime()}s] Saving ad to database...`);
          await ad.save();
          console.log(`[${getElapsedTime()}s] Ad saved with ID: ${ad.ad_id}`);
          
          // Add this ad to the game's ads array in the campaign
          gameEntry.ads.push({
            ad_id: ad.ad_id,
            target_impressions: adData.wantedImpressions || defaultTargetImpressions,
            current_impressions: 0
          });
          
          processedAds.successful++;
        } catch (adError) {
          console.error(`[${getElapsedTime()}s] Error processing ad ${adName}:`, adError);
          processedAds.failed++;
          // Continue with next ad instead of failing entire campaign
        }
      }
      
      // Only add games that have at least one successfully processed ad
      if (gameEntry.ads.length > 0) {
        campaign.games.push(gameEntry);
      }
    }
    
    // Save the campaign to the database
    console.log(`[${getElapsedTime()}s] Saving campaign to database...`);
    await campaign.save();
    console.log(`[${getElapsedTime()}s] Campaign saved successfully`);
    
    // Print summary
    console.log('\n======= IMPORT SUMMARY =======');
    console.log(`Campaign: ${campaign.campaign_name} (${campaign.campaign_id})`);
    console.log(`Games: ${campaign.games.length}`);
    console.log(`Ads: ${processedAds.successful}/${processedAds.total} processed successfully`);
    console.log(`Failed ads: ${processedAds.failed}`);
    console.log(`Total target impressions: ${campaign.target_impressions}`);
    console.log(`Time elapsed: ${getElapsedTime()} seconds`);
    console.log('==============================\n');
    
    return campaign;
  } catch (error) {
    console.error(`[${getElapsedTime()}s] Error in import pipeline:`, error);
    throw error;
  } finally {
    // Close MongoDB connection
    if (connection) {
      console.log(`[${getElapsedTime()}s] Closing MongoDB connection...`);
      await mongoose.connection.close();
      console.log(`[${getElapsedTime()}s] MongoDB connection closed`);
    }
  }
}

/**
 * Map contrast string values to numeric values
 * @param {string} contrastStr - String representation of contrast
 * @returns {number} - Numeric representation of contrast
 */
function mapContrastToNumber(contrastStr) {
  if (!contrastStr || typeof contrastStr !== 'string') return 1.0;
  
  const contrastMap = {
    'low': 0.5,
    'medium': 1.0,
    'high': 1.5
  };
  
  return contrastMap[contrastStr.toLowerCase()] || 1.0;
}

/**
 * Main function
 */
async function main() {
  // Set a timeout to prevent hanging
  const timeoutId = setTimeout(() => {
    console.error(`[${getElapsedTime()}s] Execution timed out after 5 minutes`);
    process.exit(1);
  }, 5 * 60 * 1000);
  
  try {
    const filePath = process.argv[2];
    
    if (!filePath) {
      console.error('Please provide a JSON file path');
      console.log('Usage: node import-pipeline.js <path-to-json-file>');
      process.exit(1);
    }
    
    await importPipeline(filePath);
    console.log(`[${getElapsedTime()}s] Import pipeline completed successfully`);
  } catch (error) {
    console.error(`[${getElapsedTime()}s] Import pipeline failed:`, error);
    process.exit(1);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { importPipeline }; 