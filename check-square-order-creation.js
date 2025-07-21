// Check what happened during order creation
import { storage } from './server/storage.js';

async function checkOrder79() {
  try {
    console.log('🔍 Checking Bean Stalker Order #79...');
    
    const order = await storage.getOrderById(79);
    if (!order) {
      console.log('❌ Order #79 not found in Bean Stalker database');
      return;
    }
    
    console.log('✅ Found Bean Stalker Order #79:');
    console.log('User ID:', order.userId);
    console.log('Total:', order.total);
    console.log('Status:', order.status);
    console.log('Items:', order.items);
    console.log('Created:', order.createdAt);
    
    // Check if user exists
    const user = await storage.getUser(order.userId);
    if (user) {
      console.log('✅ User found:', user.username);
      console.log('Current credits:', user.credits);
    } else {
      console.log('❌ User not found for order');
    }
    
  } catch (error) {
    console.error('❌ Error checking order:', error.message);
  }
}

checkOrder79();