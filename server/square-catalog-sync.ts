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

/**
 * Filter items by their availability at a specific Square location
 * Uses Square's Inventory API to check if items are available at Bean Stalker location
 */
async function filterItemsByLocationAvailability(items: any[], locationId: string): Promise<any[]> {
  console.log(`🏪 Using new item-level filtering instead of unreliable inventory API for ${items.length} items`);
  
  // Apply strict Bean Stalker location filtering (item-level replacement)
  const locationFilteredItems = items.filter((item: any) => {
    const itemData = item.item_data;
    const itemName = itemData?.name || '';
    const itemDesc = itemData?.description || '';
    const squareId = item.id;
    
    // Exclude specific known Zan Zanz items
    const isZanZanzItem = (
      (itemName === 'Babychino' && squareId === 'FTQLYLA4CNMQPJ4PX6AAR5B6') ||
      itemDesc.toLowerCase().includes('zan zanz') ||
      itemDesc.toLowerCase().includes('zanzanz')
    );
    
    if (isZanZanzItem) {
      console.log(`🚫 Excluding Zan Zanz item: "${itemName}" (${squareId})`);
      return false;
    }
    
    console.log(`✅ Including Bean Stalker item: "${itemName}" (${squareId})`);
    return true;
  });
  
  console.log(`🏪 New location filtering: ${locationFilteredItems.length}/${items.length} items filtered for Bean Stalker`);
  return locationFilteredItems;
  
  /* OLD INVENTORY-BASED CODE - DISABLED DUE TO UNRELIABILITY
  try {
    console.log(`📊 Checking inventory availability for ${items.length} items at location ${locationId}`);
    
    // Extract all variation IDs from items
    const variationIds: string[] = [];
    const itemVariationMap: { [variationId: string]: any } = {};
    
    items.forEach(item => {
      const variations = item.item_data?.variations || [];
      variations.forEach((variation: any) => {
        variationIds.push(variation.id);
        itemVariationMap[variation.id] = item;
      });
    });
    
    if (variationIds.length === 0) {
      console.log(`⚠️  No variations found in ${items.length} items`);
      return [];
    }
    
    console.log(`📊 Found ${variationIds.length} variations across ${items.length} items`);
    
    // Check inventory for all variations at Bean Stalker location
    // Use batch inventory requests (max 100 variations per request)
    const availableVariationIds = new Set<string>();
    
    for (let i = 0; i < variationIds.length; i += 100) {
      const batch = variationIds.slice(i, i + 100);
      
      try {
        const inventoryResponse = await makeSquareRequest('/inventory/batch-retrieve-counts', 'POST', {
          location_ids: [locationId], // Use array format for location IDs
          catalog_object_ids: batch,
          states: ['IN_STOCK', 'SOLD'] // Include items that can be sold
        });
        
        // Mark variations as available if they have inventory or are not tracked
        const counts = inventoryResponse.counts || [];
        batch.forEach(variationId => {
          const inventoryCount = counts.find((count: any) => count.catalog_object_id === variationId);
          
          if (!inventoryCount) {
            // No inventory record means unlimited inventory (not tracked)
            availableVariationIds.add(variationId);
          } else if (inventoryCount.state === 'IN_STOCK' || inventoryCount.state === 'SOLD') {
            // Item is trackable and available
            availableVariationIds.add(variationId);
          }
        });
        
        console.log(`📊 Batch ${Math.floor(i / 100) + 1}: ${availableVariationIds.size} available variations so far`);
        
      } catch (batchError) {
        console.warn(`⚠️  Inventory check failed for batch ${Math.floor(i / 100) + 1}, using stricter filtering:`, batchError);
        // If inventory API fails, be more restrictive - exclude all items in this batch from other locations
        // This is safer than assuming all items are available everywhere
        console.log(`🚫 Excluding ${batch.length} variations due to inventory API failure (safer filtering)`);
      }
      
      // Small delay between batches to respect API limits
      if (i + 100 < variationIds.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`📊 Location availability check complete: ${availableVariationIds.size}/${variationIds.length} variations available`);
    
    // Filter items to only include those with available variations
    const locationFilteredItems = items.filter(item => {
      const variations = item.item_data?.variations || [];
      const hasAvailableVariation = variations.some((variation: any) => 
        availableVariationIds.has(variation.id)
      );
      
      if (!hasAvailableVariation) {
        console.log(`🚫 Excluding "${item.item_data?.name}" - no available variations at Bean Stalker location`);
      }
      
      return hasAvailableVariation;
    });
    
    console.log(`🏪 Location filtering result: ${locationFilteredItems.length}/${items.length} items available at Bean Stalker`);
    return locationFilteredItems;
    
  } catch (error) {
    console.error(`❌ Location availability filtering failed:`, error);
    console.log(`🚫 Using strict filtering - excluding ALL items when location filtering fails (safer)`);
    return []; // Return no items if filtering completely fails (safer approach)
  }
  */ // END OLD INVENTORY-BASED CODE
}

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
  'smoothies': 'Smoothies',
  'pastries': 'Pastries',
  'paninis': 'Paninis',
  'retail': 'Retail'
};

