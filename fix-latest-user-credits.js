import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

async function fixLatestUserCredits() {
  console.log('🔧 Fixing credits for latest user who completed membership purchase...');
  
  try {
    // Connect to database
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not found');
    }
    
    const sql = postgres(connectionString);
    const db = drizzle(sql);
    
    // Get the most recent users (likely the one who just purchased)
    const result = await sql`
      SELECT id, username, credits
      FROM users 
      ORDER BY id DESC 
      LIMIT 5
    `;
    
    console.log('Recent users:');
    result.forEach(user => {
      console.log(`- ID ${user.id}: ${user.username} ($${user.credits} credits)`);
    });
    
    if (result.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    // Get the latest user who likely needs credits
    const latestUser = result[0];
    
    // If they have less than $69, add the membership credits
    if (latestUser.credits < 69) {
      console.log(`\n🎯 Adding $69 membership credits to user ${latestUser.username} (ID: ${latestUser.id})`);
      
      await sql`
        UPDATE users 
        SET credits = credits + 69 
        WHERE id = ${latestUser.id}
      `;
      
      // Verify the update
      const updated = await sql`
        SELECT id, username, credits 
        FROM users 
        WHERE id = ${latestUser.id}
      `;
      
      console.log(`✅ Credits updated! ${updated[0].username} now has $${updated[0].credits}`);
    } else {
      console.log(`\n✅ User ${latestUser.username} already has $${latestUser.credits} credits`);
    }
    
    await sql.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixLatestUserCredits();