# In-Game Ad Agency

A comprehensive backend system for managing in-game advertisements with intelligent ad processing, impression tracking, and campaign management.

## System Overview

This system provides a complete solution for managing in-game advertising campaigns across multiple games and platforms. It features:

- Image processing with AI to analyze ad images and determine characteristics
- Campaign management with impression tracking
- MongoDB integration for data persistence
- REST API for managing ads, campaigns, and tracking impressions
- Intelligent impression multiplier calculation based on ad characteristics
- Automatic campaign completion detection

## Architecture

The system is built on a Node.js backend with MongoDB for data storage and Python for image processing:

1. **Node.js Backend**: Handles API routes, database operations, and business logic
2. **MongoDB**: Stores all campaign, ad, and impression data
3. **Python Integration**: Processes ad images to determine characteristics, calculates impression multipliers
4. **Data Pipeline**: Imports campaign data from JSON files, processes images, and stores in MongoDB

## Data Models

The system utilizes five interconnected models:

1. **Game**: Stores information about games where ads can be displayed
   - Properties: title, region, platform, play count, thumbnail URL, game_id

2. **Billboard**: Represents ad spaces within games (each game can have multiple billboards)
   - Properties: billboard_id, location, type, size, game_id, ad_id

3. **Ad**: Stores information about the ad creative with embedded metadata
   - Properties: ad_id, ad_type, size, name, contrast, product_or_brand, ad_space, impression_multiplier, game_id, billboard_id, campaigns

4. **Campaign**: Organizes ads across multiple games with campaign details
   - Properties: campaign_id, campaign_name, region, start_time, end_time, games (with embedded ads)

5. **AdPerformance**: Tracks impressions for ads over time
   - Properties: performance_id, ad_id, date, impressions

## Data Flow

1. Campaign data is imported from JSON files or through the API
2. Ad images are processed by the Python system to extract characteristics
3. Impression multipliers are calculated based on image analysis
4. Impressions are tracked when ads are shown to players
5. Campaign completion is determined when all ads meet their target impressions

## Impression Data Structure

The system uses a unified impression request format that tracks impressions across multiple games and ads:

```json
{
  "timestamp": "2023-11-15T10:30:00.000Z",
  "impressions": [
    {
      "game_id": "brainrot_boxfights",
      "ad_name": "BoxAd1",
      "count": 150,
      "performance_id": "perf_box1_77777",
      "date": "2023-11-15T10:30:00.000Z"
    }
  ],
  "batch_id": "batch_98765432",
  "source": "game_client"
}
```

**Note**: The impression tracking system uses `ad_name` for ad assignment and identification. The previously used `ad_loc` field has been removed as it is no longer required.

## Setup & Installation

### Prerequisites

- Node.js v14+
- MongoDB
- Python 3.7+
- pip (Python package manager)

### Installation Steps

1. Clone the repository
   ```
   git clone <repository-url>
   cd in-game-ad-agency
   ```

2. Install Node.js dependencies
   ```
   npm install
   ```

3. Install Python dependencies
   ```
   pip install -r requirements.txt
   ```

4. Configure environment variables in `.env`
   ```
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/gameDB
   PORT=3000
   ```

5. Seed sample games and create billboards
   ```
   npm run seed
   ```

6. Start the server
   ```
   npm start
   ```

   For development with auto-restart:
   ```
   npm run dev
   ```

## Usage

### Import Pipeline

The system includes a robust campaign import pipeline that processes JSON files and imports them into MongoDB:

```
npm run import-pipeline <path-to-json-file>
```

The input JSON file should follow this structure:

```json
{
  "campaignName": "Summer Campaign 2023",
  "startDate": "2023-06-01",
  "endDate": "2023-07-01",
  "targetImpressions": 100000,
  "region": "NA",
  "gameSelections": [
    {
      "gameId": "game_12345678",
      "ads": [
        {
          "filePath": "images/ad1.png",
          "wantedImpressions": 40000,
          "adNum": "Ad1"
        },
        {
          "filePath": "images/ad2.png",
          "wantedImpressions": 30000,
          "adNum": "Ad2"
        }
      ]
    },
    {
      "gameId": "game_87654321",
      "ads": [
        {
          "filePath": "images/ad3.png",
          "wantedImpressions": 30000,
          "adNum": "Ad3"
        }
      ]
    }
  ]
}
```

The import pipeline will:
1. Process each ad image to extract characteristics (using Python)
2. Calculate impression multipliers based on ad characteristics
3. Create Ad documents in MongoDB
4. Create a Campaign document linking all ads
5. Return a summary of the import process

