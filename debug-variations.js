// Debug script to test variations storage and Square sync
const { storage } = require('./server/storage.js');

async function debugVariations() {
  try {
    console.log('🔍 Testing variations debugging...');
    
    // Test 1: Check if storage methods exist and work
    console.log('\n📋 Test 1: Storage methods test');
    const menuItemId = 1045; // 500g Beans
    
    try {
      const existingOptions = await storage.getMenuItemOptions(menuItemId);
      console.log(`✅ getMenuItemOptions works - found ${existingOptions.length} options for item ${menuItemId}`);
    } catch (error) {
      console.log(`❌ getMenuItemOptions failed:`, error.message);
      return;
    }
    
    // Test 2: Try to create a test menu item option
    console.log('\n📋 Test 2: Create test menu item option');
    try {
      const testOption = {
        menuItemId: menuItemId,
        name: 'Test Variation',
        price: 5.99,
        squareId: 'TEST_SQUARE_ID',
        isDefault: false
      };
      
      const createdOption = await storage.createMenuItemOption(testOption);
      console.log(`✅ createMenuItemOption works - created option:`, createdOption);
      
      // Clean up the test option
      await storage.deleteMenuItemOption(createdOption.id);
      console.log(`✅ deleteMenuItemOption works - cleaned up test option`);
    } catch (error) {
      console.log(`❌ createMenuItemOption failed:`, error.message);
      return;
    }
    
    console.log('\n🎯 All storage methods work correctly!');
    console.log('🔍 The issue must be in the sync logic or Square data retrieval');
    
    // Test 3: Let's see what happens during a manual Square fetch
    console.log('\n📋 Test 3: Manual Square variations check');
    console.log('This would require Square API access which needs authentication...');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

// Run the test
debugVariations()
  .then(() => {
    console.log('\n✅ Debug test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Debug test crashed:', error);
    process.exit(1);
  });