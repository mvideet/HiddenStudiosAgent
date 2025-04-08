# In-Game Ad Agency

A backend system for managing in-game advertisements with multiple related data models.

## Data Models

The system uses five related models:

1. **Game**: Stores information about games where ads can be displayed
2. **Billboard**: Represents ad spaces within games (each game has 10 billboards)
3. **Ad**: Stores information about the ad creative and references billboards
4. **Campaign**: Organizes ads across multiple games with campaign details
5. **Ad Performance**: Tracks impressions for ads

## Structure

- Each Campaign can include multiple Games
- For each Game in a Campaign, there can be multiple Ads
- Each Ad is placed on a specific Billboard within a Game
- Performance data tracks impressions for each Ad

## Setup

1. Install dependencies:
```
npm install
```

2. Update the `.env` file with your MongoDB connection string if needed.

3. Seed sample games and create billboards:
```
npm run seed
```

4. Start the server:
```
npm start
```

For development with auto-restart:
```
npm run dev
```

## Submitting Ad Campaigns

To create a campaign, use the unified submission endpoint which handles creating ads across multiple games and assigning them to billboards.

Send a POST request to `/api/submit-campaign` with the following JSON structure:

```json
{
  "campaignName": "Summer Sale 2023",
  "startDate": "2023-06-01",
  "endDate": "2023-07-01",
  "targetImpressions": 100000,
  "gameSelections": [
    {
      "gameId": "game_racing01",
      "ads": [
        {
          "adType": "banner",
          "adSize": "300x250",
          "brandName": "Cool Sports",
          "productName": "Ultra Sneakers",
          "colors": ["#FF5733", "#33FF57", "#3357FF"],
          "billboardId": "bill_12345"
        }
      ]
    }
  ]
}
```

To test campaign submission:
```
npm run upload-campaign
```

To simulate recording impressions for a campaign:
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

### Campaign Endpoints
- `GET /api/campaigns` - Get all campaigns
- `GET /api/campaigns/:id` - Get a specific campaign by ID
- `GET /api/campaigns/:id/performance` - Get performance summary for a campaign
- `POST /api/submit-campaign` - Create a new campaign with ads across multiple games

### Performance Endpoints
- `GET /api/performances` - Get all performance records
- `GET /api/performances/ad/:id` - Get performance records for a specific ad
- `POST /api/performances/record` - Record impressions for an ad

## JSON Formats

### Game
```json
{
  "title": "Racing Legends",
  "region": "Global",
  "platform": "PlayStation 5",
  "plays": 250000,
  "thumbnail_url": "https://example.com/racing_legends.jpg"
}
```

### Ad
```json
{
  "ad_type": "banner",
  "size": "300x250",
  "brand_name": "Sports Gear",
  "product_name": "Pro Running Shoes",
  "colors": ["#FF5733", "#33FF57", "#3357FF"]
}
```

### Campaign
```json
{
  "campaign_name": "Summer Sports Promotion",
  "ad_id": "ad_12345678",
  "game_id": "game_12345678",
  "start_time": "2023-06-01",
  "end_time": "2023-07-31",
  "target_impressions": 100000
}
```

### Ad Performance
```json
{
  "ad_id": "ad_12345678",
  "game_id": "game_12345678",
  "date": "2023-06-15T10:30:00.000Z",
  "impressions": 1250
}
``` 