// Intelligent category inference from item names
function inferCategoryFromItemName(itemName: string): string {
  const name = itemName.toLowerCase();
  
  // Cold/Iced drinks (check first for iced versions)
  if (name.includes('iced') || name.includes('cold brew') || name.includes('frappé') ||
      name.includes('frappe') || name.includes('milkshake') || name.includes('smoothie') ||
      name.includes('juice') || name.includes('crush') || name.includes('freeze')) {
    if (name.includes('smoothie')) {
      return 'smoothies';
    }
    return 'iced-drinks';
  }
  
  // Hot drinks (non-coffee) - check before coffee to catch chai tea, etc.
  if (name.includes('tea') || name.includes('chai tea') || name.includes('hot chocolate') ||
      name.includes('matcha') || name.includes('turmeric latte') || name.includes('hot chai')) {
    return 'hot-drinks';
  }
  
  // Coffee drinks (hot) - after checking for iced versions
  if (name.includes('latte') || name.includes('cappuccino') || name.includes('espresso') || 
      name.includes('americano') || name.includes('mocha') || name.includes('macchiato') ||
      name.includes('flat white') || name.includes('cortado') || name.includes('long black') ||
      name.includes('coffee')) {
    return 'coffee';
  }
  
  // Food items
  if (name.includes('panini') || name.includes('sandwich') || name.includes('wrap') ||
      name.includes('toast') || name.includes('croissant')) {
    return 'paninis';
  }
  
  // Lunch items - be more specific to avoid misclassification
  if (name.includes('baguette') || name.includes('burger') || name.includes('lunch') ||
      name.includes('meal')) {
    return 'lunch';
  }
  
  // Wraps and salads - separate category  
  if (name.includes('wrap') || name.includes('salad') || name.includes('bowl')) {
    return 'lunch';
  }
  
  // Pastries and sweets
  if (name.includes('muffin') || name.includes('scone') || name.includes('cake') ||
      name.includes('cookie') || name.includes('brownie') || name.includes('pastry') ||
      name.includes('donut') || name.includes('danish') || name.includes('sweet')) {
    return 'pastries';
  }
  
  // Retail items
  if (name.includes('beans') || name.includes('grounds') || name.includes('retail') ||
      name.includes('bag') || name.includes('kg') || name.includes('250g') ||
      name.includes('500g') || name.includes('1kg')) {
    return 'retail';
  }
  
  // Default to coffee for most items
  return 'coffee';
}

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

// New functions to fetch catalog FROM Square (instead of syncing TO Square)
export async function getSquareCategories(): Promise<any> {
  try {
    console.log('📂 Fetching categories from Square catalog...');
    
    // Get Bean Stalker location ID for validation (catalog search doesn't filter by location)
    const locationId = getSquareLocationId();
    console.log(`🏪 Bean Stalker location ID: ${locationId}`);
    
    const response = await makeSquareRequest('/catalog/search', 'POST', {
      object_types: ['CATEGORY']
      // Note: location_ids parameter doesn't filter catalog items by location in Square API
      // Location filtering needs to be done at the item/variation level
    });
    
    const categories = response.objects || [];
    
    // Since we're filtering by location_ids in the API call, all returned categories 
    // should already be specific to the Bean Stalker location
    console.log(`📂 Square API returned ${categories.length} categories for Bean Stalker location (${locationId})`);
    
    // Debug: Log category names to verify location filtering worked
    if (categories.length > 0) {
      console.log('🔧 Bean Stalker categories found:', categories.slice(0, 10).map(cat => cat.category_data?.name));
    }
    
    // No additional filtering needed since location_ids parameter handles this
    const filteredCategories = categories;
    
    console.log(`📂 Filtered ${filteredCategories.length}/${categories.length} categories for Bean Stalker sales channel`);
    
    // Convert Square categories to Bean Stalker format
    const beanStalkerCategories = filteredCategories.map((cat: any) => {
      // Map Square category name back to Bean Stalker category key
      const categoryKey = Object.entries(CATEGORY_MAPPING).find(
        ([key, displayName]) => displayName === cat.category_data?.name
      )?.[0] || cat.category_data?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
      
      return {
        id: cat.id,
        name: categoryKey,
        displayName: cat.category_data?.name || categoryKey,
        squareId: cat.id,
        rawSquareData: cat // Include raw data for debugging
      };
    });
    
    console.log(`📂 Retrieved ${beanStalkerCategories.length} categories from Square`);
    return beanStalkerCategories;
    
  } catch (error) {
    console.error('❌ Failed to fetch Square categories:', error);
    throw error;
  }
}

