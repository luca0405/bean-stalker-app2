/**
 * Square Catalog Sync - Sync Bean Stalker menu to Square catalog
 * This will create categories and menu items in Square for Kitchen Display integration
 */

import { storage } from './storage';
import { getSquareAccessToken, getSquareLocationId, getSquareEnvironment } from './square-config';

// Square API base URL
const getSquareApiBase = () => {
  const environment = getSquareEnvironment();
  return environment === 'production' 
    ? 'https://connect.squareup.com/v2'
    : 'https://connect.squareupsandbox.com/v2';
};

const SQUARE_VERSION = '2023-12-13';

async function makeSquareRequest(endpoint: string, method: string = 'GET', body?: any) {
  const accessToken = getSquareAccessToken();
  if (!accessToken) {
    throw new Error('Square access token not configured');
  }
  
  const response = await fetch(`${getSquareApiBase()}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': SQUARE_VERSION
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const responseText = await response.text();
  
  if (!response.ok) {
    throw new Error(`Square API error: ${response.status} - ${responseText}`);
  }

  return responseText ? JSON.parse(responseText) : {};
}

// Category mapping for Square
const CATEGORY_MAPPING = {
  'breakfast': 'Breakfast',
  'coffee': 'Coffee',
  'hot-drinks': 'Hot Drinks', 
  'iced-drinks': 'Iced Drinks',
  'juices': 'Juices & Refreshers',
  'lunch': 'Lunch',
  'smoothies': 'Smoothies'
};

export async function syncCategoriesToSquare(): Promise<any> {
  try {
    console.log('📂 Starting Square catalog categories sync...');
    
    // Get existing categories from Square using List API
    const existingCategoriesResponse = await makeSquareRequest('/catalog/list?types=CATEGORY', 'GET');
    
    const existingCategories = existingCategoriesResponse.objects || [];
    const existingCategoryNames = existingCategories.map((cat: any) => cat.category_data?.name);
    
    console.log(`📂 Found ${existingCategories.length} existing Square categories`);
    
    // Create categories that don't exist
    const categoriesToCreate = Object.entries(CATEGORY_MAPPING).filter(
      ([key, displayName]) => !existingCategoryNames.includes(displayName)
    );
    
    const createdCategories: any[] = [];
    
    for (const [key, displayName] of categoriesToCreate) {
      try {
        console.log(`📂 Creating Square category: ${displayName}`);
        
        const categoryObject = {
          type: 'CATEGORY',
          id: `#${key}_category`,
          category_data: {
            name: displayName,
            abbreviation: key.toUpperCase().substring(0, 3)
          }
        };
        
        const batchRequest = {
          idempotency_key: `beanstalker-category-${key}-${Date.now()}`,
          batches: [{
            objects: [categoryObject]
          }]
        };
        
        const response = await makeSquareRequest('/catalog/batch-upsert', 'POST', batchRequest);
        
        if (response.objects && response.objects.length > 0) {
          createdCategories.push(response.objects[0]);
          console.log(`✅ Created Square category: ${displayName} (ID: ${response.objects[0].id})`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to create category ${displayName}:`, error);
      }
    }
    
    // Get updated categories list
    const updatedCategoriesResponse = await makeSquareRequest('/catalog/search', 'POST', {
      object_types: ['CATEGORY']
    });
    
    const allCategories = updatedCategoriesResponse.objects || [];
    
    return {
      success: true,
      existing: existingCategories.length,
      created: createdCategories.length,
      total: allCategories.length,
      categories: allCategories
    };
    
  } catch (error) {
    console.error('❌ Square categories sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function syncMenuItemsToSquare(): Promise<any> {
  try {
    console.log('🍽️ Starting Square catalog menu items sync...');
    
    // Get Bean Stalker menu items
    const menuItems = await storage.getMenuItems();
    console.log(`🍽️ Found ${menuItems.length} Bean Stalker menu items`);
    
    // Get Square categories for mapping
    const categoriesResponse = await makeSquareRequest('/catalog/search', 'POST', {
      object_types: ['CATEGORY']
    });
    
    const squareCategories = categoriesResponse.objects || [];
    const categoryMap: { [key: string]: string } = {};
    
    // Build category mapping
    for (const [key, displayName] of Object.entries(CATEGORY_MAPPING)) {
      const squareCategory = squareCategories.find((cat: any) => cat.category_data?.name === displayName);
      if (squareCategory) {
        categoryMap[key] = squareCategory.id;
      }
    }
    
    console.log('📂 Category mapping:', categoryMap);
    
    // Get existing items from Square
    const existingItemsResponse = await makeSquareRequest('/catalog/search', 'POST', {
      object_types: ['ITEM']
    });
    
    const existingItems = existingItemsResponse.objects || [];
    const existingItemNames = existingItems.map((item: any) => item.item_data?.name);
    
    console.log(`🍽️ Found ${existingItems.length} existing Square items`);
    
    // Create menu items that don't exist
    const itemsToCreate = menuItems.filter(item => !existingItemNames.includes(item.name));
    console.log(`🍽️ Need to create ${itemsToCreate.length} new items`);
    
    const createdItems: any[] = [];
    
    // Process items in batches of 10 (Square API limit)
    for (let i = 0; i < itemsToCreate.length; i += 10) {
      const batch = itemsToCreate.slice(i, i + 10);
      
      const objects = batch.map((item, index) => {
        const categoryId = categoryMap[item.category];
        
        return {
          type: 'ITEM',
          id: `#bean_stalker_item_${item.id}`,
          item_data: {
            name: item.name,
            description: item.description || '',
            category_id: categoryId,
            variations: [{
              type: 'ITEM_VARIATION',
              id: `#bean_stalker_variation_${item.id}`,
              item_variation_data: {
                item_id: `#bean_stalker_item_${item.id}`,
                name: 'Regular',
                pricing_type: 'FIXED_PRICING',
                price_money: {
                  amount: Math.round(item.price * 100), // Convert to cents
                  currency: 'AUD'
                }
              }
            }]
          }
        };
      });
      
      try {
        console.log(`🍽️ Creating batch ${Math.floor(i / 10) + 1} (${batch.length} items)...`);
        
        const batchRequest = {
          idempotency_key: `beanstalker-items-batch-${i}-${Date.now()}`,
          batches: [{
            objects
          }]
        };
        
        const response = await makeSquareRequest('/catalog/batch-upsert', 'POST', batchRequest);
        
        if (response.objects) {
          createdItems.push(...response.objects);
          console.log(`✅ Created ${response.objects.length} items in Square catalog`);
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to create batch ${Math.floor(i / 10) + 1}:`, error);
      }
    }
    
    return {
      success: true,
      total: menuItems.length,
      existing: existingItems.length,
      created: createdItems.length,
      items: createdItems
    };
    
  } catch (error) {
    console.error('❌ Square menu items sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function syncFullCatalogToSquare(): Promise<any> {
  try {
    console.log('🏪 Starting full Bean Stalker → Square catalog sync...');
    
    // Step 1: Sync categories
    const categoriesResult = await syncCategoriesToSquare();
    if (!categoriesResult.success) {
      throw new Error(`Categories sync failed: ${categoriesResult.error}`);
    }
    
    // Step 2: Sync menu items
    const itemsResult = await syncMenuItemsToSquare();
    if (!itemsResult.success) {
      throw new Error(`Menu items sync failed: ${itemsResult.error}`);
    }
    
    console.log('🎉 Full catalog sync completed successfully!');
    
    return {
      success: true,
      categories: categoriesResult,
      items: itemsResult,
      summary: {
        categories_created: categoriesResult.created,
        items_created: itemsResult.created,
        total_categories: categoriesResult.total,
        total_items: itemsResult.existing + itemsResult.created
      }
    };
    
  } catch (error) {
    console.error('❌ Full catalog sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}