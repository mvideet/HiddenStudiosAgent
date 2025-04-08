const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const Game = require('./models/Game');
const Billboard = require('./models/Billboard');

// Load environment variables
dotenv.config();

// Sample games data
const sampleGames = [
  {
    game_id: 'brainrot_boxfights',
    title: 'Brainrot Boxfights',
    region: 'Global',
    platform: 'Mobile, PC',
    plays: 500000,
    thumbnail_url: 'https://example.com/speed_racers.jpg'
  },
  {
    game_id: 'redvblue',
    title: 'Red vs Blue',
    region: 'Global',
    platform: 'Mobile, PC',
    plays: 2000000,
    thumbnail_url: 'https://example.com/brain_teasers.jpg'
  },
  {
    game_id: 'tmnt',
    title: 'TMNT Red vs Blue',
    region: 'North America, Europe',
    platform: 'Console, PC', 
    plays: 1500000,
    thumbnail_url: 'https://example.com/adventure_quest.jpg'
  }
];

// MongoDB Atlas URI
const MONGODB_URI = `mongodb+srv://HS_vm:${process.env.DB_PASSWORD}@hs.f50oxcf.mongodb.net/gameDB?retryWrites=true&w=majority&appName=HS`;

// Function to create billboards for a game
const createBillboardsForGame = async (gameId) => {
  const billboards = [];
  
  // Create 10 billboards for each game
  for (let i = 1; i <= 10; i++) {
    billboards.push({
      billboard_id: `bill_${gameId}_${i}_${uuidv4().slice(0, 4)}`,
      game_id: gameId,
      position: i,
      is_occupied: false
    });
  }
  
  return Billboard.insertMany(billboards);
};

// Connect to MongoDB with increased timeout
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');

    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
    });
    
    console.log('MongoDB Atlas Connected');
    return true;
  } catch (err) {
    console.error('MongoDB Connection Error:', err);
    return false;
  }
};

// Seed games
const seedGames = async () => {
  try {
    // Connect to database
    const connected = await connectDB();
    if (!connected) {
      console.error('Failed to connect to MongoDB Atlas. Exiting...');
      process.exit(1);
    }
    
    // Clear existing games and billboards
    console.log('Clearing existing games and billboards...');
    await Game.deleteMany({});
    await Billboard.deleteMany({});
    console.log('Cleared existing games and billboards');
    
    // Insert new games
    console.log('Inserting new games...');
    const insertedGames = await Game.insertMany(sampleGames);
    console.log(`Seeded ${insertedGames.length} games successfully!`);
    
    // Create billboards for each game
    for (const game of insertedGames) {
      const billboards = await createBillboardsForGame(game.game_id);
      console.log(`Created ${billboards.length} billboards for game: ${game.title}`);
    }
    
    // Log the games for reference
    console.log('Available games:');
    insertedGames.forEach(game => {
      console.log(`- ${game.title} (ID: ${game.game_id})`);
    });
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB Atlas Disconnected');
  } catch (error) {
    console.error('Error seeding games:', error);
    process.exit(1);
  }
};

// Run the seed function
seedGames(); 