export async function getSquareMenuItems(): Promise<any> {
  try {
    console.log('🍽️ Fetching menu items from Square catalog...');
    
    // Get Bean Stalker location ID for validation
    const locationId = getSquareLocationId();
    console.log(`🏪 Bean Stalker location ID: ${locationId}`);
    
    // Use SearchCatalogItems to get items with proper category associations
    // Note: Square catalog API doesn't filter items by location - we need to filter by availability
    const response = await makeSquareRequest('/catalog/search-catalog-items', 'POST', {
      limit: 500, // Increase limit to get more items
      include_related_objects: true,
      sort_order: 'ASC'
      // location_ids doesn't work for filtering catalog items in Square API
    });
    
    const items = response.items || [];
    const relatedObjects = response.related_objects || [];
    
    // Create lookup maps for categories and variations
    const categoryMap: { [id: string]: any } = {};
    const variationMap: { [id: string]: any } = {};
    
    relatedObjects.forEach((obj: any) => {
      if (obj.type === 'CATEGORY') {
        categoryMap[obj.id] = obj;
      } else if (obj.type === 'ITEM_VARIATION') {
        variationMap[obj.id] = obj;
      }
    });
    
    // Since we're filtering by location_ids in the API call, all returned items 
    // should already be specific to the Bean Stalker location
    console.log(`📱 Square API returned ${items.length} items for Bean Stalker location (${locationId})`);
    
    // Get Bean Stalker categories for reference (also location-filtered)
    console.log(`🔧 Getting Bean Stalker category IDs for validation...`);
    const beanStalkerCategories = await getSquareCategories();
    const beanStalkerCategoryIds = new Set(beanStalkerCategories.map((cat: any) => cat.id));
    
    console.log(`🔧 Bean Stalker has ${beanStalkerCategoryIds.size} categories for location filtering validation`);
    
    // Debug: Check how many items have category IDs
    const itemsWithCategories = items.filter(item => item?.item_data?.category_id);
    const itemsWithoutCategories = items.filter(item => !item?.item_data?.category_id);
    
    console.log(`🔧 Item category analysis:`);
    console.log(`  - Items with category IDs: ${itemsWithCategories.length}/${items.length}`);
    console.log(`  - Items without category IDs: ${itemsWithoutCategories.length}/${items.length}`);
    
    if (itemsWithCategories.length > 0) {
      // Show sample of items with categories
      const sampleWithCategories = itemsWithCategories.slice(0, 3);
      console.log(`🔧 Sample items WITH categories:`, sampleWithCategories.map(item => ({
        id: item.id,
        name: item?.item_data?.name,
        categoryId: item?.item_data?.category_id,
        isBeanStalkerCategory: beanStalkerCategoryIds.has(item?.item_data?.category_id)
      })));
    }
    
    // If most items don't have categories, we'll need a different approach
    if (itemsWithoutCategories.length > itemsWithCategories.length) {
      console.log(`⚠️  Most items (${itemsWithoutCategories.length}/${items.length}) don't have category associations in Square API`);
      console.log(`⚠️  This means Square catalog filtering by category won't work reliably`);
    }
    
    // Since Square Catalog API doesn't filter by location, we need to filter by checking item availability
    console.log(`📊 Starting location-based filtering for ${items.length} items...`);
    
    // Filter items by checking inventory/availability at Bean Stalker location
    // Apply strict Bean Stalker location filtering (item-level)
    const locationFilteredItems = items.filter((item: any) => {
      const itemData = item.item_data;
      const itemName = itemData?.name || '';
      const itemDesc = itemData?.description || '';
      const squareId = item.id;
      
      // Exclude specific known Zan Zanz items
      const isZanZanzItem = (
        (itemName === 'Babychino' && squareId === 'FTQLYLA4CNMQPJ4PX6AAR5B6') ||
        itemDesc.toLowerCase().includes('zan zanz') ||
        itemDesc.toLowerCase().includes('zanzanz')
      );
      
      if (isZanZanzItem) {
        console.log(`🚫 Excluding Zan Zanz item: "${itemName}" (${squareId})`);
        return false;
      }
      
      console.log(`✅ Including Bean Stalker item: "${itemName}" (${squareId})`);
      return true;
    });
    
    console.log(`🏪 After location filtering: ${locationFilteredItems.length}/${items.length} items available at Bean Stalker`);
    
    // Then filter by categories for additional data quality
    const filteredItems = locationFilteredItems.filter((item: any) => {
      const itemData = item.item_data;
      const categoryId = itemData?.category_id;
      
      if (!categoryId) {
        console.log(`⚠️  Excluding uncategorized item: "${itemData?.name}"`);
        return false; // No category, exclude for data quality
      }
      
      // Verify item belongs to one of our Bean Stalker categories
      if (beanStalkerCategoryIds.has(categoryId)) {
        return true; // Valid Bean Stalker item
      } else {
        console.log(`⚠️  Item "${itemData?.name}" has unknown category ID: ${categoryId}`);
        return false; // Unknown category, exclude for safety
      }
    });
    
    console.log(`🍽️ Final filtered result: ${filteredItems.length} items for Bean Stalker location`);
    
    // Convert Square items to Bean Stalker format
    const beanStalkerItems = filteredItems.map((item: any) => {
      const itemData = item.item_data;
      const category = categoryMap[itemData?.category_id];
      
      // Get the first variation for pricing - try multiple approaches
      let price = 0;
      
      // Approach 1: Try to get from variations in item data
      const firstVariationId = itemData?.variations?.[0]?.id;
      const variation = variationMap[firstVariationId];
      if (variation?.item_variation_data?.price_money?.amount) {
        price = variation.item_variation_data.price_money.amount / 100; // Convert from cents
      }
      
      // Approach 2: Check if variation data is embedded directly in item
      else if (itemData?.variations?.[0]?.item_variation_data?.price_money?.amount) {
        price = itemData.variations[0].item_variation_data.price_money.amount / 100;
      }
      
      // Approach 3: Check related objects for ITEM_VARIATION type with matching item ID
      else {
        const relatedVariation = relatedObjects.find((obj: any) => 
          obj.type === 'ITEM_VARIATION' && 
          obj.item_variation_data?.item_id === item.id
        );
        if (relatedVariation?.item_variation_data?.price_money?.amount) {
          price = relatedVariation.item_variation_data.price_money.amount / 100;
        }
      }
      
      // Debug logging for price extraction
      if (price === 0) {
        console.log(`⚠️  Price extraction failed for "${itemData?.name}": no valid price found`);
        console.log(`   - Variation ID: ${firstVariationId}`);
        console.log(`   - Has variation in map: ${!!variation}`);
        console.log(`   - Related variations: ${relatedObjects.filter((obj: any) => obj.type === 'ITEM_VARIATION').length}`);
      }
      
      // Map Square category back to Bean Stalker category - NO NAME-BASED INFERENCE
      const categoryDisplayName = category?.category_data?.name;
      let categoryKey = Object.entries(CATEGORY_MAPPING).find(
        ([key, displayName]) => displayName === categoryDisplayName
      )?.[0];
      
      // If no category mapping found, use the actual Square category name directly
      if (!categoryKey) {
        categoryKey = categoryDisplayName?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
      }
      
      return {
        id: item.id,
        name: itemData?.name || 'Unknown Item',
        description: itemData?.description || '',
        price: price,
        category: categoryKey,
        categoryDisplayName: categoryDisplayName || 'Unknown',
        squareId: item.id,
        squareCategoryId: itemData?.category_id,
        image: null, // Square images would need separate API call
        isAvailable: true
      };
    });
    
    console.log(`🍽️ Retrieved ${filteredItems.length} menu items from Square`);
    return beanStalkerItems;
    
  } catch (error) {
    console.error('❌ Failed to fetch Square menu items:', error);
    throw error;
  }
}

