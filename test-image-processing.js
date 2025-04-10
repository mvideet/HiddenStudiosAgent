const { processAdImage } = require('./process-unified-request');

async function testImageProcessing() {
  try {
    console.log('Testing image processing...');
    
    // Test processing multiple images
    const images = [
      { path: 'images/ad1.png', game: 'test_game_1' },
      { path: 'images/ad2.png', game: 'test_game_1' },
      { path: 'images/ad3.png', game: 'test_game_2' }
    ];
    
    for (const image of images) {
      console.log(`\nProcessing image: ${image.path}`);
      const result = await processAdImage(image.path, image.game);
      
      console.log('Successfully processed image:');
      console.log(`- Ad ID: ${result.ad_id}`);
      console.log(`- Type: ${result.ad_type}`);
      console.log(`- Size: ${result.size}`);
      console.log(`- Ad Space: ${result.ad_space}`);
      console.log(`- Impression Multiplier: ${result.impression_multiplier}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testImageProcessing(); 