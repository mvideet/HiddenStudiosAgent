const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const uuid = require('uuid');

async function processUnifiedRequest(requestData, outputDir = './processed_data') {
  try {
    console.log('Processing unified campaign request...');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const processedData = {
      campaign_id: uuid.v4(),
      campaign_name: requestData.campaignName,
      region: requestData.region || 'GLOBAL',
      start_time: new Date(requestData.startDate),
      end_time: new Date(requestData.endDate),
      games: []
    };
    
    // Process each game selection
    for (const gameSelection of requestData.gameSelections) {
      const gameData = {
        game_id: gameSelection.gameId,
        ads: []
      };
      
      // Process each ad image for this game
      for (const ad of gameSelection.ads) {
        // Process the image and get ad data
        const adData = await processAdImage(ad.filePath, gameSelection.gameId);
        
        // Add to game's ads with target impressions
        gameData.ads.push({
          ad_id: adData.ad_id,
          target_impressions: ad.wantedImpressions || Math.floor(requestData.targetImpressions / 10), // Default if not specified
          current_impressions: 0
        });
        
        // Save the processed ad data to a JSON file
        const adFilePath = path.join(outputDir, `${adData.ad_id}.json`);
        fs.writeFileSync(adFilePath, JSON.stringify(adData, null, 2));
        console.log(`Processed ad saved to ${adFilePath}`);
      }
      
      processedData.games.push(gameData);
    }
    
    const campaignFilePath = path.join(outputDir, `${processedData.campaign_id}.json`);
    fs.writeFileSync(campaignFilePath, JSON.stringify(processedData, null, 2));
    console.log(`Processed campaign saved to ${campaignFilePath}`);
    
    return processedData;
    
  } catch (error) {
    console.error('Error processing unified request:', error);
    throw error;
  }
}

/**
 * Process a single ad image using the Python image processor
 * @param {string} imagePath - Path to the image file
 * @param {string} gameId - ID of the game this ad belongs to
 * @returns {Promise<Object>} Processed ad data
 */
function processAdImage(imagePath, gameId) {
  return new Promise((resolve, reject) => {
    // Extract the file name without extension to use as ad name
    const adName = path.basename(imagePath, path.extname(imagePath));
    
    // Create mock data if we can't use Python
    const mockImageProcessor = () => {
      console.log(`Creating mock data for ${imagePath} (Python processor not available)`);
      return {
        ad_id: `ad_${uuid.v4().slice(0, 8)}`,
        ad_type: "static",
        size: "medium",
        name: adName,
        product_or_brand: "product",
        contrast: "medium",
        billboard_id: null,
        game_id: gameId,
        ad_space: "sidebar",
        campaigns: [],
        total_impressions: 0,
        impression_multiplier: 1.2,
        createdAt: new Date().toISOString()
      };
    };
    
    // Try using Python processor with our dedicated script
    try {
      console.log(`Processing image: ${imagePath}`);
      
      // Use the dedicated Python script for image processing
      const pythonProcess = spawn('python', [
        'process_image.py',  // Use our standalone script
        imagePath,
        adName,
        gameId || ""
      ]);
      
      let outputData = '';
      let errorData = '';
      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error(`Python stderr: ${data.toString()}`);
      });
      
      // Handle process completion
      pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        
        try {
          if (outputData.trim()) {
            console.log(`Python output: ${outputData.trim()}`);
            const adData = JSON.parse(outputData);
            if (adData.error) {
              console.log(`Python error: ${adData.error}. Using mock data instead.`);
              resolve(mockImageProcessor());
            } else {
              console.log("Successfully processed image with Python!");
              resolve(adData);
            }
          } else {
            console.log(`No output from Python. Using mock data instead.`);
            if (errorData) {
              console.log(`Python stderr: ${errorData}`);
            }
            resolve(mockImageProcessor());
          }
        } catch (error) {
          console.log(`Error parsing Python output: ${error.message}. Using mock data instead.`);
          console.log(`Raw Python output: ${outputData}`);
          resolve(mockImageProcessor());
        }
      });
      
      // Handle Python startup errors
      pythonProcess.on('error', (err) => {
        console.log(`Failed to start Python process: ${err.message}. Using mock data instead.`);
        resolve(mockImageProcessor());
      });
    } catch (error) {
      // Fallback to mock data
      console.log(`Failed to use Python processor: ${error.message}. Using mock data instead.`);
      resolve(mockImageProcessor());
    }
  });
}

/**
 * Process a unified request from a file
 * @param {string} filePath - Path to the unified request JSON file
 * @returns {Promise<Object>} Processed campaign data
 */
async function processUnifiedRequestFile(filePath) {
  try {
    // Read and parse the JSON file
    const fileData = fs.readFileSync(filePath, 'utf8');
    const requestData = JSON.parse(fileData);
    
    // Process the request
    return await processUnifiedRequest(requestData);
  } catch (error) {
    console.error('Error processing unified request file:', error);
    throw error;
  }
}

// Example usage when running this file directly
if (require.main === module) {
  const filePath = process.argv[2] || './sample_unified_request.json';
  console.log(`Processing unified request from ${filePath}...`);
  
  processUnifiedRequestFile(filePath)
    .then(result => {
      console.log('Processing completed successfully!');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('Processing failed:', error);
      process.exit(1);
    });
}

module.exports = {
  processUnifiedRequest,
  processUnifiedRequestFile,
  processAdImage
}; 