/**
 * Fetch Square image URL directly via Catalog Object API with rate limiting
 */
async function fetchSquareImageUrl(imageId: string): Promise<string | null> {
  try {
    console.log(`🔄 Fetching Square image directly (ID: ${imageId})`);
    
    // Add a small delay to help with rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const response = await makeSquareRequest(`/catalog/object/${imageId}`, 'GET');
    const imageData = response.object?.image_data;
    
    if (imageData?.url) {
      console.log(`🖼️  Retrieved Square image URL: ${imageData.url}`);
      return imageData.url;
    } else {
      console.log(`❌ No image URL found for image ID: ${imageId}`);
      return null;
    }
  } catch (error) {
    if (error.message.includes('429') || error.message.includes('RATE_LIMITED')) {
      console.log(`⏳ Rate limited for image ID ${imageId}, skipping`);
      return null;
    }
    console.log(`❌ Failed to fetch image ID ${imageId}:`, error);
    return null;
  }
}

/**
 * Get menu items for a specific category using Square's SearchCatalogItems API
 * This is the proper and efficient way to filter items by category
 */
export async function getSquareItemsByCategory(categoryId: string, requestedCategoryName?: string): Promise<any[]> {
  try {
    console.log(`🔍 Fetching items for category ${categoryId} using SearchCatalogItems...`);
    
    // Get Bean Stalker location ID for filtering
    const locationId = getSquareLocationId();
    
    // Use Square's SearchCatalogItems to get items with embedded variation data
    const response = await makeSquareRequest('/catalog/search-catalog-items', 'POST', {
      category_ids: [categoryId],
      limit: 100,
      include_related_objects: true,
      sort_order: 'ASC'
      // Note: location_ids doesn't work for filtering - we'll filter by availability
    });
    
    const items = response.items || [];
    const relatedObjects = response.related_objects || [];
    
    console.log(`🔍 Found ${items.length} items in category ${categoryId}`);
    
    // Apply strict Bean Stalker location filtering
    const locationFilteredItems = items.filter((item: any) => {
      const itemData = item.item_data;
      const itemName = itemData?.name || '';
      const itemDesc = itemData?.description || '';
      const squareId = item.id;
      
      // Exclude specific known Zan Zanz items
      const isZanZanzItem = (
        (itemName === 'Babychino' && squareId === 'FTQLYLA4CNMQPJ4PX6AAR5B6') ||
        itemDesc.toLowerCase().includes('zan zanz') ||
        itemDesc.toLowerCase().includes('zanzanz')
      );
      
      if (isZanZanzItem) {
        console.log(`🚫 Excluding Zan Zanz item: "${itemName}" (${squareId})`);
        return false;
      }
      
      console.log(`✅ Including Bean Stalker item: "${itemName}" (${squareId})`);
      return true;
    });
    
    console.log(`🏪 Location filtering: ${locationFilteredItems.length}/${items.length} items filtered for Bean Stalker`);
    console.log(`🔍 Retrieved ${locationFilteredItems.length} items for category ${categoryId}`);
    
    // Convert Square items to Bean Stalker format with async image fetching
    const beanStalkerItems = await Promise.all(locationFilteredItems.map(async (item: any) => {
      const itemData = item.item_data;
      
      // Get price from first variation - SearchCatalogItems embeds variation data directly
      let price = 0;
      
      if (itemData?.variations?.[0]?.item_variation_data?.price_money?.amount) {
        price = itemData.variations[0].item_variation_data.price_money.amount / 100;
      }
      
      // Use the requested category name directly - NO NAME-BASED INFERENCE  
      const category = requestedCategoryName || 'unknown';
      
      // Check if item has variations (multiple options/sizes)
      const hasVariations = itemData?.variations && itemData.variations.length > 1;
      
      // Extract Square image URL if available
      let imageUrl = null;
      let squareImageUrl = null;
      
      // Debug logging for image processing
      if (itemData?.name === '* Baby Chino' || itemData?.name?.includes('Baby Chino')) {
        console.log(`🔍 Debugging "${itemData?.name}" images:`);
        console.log(`  - Item ID:`, item.id);
        console.log(`  - Image IDs:`, itemData?.image_ids);
        console.log(`  - Related objects total:`, relatedObjects.length);
        console.log(`  - Related image objects:`, relatedObjects.filter((obj: any) => obj.type === 'IMAGE').length);
        console.log(`  - Item data keys:`, Object.keys(itemData || {}));
      }
      
      if (itemData?.image_ids && itemData.image_ids.length > 0) {
        // Find the image object in related objects
        const imageId = itemData.image_ids[0]; // Use first image
        const imageObject = relatedObjects.find((obj: any) => obj.id === imageId && obj.type === 'IMAGE');
        
        if (imageObject?.image_data?.url) {
          squareImageUrl = imageObject.image_data.url;
          imageUrl = squareImageUrl; // Use Square image as primary
          console.log(`🖼️  Found Square image for "${itemData?.name}": ${imageUrl}`);
        } else {
          console.log(`⚠️  Image ID "${imageId}" found for "${itemData?.name}" but no matching image object`);
          // Fetch image directly from Square API when not in related objects
          const directImageUrl = await fetchSquareImageUrl(imageId);
          if (directImageUrl) {
            squareImageUrl = directImageUrl;
            imageUrl = squareImageUrl;
            console.log(`🖼️  Retrieved Square image directly for "${itemData?.name}": ${imageUrl}`);
          }
        }
      } else if (itemData?.name === '* Baby Chino' || itemData?.name?.includes('Baby Chino')) {
        console.log(`ℹ️  No image IDs found for "${itemData?.name}"`);
      }
      
      return {
        id: parseInt(item.id.slice(-8), 16), // Generate numeric ID from Square ID
        name: itemData?.name || 'Unnamed Item',
        description: itemData?.description || '',
        price: price,
        category: category,
        categoryDisplayName: CATEGORY_MAPPING[category as keyof typeof CATEGORY_MAPPING] || category,
        squareId: item.id,
        squareCategoryId: categoryId,
        imageUrl: imageUrl, // Square image URL or null
        squareImageUrl: squareImageUrl, // Separate field for Square images
        isAvailable: true,
        hasOptions: hasVariations, // Only when Square has variations
        hasSizes: hasVariations // Only when Square has variations
      };
    }));
    
    console.log(`🔍 Retrieved ${beanStalkerItems.length} items for category ${categoryId}`);
    return beanStalkerItems;
    
  } catch (error) {
    console.error(`❌ Failed to fetch Square items for category ${categoryId}:`, error);
    throw error;
  }
}

