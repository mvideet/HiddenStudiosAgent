const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenv.config();

// Import models
const Game = require('./models/Game');
const Ad = require('./models/Ad');
const Campaign = require('./models/Campaign');
const AdPerformance = require('./models/AdPerformance');
const Billboard = require('./models/Billboard');

// Import the impression tracking utilities
const { recordImpressions, checkCampaignStatus } = require('./track-impressions');
const { processUnifiedRequest } = require('./process-unified-request');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Atlas URI
const MONGODB_URI = `mongodb+srv://HS_vm:${process.env.DB_PASSWORD}@hs.f50oxcf.mongodb.net/gameDB?retryWrites=true&w=majority&appName=HS`;

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
})
  .then(() => console.log('MongoDB Atlas Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

// -------------- Game Routes --------------
// Create a new game
app.post('/api/games', async (req, res) => {
  try {
    const { title, region, platform, plays, thumbnail_url } = req.body;
    
    const newGame = new Game({
      game_id: `game_${uuidv4().slice(0, 8)}`,
      title,
      region,
      platform,
      plays,
      thumbnail_url
    });
    const savedGame = await newGame.save();
    res.status(201).json({
      success: true,
      data: savedGame
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get all games
app.get('/api/games', async (req, res) => {
  try {
    const games = await Game.find();
    res.status(200).json({
      success: true,
      count: games.length,
      data: games
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get a single game
app.get('/api/games/:id', async (req, res) => {
  try {
    const game = await Game.findOne({ game_id: req.params.id });
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: game
    });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// -------------- Ad Routes --------------
// Create a new ad
app.post('/api/ads', async (req, res) => {
  try {
    const { ad_type, size, brand_name, product_name, colors } = req.body;
    
    const newAd = new Ad({
      ad_id: `ad_${uuidv4().slice(0, 8)}`,
      ad_type,
      size,
      brand_name,
      product_name,
      colors
    });
    
    const savedAd = await newAd.save();
    
    res.status(201).json({
      success: true,
      data: savedAd
    });
  } catch (error) {
    console.error('Error creating ad:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get all ads
app.get('/api/ads', async (req, res) => {
  try {
    const ads = await Ad.find();
    res.status(200).json({
      success: true,
      count: ads.length,
      data: ads
    });
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get a single ad
app.get('/api/ads/:id', async (req, res) => {
  try {
    const ad = await Ad.findOne({ ad_id: req.params.id });
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        error: 'Ad not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: ad
    });
  } catch (error) {
    console.error('Error fetching ad:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get a single ad with its campaigns
app.get('/api/ads/:id/with-campaigns', async (req, res) => {
  try {
    const ad = await Ad.findOne({ ad_id: req.params.id });
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        error: 'Ad not found'
      });
    }
    
    const campaigns = await Campaign.find({ ad_id: ad.ad_id });
    
    res.status(200).json({
      success: true,
      data: {
        ad,
        campaigns
      }
    });
  } catch (error) {
    console.error('Error fetching ad with campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// -------------- Campaign Routes --------------
// Create a new campaign
app.post('/api/campaigns', async (req, res) => {
  try {
    const { campaign_name, ad_ids, game_id, start_time, end_time, target_impressions } = req.body;
    
    // Verify that game_id exists
    const game = await Game.findOne({ game_id });
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    // Ensure ad_ids is an array
    const adIdArray = Array.isArray(ad_ids) ? ad_ids : [ad_ids];
    
    // Verify all ads exist
    const adPromises = adIdArray.map(ad_id => Ad.findOne({ ad_id }));
    const ads = await Promise.all(adPromises);
    
    const missingAds = ads.some(ad => !ad);
    if (missingAds) {
      return res.status(404).json({
        success: false,
        error: 'One or more ads not found'
      });
    }
    
    const newCampaign = new Campaign({
      campaign_id: `camp_${uuidv4().slice(0, 8)}`,
      campaign_name,
      ad_ids: adIdArray,
      game_id,
      start_time,
      end_time,
      target_impressions
    });
    
    const savedCampaign = await newCampaign.save();
    
    // Update all ads with reference to this campaign
    const updatePromises = ads.map(ad => {
      ad.campaigns = ad.campaigns || [];
      ad.campaigns.push(savedCampaign.campaign_id);
      return ad.save();
    });
    
    await Promise.all(updatePromises);
    
    res.status(201).json({
      success: true,
      data: savedCampaign
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get all campaigns
app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await Campaign.find();
    res.status(200).json({
      success: true,
      count: campaigns.length,
      data: campaigns
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get a single campaign
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ campaign_id: req.params.id });
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get a single campaign with its ads
app.get('/api/campaigns/:id/with-ads', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ campaign_id: req.params.id });
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    // Fetch all ads associated with this campaign
    const ads = await Ad.find({ ad_id: { $in: campaign.ad_ids } });
    
    res.status(200).json({
      success: true,
      data: {
        campaign,
        ads
      }
    });
  } catch (error) {
    console.error('Error fetching campaign with ads:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Add an ad to an existing campaign
app.post('/api/campaigns/:campaignId/ads', async (req, res) => {
  try {
    const { ad_id } = req.body;
    
    if (!ad_id) {
      return res.status(400).json({
        success: false,
        error: 'Ad ID is required'
      });
    }
    
    // Find the campaign
    const campaign = await Campaign.findOne({ campaign_id: req.params.campaignId });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    // Find the ad
    const ad = await Ad.findOne({ ad_id });
    if (!ad) {
      return res.status(404).json({
        success: false,
        error: 'Ad not found'
      });
    }
    
    // Check if ad is already in campaign
    if (campaign.ad_ids.includes(ad_id)) {
      return res.status(400).json({
        success: false,
        error: 'Ad is already part of this campaign'
      });
    }
    
    // Add ad to campaign
    campaign.ad_ids.push(ad_id);
    await campaign.save();
    
    // Add campaign to ad's campaigns array
    ad.campaigns = ad.campaigns || [];
    if (!ad.campaigns.includes(campaign.campaign_id)) {
      ad.campaigns.push(campaign.campaign_id);
      await ad.save();
    }
    
    res.status(200).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Error adding ad to campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// -------------- Ad Performance Routes --------------
// Create a new ad performance record
app.post('/api/performances', async (req, res) => {
  try {
    const { ad_id, game_id, date, impressions } = req.body;
    
    // Verify that ad_id and game_id exist
    const ad = await Ad.findOne({ ad_id });
    const game = await Game.findOne({ game_id });
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        error: 'Ad not found'
      });
    }
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    const newPerformance = new AdPerformance({
      performance_id: `perf_${uuidv4().slice(0, 8)}`,
      ad_id,
      game_id,
      date,
      impressions
    });
    
    const savedPerformance = await newPerformance.save();
    
    res.status(201).json({
      success: true,
      data: savedPerformance
    });
  } catch (error) {
    console.error('Error creating performance record:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Record impressions for an ad
app.post('/api/performances/record', async (req, res) => {
  try {
    const { ad_id, impressions } = req.body;
    
    if (!ad_id || impressions === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Check if ad exists
    const ad = await Ad.findOne({ ad_id });
    if (!ad) {
      return res.status(404).json({
        success: false,
        error: 'Ad not found'
      });
    }
    
    // Create a new performance record
    const newPerformance = new AdPerformance({
      performance_id: `perf_${uuidv4().slice(0, 8)}`,
      ad_id: ad_id,
      date: new Date(),
      impressions: impressions
    });
    
    const savedPerformance = await newPerformance.save();
    
    // The impression counts for the ad and campaigns will be updated by the post-save hook
    
    res.status(201).json({
      success: true,
      data: savedPerformance
    });
  } catch (error) {
    console.error('Error recording impressions:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get all performance records
app.get('/api/performances', async (req, res) => {
  try {
    const performances = await AdPerformance.find();
    res.status(200).json({
      success: true,
      count: performances.length,
      data: performances
    });
  } catch (error) {
    console.error('Error fetching performances:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get performance records for a specific ad
app.get('/api/performances/ad/:id', async (req, res) => {
  try {
    const performances = await AdPerformance.find({ ad_id: req.params.id });
    
    res.status(200).json({
      success: true,
      count: performances.length,
      data: performances
    });
  } catch (error) {
    console.error('Error fetching ad performances:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get performance records for a specific game
app.get('/api/performances/game/:id', async (req, res) => {
  try {
    const performances = await AdPerformance.find({ game_id: req.params.id });
    
    res.status(200).json({
      success: true,
      count: performances.length,
      data: performances
    });
  } catch (error) {
    console.error('Error fetching performances:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get summary of campaign performance
app.get('/api/campaigns/:id/performance', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ campaign_id: req.params.id });
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    // Get all ad IDs from the campaign
    const allAdIds = [];
    campaign.games.forEach(game => {
      game.ads.forEach(ad => {
        allAdIds.push(ad.ad_id);
      });
    });
    
    // Get all ads with their impressions
    const ads = await Ad.find({ ad_id: { $in: allAdIds } });
    
    // Get performance breakdown by game
    const performanceByGame = {};
    
    for (const game of campaign.games) {
      // Initialize game performance data
      performanceByGame[game.game_id] = {
        total_impressions: 0,
        ads: []
      };
      
      // Process each ad in this game
      for (const adEntry of game.ads) {
        const ad = ads.find(a => a.ad_id === adEntry.ad_id);
        if (ad) {
          // Get campaign-specific impressions for this ad
          const campaignImpression = ad.campaigns.find(c => c.campaign_id === campaign.campaign_id);
          const impressions = campaignImpression ? campaignImpression.impressions : 0;
          
          // Add to game total
          performanceByGame[game.game_id].total_impressions += impressions;
          
          // Add ad details
          performanceByGame[game.game_id].ads.push({
            ad_id: ad.ad_id,
            name: ad.name,
            target_impressions: adEntry.target_impressions,
            current_impressions: adEntry.current_impressions,
            percent_complete: (adEntry.current_impressions / adEntry.target_impressions) * 100
          });
        }
      }
    }
    
    const status = await checkCampaignStatus(campaign.campaign_id);
    
    res.status(200).json({
      success: true,
      data: {
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        region: campaign.region,
        start_time: campaign.start_time,
        end_time: campaign.end_time,
        target_impressions: campaign.target_impressions,
        total_impressions: campaign.total_impressions,
        remaining_impressions: campaign.remaining_impressions,
        percent_complete: status.percent_complete,
        is_complete: status.is_complete,
        performance_by_game: performanceByGame
      }
    });
  } catch (error) {
    console.error('Error fetching campaign performance:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Create unified campaign submission endpoint
app.post('/api/submit-campaign', async (req, res) => {
  try {
    const {
      campaignName,
      startDate,
      endDate,
      targetImpressions,
      gameSelections // Array of objects: { gameId, ads: [{ adType, adSize, brandName, productName, colors, billboardId }] }
    } = req.body;

    // Validate input
    if (!campaignName || !startDate || !endDate || !targetImpressions || !gameSelections || !Array.isArray(gameSelections) || gameSelections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Create the campaign
    const newCampaign = new Campaign({
      campaign_id: `camp_${uuidv4().slice(0, 8)}`,
      campaign_name: campaignName,
      games: [],
      start_time: startDate,
      end_time: endDate,
      target_impressions: targetImpressions,
      total_impressions: 0
    });

    // Process each game selection
    for (const gameSelection of gameSelections) {
      const { gameId, ads } = gameSelection;

      // Verify that the game exists
      const game = await Game.findOne({ game_id: gameId });
      if (!game) {
        return res.status(404).json({
          success: false,
          error: `Game with ID ${gameId} not found`
        });
      }

      const gameEntry = {
        game_id: gameId,
        ads: []
      };

      // Process each ad for this game
      for (const adData of ads) {
        const { adType, adSize, brandName, productName, colors, billboardId } = adData;

        // Verify that the billboard exists and is available
        const billboard = await Billboard.findOne({ billboard_id: billboardId });
        if (!billboard) {
          return res.status(404).json({
            success: false,
            error: `Billboard with ID ${billboardId} not found`
          });
        }

        if (billboard.is_occupied) {
          return res.status(400).json({
            success: false,
            error: `Billboard with ID ${billboardId} is already occupied`
          });
        }

        // Create the ad
        const newAd = new Ad({
          ad_id: `ad_${uuidv4().slice(0, 8)}`,
          ad_type: adType,
          size: adSize,
          brand_name: brandName,
          product_name: productName,
          colors: Array.isArray(colors) ? colors : [colors],
          billboard_id: billboardId,
          game_id: gameId,
          campaigns: [newCampaign.campaign_id],
          total_impressions: 0
        });

        const savedAd = await newAd.save();

        // Add ad to game entry
        gameEntry.ads.push(savedAd.ad_id);

        // Update the billboard
        billboard.ad_id = savedAd.ad_id;
        billboard.campaign_id = newCampaign.campaign_id;
        billboard.is_occupied = true;
        await billboard.save();

        // Create initial performance record
        const newPerformance = new AdPerformance({
          performance_id: `perf_${uuidv4().slice(0, 8)}`,
          ad_id: savedAd.ad_id,
          date: new Date(),
          impressions: 0
        });

        await newPerformance.save();
      }

      // Add game entry to campaign
      newCampaign.games.push(gameEntry);
    }

    // Save the campaign
    const savedCampaign = await newCampaign.save();

    res.status(201).json({
      success: true,
      data: {
        campaign: savedCampaign
      }
    });
  } catch (error) {
    console.error('Error submitting campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error: ' + error.message
    });
  }
});

// Submit a unified campaign request
app.post('/api/submit-unified-campaign', async (req, res) => {
  try {
    const campaignData = await processUnifiedRequest(req.body);
    
    // Create the campaign in the database
    const campaign = new Campaign(campaignData);
    await campaign.save();
    
    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: {
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        total_ads: campaign.games.reduce((total, game) => total + game.ads.length, 0)
      }
    });
  } catch (error) {
    console.error('Error submitting campaign:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Record impressions for an ad
app.post('/api/record-impressions', async (req, res) => {
  try {
    const { campaignId, gameId, adId, count = 1 } = req.body;
    
    if (!campaignId || !gameId || !adId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: campaignId, gameId, adId' 
      });
    }
    
    const result = await recordImpressions(campaignId, gameId, adId, count);
    
    res.status(200).json({
      success: true,
      message: `Recorded ${count} impressions`,
      data: {
        campaign_id: campaignId,
        ad_id: adId,
        current_impressions: result.updated.campaignImpressions,
        total_ad_impressions: result.updated.totalAdImpressions
      }
    });
  } catch (error) {
    console.error('Error recording impressions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get campaign status
app.get('/api/campaign/:campaignId/status', async (req, res) => {
  try {
    const campaignId = req.params.campaignId;
    const status = await checkCampaignStatus(campaignId);
    
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error checking campaign status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all active campaigns
app.get('/api/campaigns/active', async (req, res) => {
  try {
    const currentDate = new Date();
    const campaigns = await Campaign.find({
      start_time: { $lte: currentDate },
      end_time: { $gte: currentDate }
    }).select('campaign_id campaign_name region start_time end_time games');
    
    // Calculate completion percentage for each campaign
    const campaignsWithStatus = await Promise.all(
      campaigns.map(async (campaign) => {
        const status = await checkCampaignStatus(campaign.campaign_id);
        return {
          campaign_id: campaign.campaign_id,
          campaign_name: campaign.campaign_name,
          region: campaign.region,
          start_time: campaign.start_time,
          end_time: campaign.end_time,
          game_count: campaign.games.length,
          ad_count: campaign.games.reduce((sum, game) => sum + game.ads.length, 0),
          percent_complete: status.percent_complete,
          is_complete: status.is_complete
        };
      })
    );
    
    res.status(200).json({
      success: true,
      count: campaignsWithStatus.length,
      data: campaignsWithStatus
    });
  } catch (error) {
    console.error('Error fetching active campaigns:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get campaigns for a specific game
app.get('/api/campaigns/game/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const campaigns = await Campaign.find({
      'games.game_id': gameId
    }).select('campaign_id campaign_name region start_time end_time');
    
    res.status(200).json({
      success: true,
      count: campaigns.length,
      data: campaigns
    });
  } catch (error) {
    console.error(`Error fetching campaigns for game ${req.params.gameId}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------- Billboard Routes --------------
// Get all billboards
app.get('/api/billboards', async (req, res) => {
  try {
    const billboards = await Billboard.find();
    res.status(200).json({
      success: true,
      count: billboards.length,
      data: billboards
    });
  } catch (error) {
    console.error('Error fetching billboards:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get billboards for a specific game
app.get('/api/billboards/game/:gameId', async (req, res) => {
  try {
    const billboards = await Billboard.find({ game_id: req.params.gameId });
    
    if (billboards.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No billboards found for this game'
      });
    }
    
    res.status(200).json({
      success: true,
      count: billboards.length,
      data: billboards
    });
  } catch (error) {
    console.error('Error fetching billboards for game:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Get a single billboard
app.get('/api/billboards/:id', async (req, res) => {
  try {
    const billboard = await Billboard.findOne({ billboard_id: req.params.id });
    
    if (!billboard) {
      return res.status(404).json({
        success: false,
        error: 'Billboard not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: billboard
    });
  } catch (error) {
    console.error('Error fetching billboard:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Update a billboard (assign or remove ad/campaign)
app.put('/api/billboards/:id', async (req, res) => {
  try {
    const { ad_id, campaign_id, is_occupied } = req.body;
    
    const billboard = await Billboard.findOne({ billboard_id: req.params.id });
    
    if (!billboard) {
      return res.status(404).json({
        success: false,
        error: 'Billboard not found'
      });
    }
    
    // Update billboard properties
    if (ad_id !== undefined) billboard.ad_id = ad_id;
    if (campaign_id !== undefined) billboard.campaign_id = campaign_id;
    if (is_occupied !== undefined) billboard.is_occupied = is_occupied;
    
    await billboard.save();
    
    res.status(200).json({
      success: true,
      data: billboard
    });
  } catch (error) {
    console.error('Error updating billboard:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 