### Image Processing System

The system uses Python to analyze ad images and determine:
- Contrast levels
- Ad type classification
- Size estimation
- Product or brand classification
- Impression multiplier calculation

The image processing uses machine learning techniques to:
- Calculate cosine similarity between ad characteristics and existing embeddings
- Extract multiplier values based on best matching reference data
- Determine optimal ad placement and categorization

### Impression Tracking

To track impressions for ads:

```javascript
// Using the track-impressions.js file
const { trackImpression } = require('./track-impressions');

await trackImpression({
  ad_id: "ad_12345678",
  impressions: 10,
  date: new Date()
});
```

Or use the API endpoint:
```
POST /api/performances/record
```

To simulate recording impressions for testing:
```
npm run simulate-impressions
```

## API Endpoints

### Game Endpoints
- `GET /api/games` - Get all games
- `GET /api/games/:id` - Get a specific game by ID

### Billboard Endpoints
- `GET /api/billboards` - Get all billboards
- `GET /api/billboards/game/:gameId` - Get billboards for a specific game
- `GET /api/billboards/:id` - Get a specific billboard by ID
- `PUT /api/billboards/:id` - Update a billboard (assign/remove ad)

### Ad Endpoints
- `GET /api/ads` - Get all ads
- `GET /api/ads/:id` - Get a specific ad by ID
- `GET /api/ads/game/:gameId` - Get all ads for a specific game

### Campaign Endpoints
- `GET /api/campaigns` - Get all campaigns
- `GET /api/campaigns/:id` - Get a specific campaign by ID
- `GET /api/campaigns/:id/performance` - Get performance summary for a campaign
- `POST /api/submit-campaign` - Create a new campaign with ads across multiple games
- `GET /api/campaigns/:id/status` - Check if campaign is complete

### Performance Endpoints
- `GET /api/performances` - Get all performance records
- `GET /api/performances/ad/:id` - Get performance records for a specific ad
- `POST /api/performances/record` - Record impressions for an ad

## Utility Scripts

The repository includes several utility scripts:

- `seed-games.js` - Seeds the database with sample games
- `upload-unified-campaign.js` - Tests campaign creation from JSON
- `simulate-impressions.js` - Simulates impression events for testing
- `import-campaign-from-json.js` - Base import functionality for campaigns
- `import-pipeline.js` - Full import pipeline with error handling and reporting
- `test-import-campaign.js` - Test script for import functionality
- `simple-import-test.js` - Simplified test for database connectivity
- `process-unified-request.js` - Processes unified campaign requests with image analysis
- `process_image.py` - Python script for processing ad images
- `image_preprocessing.py` - Python module for advanced image analysis

## Data Model Details

### Ad Schema
```javascript
{
  ad_id: String,
  ad_type: String,
  size: String,
  name: String,
  product_or_brand: String, // "product" or "brand"
  contrast: Number,
  billboard_id: String,
  game_id: String,
  campaigns: [{
    campaign_id: String,
    impressions: Number
  }],
  total_impressions: Number,
  impression_multiplier: Number,
  ad_space: String,
  createdAt: Date
}
```

### Campaign Schema
```javascript
{
  campaign_id: String,
  campaign_name: String,
  region: String,
  games: [{
    game_id: String,
    ads: [{
      ad_id: String,
      target_impressions: Number,
      current_impressions: Number
    }]
  }],
  start_time: Date,
  end_time: Date,
  createdAt: Date
}
```

### AdPerformance Schema
```javascript
{
  performance_id: String,
  ad_id: String,
  date: Date,
  impressions: Number,
  createdAt: Date
}
```

## Troubleshooting

### Common Issues
- **MongoDB Connection Errors**: Verify your connection string in the `.env` file
- **Image Processing Errors**: Ensure Python dependencies are installed and images are in valid formats
- **Import Pipeline Hangs**: The pipeline includes a timeout protection to prevent indefinite hanging

### Debugging Tools
- The import pipeline provides detailed timing and status information
- Python modules include extensive logging for image processing
- MongoDB connection status is logged during startup

## Advanced Features

### Campaign Completion Detection
The system automatically detects when a campaign is complete:

```javascript
const campaign = await Campaign.findById(campaignId);
const isComplete = campaign.isComplete();
```

### Impression Multiplier Calculation
Impression multipliers are calculated based on image characteristics:
- Contrast levels affect visibility
- Size affects prominence
- Ad type determines engagement potential

## Development

### Adding New Features
1. Create a branch for your feature
2. Implement your changes
3. Write tests to verify functionality
4. Submit a pull request

### Running Tests
```
npm test
``` 