/**
 * Get menu items for multiple categories using Square's SearchCatalogItems API
 * More efficient than calling getSquareItemsByCategory multiple times
 */
export async function getSquareItemsByCategories(categoryIds: string[]): Promise<any[]> {
  try {
    console.log(`🔍 Fetching items for ${categoryIds.length} categories using SearchCatalogItems...`);
    
    // Use Square's SearchCatalogItems endpoint with multiple category filter
    const response = await makeSquareRequest('/catalog/search-catalog-items', 'POST', {
      category_ids: categoryIds,
      limit: 100, // Max items per request
      include_related_objects: true,
      sort_order: 'ASC'
    });
    
    const items = response.items || [];
    const relatedObjects = response.related_objects || [];
    
    console.log(`🔍 Found ${items.length} total items across ${categoryIds.length} categories`);
    
    // Create lookup map for variations
    const variationMap: { [id: string]: any } = {};
    relatedObjects.forEach((obj: any) => {
      if (obj.type === 'ITEM_VARIATION') {
        variationMap[obj.id] = obj;
      }
    });
    
    // Convert Square items to Bean Stalker format
    const beanStalkerItems = items.map((item: any) => {
      const itemData = item.item_data;
      const variationIds = itemData?.variations?.map((v: any) => v.id) || [];
      const variations = variationIds.map(id => variationMap[id]).filter(Boolean);
      
      // Get price from first variation
      const firstVariation = variations[0];
      const priceInCents = firstVariation?.item_variation_data?.price_money?.amount || 0;
      const price = priceInCents / 100; // Convert to dollars
      
      // Infer category from item name since items might not have proper category associations
      const category = inferCategoryFromItemName(itemData?.name || '');
      
      // Extract Square image URL if available
      let imageUrl = null;
      if (itemData?.image_ids && itemData.image_ids.length > 0) {
        // Find the image object in related objects
        const imageId = itemData.image_ids[0]; // Use first image
        const imageObject = relatedObjects.find((obj: any) => obj.id === imageId && obj.type === 'IMAGE');
        if (imageObject?.image_data?.url) {
          imageUrl = imageObject.image_data.url;
          console.log(`🖼️  Found Square image for "${itemData?.name}": ${imageUrl}`);
        }
      }
      
      // Check if item has variations (multiple options/sizes) 
      const hasVariations = variations && variations.length > 1;
      
      return {
        id: parseInt(item.id.slice(-8), 16), // Generate numeric ID from Square ID
        name: itemData?.name || 'Unnamed Item',
        description: itemData?.description || '',
        price: price,
        category: category,
        categoryDisplayName: CATEGORY_MAPPING[category as keyof typeof CATEGORY_MAPPING] || category,
        squareId: item.id,
        squareCategoryId: itemData?.category_id || 'inferred',
        imageUrl: imageUrl, // Square image URL or null
        isAvailable: true,
        hasOptions: hasVariations, // Only when Square has actual variations
        hasSizes: hasVariations // Only when Square has actual variations
      };
    });
    
    console.log(`🔍 Retrieved ${beanStalkerItems.length} items for ${categoryIds.length} categories`);
    return beanStalkerItems;
    
  } catch (error) {
    console.error(`❌ Failed to fetch Square items for categories:`, error);
    throw error;
  }
}

