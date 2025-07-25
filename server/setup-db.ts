import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { users, menuItems } from '../shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

// Configure neon to use WebSockets
neonConfig.webSocketConstructor = ws;

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  try {
    // Check if users exist
    console.log('Checking if users exist...');
    const userCount = await db.select().from(users);
    
    if (userCount.length === 0) {
      console.log('No users found. Creating sample users...');
      
      // Create admin user
      await db.insert(users).values({
        username: 'bs_admin',
        password: await hashPassword('BS2025@@'),
        email: 'admin@beanstalker.com',
        credits: 1000, // Admin gets more credits
        fullName: 'Admin User',
        phoneNumber: '123-456-7890',
        isAdmin: true
      });
      
      // Create regular user
      await db.insert(users).values({
        username: 'user',
        password: await hashPassword('user123'),
        email: 'user@example.com',
        credits: 69, // Default premium membership credits
        fullName: 'Regular User',
        phoneNumber: '987-654-3210',
        isAdmin: false
      });
      
      console.log('Sample users created successfully.');
      
      // Create menu items
      console.log('Creating sample menu items...');
      
      // Helper function to add menu items
      async function addMenuItem(
        name: string, 
        description: string, 
        price: number, 
        category: string, 
        imageUrl: string | null = null
      ) {
        await db.insert(menuItems).values({
          name,
          description,
          price,
          category,
          imageUrl
        });
      }
      
      // Add breakfast items
      await addMenuItem("Egg & Bacon Panini", "Scrambled eggs with crispy bacon on toasted panini bread.", 13.50, "breakfast", "/images/breakfast-panini.jpg");
      await addMenuItem("Avocado Toast", "Smashed avocado on sourdough with feta, cherry tomatoes and microgreens.", 12.00, "breakfast", "/images/avocado-toast.jpg");
      await addMenuItem("Breakfast Bowl", "Greek yogurt with granola, seasonal fruits, honey and chia seeds.", 10.50, "breakfast", "/images/breakfast-bowl.jpg");
      
      // Add lunch items
      await addMenuItem("Chicken Salad", "Grilled chicken with mixed greens, cherry tomatoes, cucumber and balsamic dressing.", 14.50, "lunch", "/images/chicken-salad.jpg");
      await addMenuItem("Turkey & Swiss Sandwich", "Sliced turkey, Swiss cheese, lettuce, tomato and mayo on multigrain bread.", 13.00, "lunch", "/images/turkey-sandwich.jpg");
      await addMenuItem("Vegetable Soup", "Hearty vegetable soup with seasonal vegetables and herbs, served with bread.", 9.50, "lunch", "/images/vegetable-soup.jpg");
      
      // Add coffee items
      await addMenuItem("Cappuccino", "Espresso with steamed milk and a thick layer of foam.", 4.50, "coffee", "/images/cappuccino.jpg");
      await addMenuItem("Flat White", "Espresso with steamed milk and a thin layer of microfoam.", 4.50, "coffee", "/images/flat-white.jpg");
      await addMenuItem("Espresso", "Concentrated coffee served in a small cup.", 3.50, "coffee", "/images/espresso.jpg");
      
      // Add hot drinks
      await addMenuItem("Hot Chocolate", "Rich chocolate with steamed milk topped with whipped cream.", 4.50, "hot-drinks", "/images/hot-chocolate.jpg");
      await addMenuItem("Green Tea", "Traditional Japanese green tea.", 3.50, "hot-drinks", "/images/green-tea.jpg");
      
      // Add iced drinks
      await addMenuItem("Iced Coffee", "Cold brew coffee served over ice.", 4.00, "iced-drinks", "/images/iced-coffee.jpg");
      await addMenuItem("Iced Tea", "Fresh brewed tea served over ice.", 3.50, "iced-drinks", "/images/iced-tea.jpg");
      
      // Add juices
      await addMenuItem("Orange Juice", "Freshly squeezed orange juice.", 4.50, "juices", "/images/orange-juice.jpg");
      await addMenuItem("Green Juice", "Spinach, kale, cucumber, apple and ginger.", 5.50, "juices", "/images/green-juice.jpg");
      
      // Add smoothies
      await addMenuItem("Berry Blast", "Mixed berries, banana, yogurt and honey.", 6.00, "smoothies", "/images/berry-smoothie.jpg");
      await addMenuItem("Tropical Paradise", "Mango, pineapple, coconut milk and banana.", 6.00, "smoothies", "/images/tropical-smoothie.jpg");
      
      console.log('Sample menu items created successfully.');
    } else {
      console.log(`Found ${userCount.length} existing users. No need to create sample data.`);
    }
    
    console.log('Database setup completed successfully.');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

main().catch(console.error);