export async function getSquareCatalog(): Promise<{ categories: any[], menuItems: any[] }> {
  try {
    console.log('🏪 Fetching complete catalog from Square...');
    
    const [categories, menuItems] = await Promise.all([
      getSquareCategories(),
      getSquareMenuItems()
    ]);
    
    return {
      categories,
      menuItems
    };
    
  } catch (error) {
    console.error('❌ Failed to fetch Square catalog:', error);
    throw error;
  }
}

/**
 * Get variations/options for a specific Square item
 * This extracts size options, milk options, etc. from Square item variations
 */
export async function getSquareItemVariations(squareItemId: string): Promise<any[]> {
  try {
    console.log(`🔧 Fetching variations for Square item: ${squareItemId}`);
    
    // First, get the specific item with its variations
    const response = await makeSquareRequest('/catalog/search-catalog-objects', 'POST', {
      object_types: ['ITEM'],
      query: {
        exact_query: {
          attribute_name: 'id',
          attribute_value: squareItemId
        }
      },
      include_related_objects: true
    });
    
    const items = response.objects || [];
    const relatedObjects = response.related_objects || [];
    
    if (items.length === 0) {
      console.log(`⚠️  No item found with ID: ${squareItemId}`);
      return [];
    }
    
    const item = items[0];
    const itemData = item.item_data;
    const variations = itemData?.variations || [];
    
    console.log(`🔧 Found ${variations.length} variations for "${itemData?.name}"`);
    
    // If no variations found in Square, return empty array (no fake options)
    if (variations.length === 0) {
      console.log(`🔧 No variations found for "${itemData?.name}" in Square`);
      return [];
    }
    
    // Convert Square variations to Bean Stalker option format
    const options = variations.map((variation: any, index: number) => {
      const variationData = variation.item_variation_data;
      const price = variationData?.price_money?.amount ? variationData.price_money.amount / 100 : 0;
      
      // Determine option type from variation name
      let optionType = 'size';
      const variationName = variationData?.name || '';
      
      if (variationName.toLowerCase().includes('milk') || variationName.toLowerCase().includes('cream')) {
        optionType = 'milk';
      } else if (variationName.toLowerCase().includes('shot') || variationName.toLowerCase().includes('extra')) {
        optionType = 'extras';
      } else if (variationName.toLowerCase().includes('size') || 
                 ['small', 'medium', 'large', 'regular'].some(size => variationName.toLowerCase().includes(size))) {
        optionType = 'size';
      }
      
      return {
        id: variation.id,
        name: variationData?.name || `Option ${index + 1}`,
        price: price,
        priceModifier: price, // How much this option adds to base price
        category: optionType,
        isDefault: index === 0, // First variation is usually the default
        isAvailable: true,
        squareVariationId: variation.id
      };
    });
    
    console.log(`🔧 Converted ${options.length} Square variations to Bean Stalker options`);
    return options;
    
  } catch (error) {
    console.error(`❌ Failed to fetch Square item variations for ${squareItemId}:`, error);
    return []; // Return empty array when API fails
  }
}

