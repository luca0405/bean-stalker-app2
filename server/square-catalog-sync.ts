/**
 * Square Catalog Sync - Sync Bean Stalker menu to Square catalog
 * This will create categories and menu items in Square for Kitchen Display integration
 */

import { storage } from './storage';
import { getSquareAccessToken, getSquareLocationId, getSquareEnvironment } from './square-config';
import { getCentsFromSquareMoney, centsToDisplayPrice, validatePriceCents, createSquareMoneyFromCents } from './square-price-utils';
import * as fs from 'fs';
import * as path from 'path';

// Category mapping - using actual Square category names
const CATEGORY_MAPPING: { [key: string]: string } = {
  'coffee': 'Coffee',
  'food': 'Food',
  'beverages': 'Beverages',
  'breakfast': 'Breakfast',
  'lunch': 'Lunch',
  'snacks': 'Snacks',
  'desserts': 'Desserts'
};

/**
 * Simple category inference from item name as fallback
 */
function inferCategoryFromItemName(itemName: string): string {
  const name = itemName.toLowerCase();
  
  if (name.includes('coffee') || name.includes('espresso') || name.includes('latte') || name.includes('cappuccino')) {
    return 'coffee';
  }
  if (name.includes('breakfast') || name.includes('toast') || name.includes('eggs')) {
    return 'breakfast';
  }
  if (name.includes('lunch') || name.includes('sandwich') || name.includes('wrap')) {
    return 'lunch';
  }
  if (name.includes('drink') || name.includes('juice') || name.includes('tea')) {
    return 'beverages';
  }
  if (name.includes('cake') || name.includes('muffin') || name.includes('cookie')) {
    return 'desserts';
  }
  
  return 'food'; // Default category
}

/**
 * Map Square category name to local category key
 */
function mapSquareCategoryToLocal(categoryName: string): string {
  const name = categoryName.toLowerCase();
  
  // Direct mapping from Square category names
  if (name.includes('coffee')) return 'coffee';
  if (name.includes('breakfast')) return 'breakfast';
  if (name.includes('lunch')) return 'lunch';
  if (name.includes('beverage') || name.includes('drink')) return 'beverages';
  if (name.includes('dessert') || name.includes('sweet')) return 'desserts';
  if (name.includes('snack')) return 'snacks';
  
  return 'food'; // Default category
}

// Square API base URL
const getSquareApiBase = () => {
  const environment = getSquareEnvironment();
  return environment === 'production' 
    ? 'https://connect.squareup.com/v2'
    : 'https://connect.squareupsandbox.com/v2';
};

const SQUARE_VERSION = '2025-08-20';

/**
 * Get Bean Stalker Square IDs from database for filtering Square API responses
 * This ensures we only process items that exist in our Bean Stalker menu
 */
async function getBeanStalkerSquareIds(): Promise<Set<string>> {
  try {
    console.log('🗄️  Getting Bean Stalker Square IDs from database for filtering...');
    
    const beanStalkerItems = await storage.getMenuItems();
    const allowedSquareIds = new Set(
      beanStalkerItems
        .map(item => item.squareId)
        .filter((squareId): squareId is string => Boolean(squareId))
    );
    
    console.log(`🗄️  Found ${allowedSquareIds.size} Bean Stalker Square IDs in database`);
    
    if (allowedSquareIds.size > 0) {
      const sampleIds = Array.from(allowedSquareIds).slice(0, 5);
      console.log(`🗄️  Sample Bean Stalker Square IDs: ${sampleIds.join(', ')}`);
    }
    
    return allowedSquareIds;
  } catch (error) {
    console.error('❌ Failed to get Bean Stalker Square IDs from database:', error);
    return new Set();
  }
}

/**
 * Test the database-first implementation: Verify sync only processes Bean Stalker items
 * This demonstrates that the fix prevents processing of ALL Square items
 */
export async function testDatabaseFirstSync(): Promise<{
  success: boolean;
  beanStalkerItemCount: number;
  wouldProcessBeforefix: number;
  willProcessAfterFix: number;
  message: string;
}> {
  try {
    console.log('🧪 Testing DATABASE-FIRST sync implementation...');
    
    // Get Bean Stalker items from database (what we SHOULD process)
    const allowedSquareIds = await getBeanStalkerSquareIds();
    const beanStalkerCount = allowedSquareIds.size;
    
    // Simulate old approach: Get ALL Square items (what we USED TO process)
    const allSquareItemsResponse = await makeSquareRequest('/catalog/search-catalog-objects', 'POST', {
      object_types: ['ITEM']
    });
    const allSquareItems = allSquareItemsResponse.objects || [];
    const oldApproachCount = allSquareItems.length;
    
    // New approach: Only Bean Stalker items
    const newApproachCount = beanStalkerCount;
    
    const isFixed = newApproachCount <= beanStalkerCount && newApproachCount > 0;
    const message = isFixed 
      ? `✅ DATABASE-FIRST working: Only processing ${newApproachCount} Bean Stalker items instead of ${oldApproachCount} total Square items`
      : `❌ DATABASE-FIRST failed: Still would process ${oldApproachCount} items instead of ${beanStalkerCount} Bean Stalker items`;
    
    console.log(message);
    
    return {
      success: isFixed,
      beanStalkerItemCount: beanStalkerCount,
      wouldProcessBeforefix: oldApproachCount,
      willProcessAfterFix: newApproachCount,
      message
    };
    
  } catch (error) {
    const errorMessage = `Failed to test database-first sync: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('❌', errorMessage);
    
    return {
      success: false,
      beanStalkerItemCount: 0,
      wouldProcessBeforefix: 0,
      willProcessAfterFix: 0,
      message: errorMessage
    };
  }
}

/**
 * Clean existing bad data: Remove modifier links for non-Bean Stalker items
 * This removes entries where the squareItemId is not in our Bean Stalker menu_items table
 */
async function cleanBadModifierLinks(): Promise<{ removed: number; errors: string[] }> {
  const result = {
    removed: 0,
    errors: [] as string[]
  };

  try {
    console.log('🧹 Cleaning bad modifier links (non-Bean Stalker items)...');
    
    // Get allowed Bean Stalker Square IDs
    const allowedSquareIds = await getBeanStalkerSquareIds();
    
    if (allowedSquareIds.size === 0) {
      console.log('⚠️  No Bean Stalker items found, skipping bad link cleanup');
      return result;
    }
    
    // Get all existing modifier links
    const allModifierLinks = await storage.getMenuItemModifierLists();
    console.log(`🔍 Found ${allModifierLinks.length} existing modifier links to check`);
    
    // Identify bad links (for non-Bean Stalker items)
    const badLinks = allModifierLinks.filter(link => 
      link.squareItemId && !allowedSquareIds.has(link.squareItemId)
    );
    
    console.log(`🗑️  Found ${badLinks.length} bad modifier links for non-Bean Stalker items`);
    
    if (badLinks.length > 0) {
      // Log sample of bad Square IDs being removed
      const sampleBadIds = badLinks.slice(0, 5).map(link => link.squareItemId).filter(Boolean);
      console.log(`🗑️  Sample non-Bean Stalker Square IDs being removed: ${sampleBadIds.join(', ')}`);
      
      // Remove bad links by calling deleteMenuItemModifierLinksBySquareItemId for each
      for (const badLink of badLinks) {
        if (badLink.squareItemId) {
          try {
            await storage.deleteMenuItemModifierLinksBySquareItemId(badLink.squareItemId);
            result.removed++;
          } catch (error) {
            const errorMsg = `Failed to delete modifier links for ${badLink.squareItemId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.warn(`⚠️  ${errorMsg}`);
            result.errors.push(errorMsg);
          }
        }
      }
    }
    
    console.log(`✅ Cleaned up ${result.removed} bad modifier links`);
    return result;
    
  } catch (error) {
    const errorMsg = `Failed to clean bad modifier links: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`❌ ${errorMsg}`);
    result.errors.push(errorMsg);
    return result;
  }
}

/**
 * Normalize a product name for fuzzy matching
 * Handles special characters, spaces, and common variations
 */
function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Replace special characters and symbols
    .replace(/[&]/g, 'and')
    .replace(/[*]/g, '')
    .replace(/[-_]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove common words that don't help matching
    .replace(/\b(the|a|an|with|w\/|w)\b/g, '')
    // Remove punctuation
    .replace(/[^\w\s]/g, '')
    // Final cleanup
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Automatically map local images to Square products by name matching
 * This function scans the images directory and maps files to Square items
 */
export async function autoMapLocalImages(squareItems: any[]): Promise<void> {
  try {
    const imagesDir = path.resolve(process.cwd(), 'images for app');
    
    // Check if images directory exists
    if (!fs.existsSync(imagesDir)) {
      console.log('📂 No images directory found, skipping auto-mapping');
      return;
    }
    
    // Get all image files
    const imageFiles = fs.readdirSync(imagesDir)
      .filter(file => /\.(png|jpg|jpeg|gif|webp)$/i.test(file));
    
    console.log(`🔍 Auto-mapping ${imageFiles.length} local images to ${squareItems.length} Square products...`);
    
    let mappedCount = 0;
    
    for (const imageFile of imageFiles) {
      // Extract product name from filename (remove extension)
      const filenameWithoutExt = path.parse(imageFile).name;
      const normalizedFilename = normalizeProductName(filenameWithoutExt);
      
      // Find matching Square product
      let bestMatch = null;
      let bestScore = 0;
      
      for (const item of squareItems) {
        const itemName = item.name || '';
        const normalizedItemName = normalizeProductName(itemName);
        
        // Calculate similarity score
        let score = 0;
        
        // Exact match gets highest score
        if (normalizedFilename === normalizedItemName) {
          score = 1000;
        }
        // Check if filename contains all words from item name
        else if (normalizedFilename.includes(normalizedItemName)) {
          score = 800;
        }
        // Check if item name contains all words from filename
        else if (normalizedItemName.includes(normalizedFilename)) {
          score = 700;
        }
        // Word overlap scoring
        else {
          const filenameWords = normalizedFilename.split(' ').filter(w => w.length > 2);
          const itemWords = normalizedItemName.split(' ').filter(w => w.length > 2);
          
          const commonWords = filenameWords.filter(word => itemWords.includes(word));
          if (commonWords.length > 0) {
            score = (commonWords.length / Math.max(filenameWords.length, itemWords.length)) * 500;
          }
        }
        
        if (score > bestScore && score > 200) { // Minimum threshold for matching
          bestMatch = item;
          bestScore = score;
        }
      }
      
      if (bestMatch) {
        try {
          // Check if mapping already exists
          const existingItem = await storage.getMenuItemBySquareId(bestMatch.squareId);
          
          const imageUrl = `/product-images/${encodeURIComponent(imageFile)}`;
          
          if (existingItem) {
            // Update existing item with image
            await storage.updateMenuItem(existingItem.id, {
              ...existingItem,
              imageUrl: imageUrl
            });
            console.log(`✅ Updated "${bestMatch.name}" with image: ${imageFile} (score: ${bestScore})`);
          } else {
            // Create new menu item with image - use proper Square category mapping
            let properCategory = 'food'; // fallback
            let squareCategoryId = null;
            
            // If item has Square category ID, look up the proper category
            if (bestMatch.squareCategoryId) {
              const categoryRecord = await storage.getCategoryBySquareId(bestMatch.squareCategoryId);
              if (categoryRecord) {
                properCategory = categoryRecord.name;
                squareCategoryId = bestMatch.squareCategoryId;
                console.log(`🔗 Mapped Square category "${bestMatch.squareCategoryId}" to "${properCategory}"`);
              } else {
                console.log(`⚠️  Square category "${bestMatch.squareCategoryId}" not found in whitelist, skipping item`);
                continue; // Skip items from non-whitelisted categories
              }
            } else {
              console.log(`🚫 Skipping creation of "${bestMatch.name}" - no Square category ID`);
              continue;
            }
            
            const newItem = {
              name: bestMatch.name,
              description: bestMatch.description || '',
              price: bestMatch.price || 0,
              category: properCategory,
              squareId: bestMatch.squareId,
              squareCategoryId: squareCategoryId,
              imageUrl: imageUrl,
              isAvailable: true
            };
            
            await storage.createMenuItem(newItem);
            console.log(`✅ Created "${bestMatch.name}" with image: ${imageFile} (score: ${bestScore})`);
          }
          
          mappedCount++;
          
        } catch (error) {
          console.warn(`⚠️  Failed to store mapping for "${imageFile}" -> "${bestMatch.name}":`, error);
        }
      } else {
        console.log(`❌ No match found for image: ${imageFile}`);
      }
    }
    
    console.log(`🎯 Auto-mapping completed: ${mappedCount}/${imageFiles.length} images mapped to products`);
    
  } catch (error) {
    console.error('❌ Auto-mapping failed:', error);
  }
}

/**
 * Filter items by location availability using Square's inventory API
 * This ensures only items actually available at Bean Stalker are included
 */
async function filterItemsByLocationAvailability(items: any[], locationId: string): Promise<any[]> {
  try {
    console.log(`🔍 Filtering ${items.length} items by location availability at ${locationId}`);
    
    // Extract all variation IDs from items
    const variationIds: string[] = [];
    items.forEach(item => {
      const variations = item.item_data?.variations || [];
      variations.forEach((variation: any) => {
        if (variation.id) {
          variationIds.push(variation.id);
        }
      });
    });
    
    if (variationIds.length === 0) {
      console.log(`⚠️  No variations found in ${items.length} items`);
      return [];
    }
    
    console.log(`📊 Checking availability for ${variationIds.length} variations at Bean Stalker location`);
    
    // Check inventory for all variations at Bean Stalker location
    const availableVariationIds = new Set<string>();
    
    for (let i = 0; i < variationIds.length; i += 100) {
      const batch = variationIds.slice(i, i + 100);
      
      try {
        const inventoryResponse = await makeSquareRequest('/inventory/batch-retrieve-counts', 'POST', {
          location_ids: [locationId],
          catalog_object_ids: batch,
          states: ['IN_STOCK', 'SOLD']
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
        
      } catch (batchError) {
        console.warn(`⚠️  Inventory check failed for batch ${Math.floor(i / 100) + 1}:`, batchError);
        // If inventory API fails, be conservative - exclude these items
      }
      
      // Small delay between batches to respect API limits
      if (i + 100 < variationIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`📊 Found ${availableVariationIds.size}/${variationIds.length} variations available at Bean Stalker`);
    
    // Filter items to only include those with available variations at Bean Stalker
    const locationFilteredItems = items.filter(item => {
      const itemData = item.item_data;
      const itemName = itemData?.name || '';
      const variations = itemData?.variations || [];
      
      const hasAvailableVariation = variations.some((variation: any) => 
        availableVariationIds.has(variation.id)
      );
      
      // Additional explicit exclusions for known non-Bean Stalker items
      const isExplicitlyExcluded = (
        itemName === 'Luscious Lorrikeet' ||
        itemName === 'Babychino' ||
        itemData?.description?.toLowerCase().includes('zan zanz') ||
        itemData?.description?.toLowerCase().includes('zanzanz')
      );
      
      if (isExplicitlyExcluded) {
        console.log(`🚫 Excluding known non-Bean Stalker item: "${itemName}" (${item.id}) - explicit exclusion`);
        return false;
      }
      
      if (hasAvailableVariation) {
        console.log(`✅ Including Bean Stalker item: "${itemName}" (${item.id})`);
      } else {
        console.log(`🚫 Excluding non-Bean Stalker item: "${itemName}" (${item.id}) - no available variations at location`);
      }
      
      return hasAvailableVariation;
    });
    
    return locationFilteredItems;
    
  } catch (error) {
    console.error(`❌ Location availability filtering failed:`, error);
    console.log(`🚫 Using strict filtering - excluding ALL items when location filtering fails (safer)`);
    return [];
  }
}

export async function makeSquareRequest(endpoint: string, method: string = 'GET', body?: any) {
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

/**
 * Helper function to fetch ALL objects from Square catalog with automatic pagination
 * Follows cursor until all objects are retrieved
 */
async function getAllSquareCatalogObjects(objectType: 'ITEM' | 'CATEGORY'): Promise<any[]> {
  console.log(`📄 Fetching ALL ${objectType} objects with pagination...`);
  
  const allObjects: any[] = [];
  let cursor: string | undefined;
  let pageNumber = 1;
  
  do {
    try {
      // Build endpoint with cursor if we have one
      let endpoint = `/catalog/list?types=${objectType}`;
      if (cursor) {
        endpoint += `&cursor=${encodeURIComponent(cursor)}`;
      }
      
      console.log(`📄 Fetching page ${pageNumber} of ${objectType} objects...`);
      
      const response = await makeSquareRequest(endpoint, 'GET');
      
      const objects = response.objects || [];
      const newObjectCount = objects.length;
      allObjects.push(...objects);
      
      console.log(`✅ Page ${pageNumber}: Got ${newObjectCount} ${objectType} objects (total: ${allObjects.length})`);
      
      // Update cursor for next page
      cursor = response.cursor;
      pageNumber++;
      
      // Small delay between requests to be respectful to API
      if (cursor) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
    } catch (error) {
      console.error(`❌ Failed to fetch page ${pageNumber} of ${objectType} objects:`, error);
      break; // Stop pagination on error
    }
    
  } while (cursor); // Continue while there are more pages
  
  console.log(`🎯 Pagination complete: Retrieved ${allObjects.length} total ${objectType} objects across ${pageNumber - 1} pages`);
  return allObjects;
}

/**
 * Helper function to fetch ALL catalog items with related objects using search-catalog-items with pagination
 */
async function getAllSquareMenuItemsWithPagination(): Promise<{ items: any[], relatedObjects: any[] }> {
  console.log(`📄 Fetching ALL menu items with pagination using search-catalog-items...`);
  
  const allItems: any[] = [];
  const allRelatedObjects: any[] = [];
  let cursor: string | undefined;
  let pageNumber = 1;
  
  do {
    try {
      console.log(`📄 Fetching page ${pageNumber} of menu items...`);
      
      const requestBody: any = {
        limit: 100, // Square API maximum limit
        include_related_objects: true,
        sort_order: 'ASC'
      };
      
      if (cursor) {
        requestBody.cursor = cursor;
      }
      
      const response = await makeSquareRequest('/catalog/search-catalog-items', 'POST', requestBody);
      
      const items = response.items || [];
      const relatedObjects = response.related_objects || [];
      
      allItems.push(...items);
      allRelatedObjects.push(...relatedObjects);
      
      console.log(`✅ Page ${pageNumber}: Got ${items.length} items, ${relatedObjects.length} related objects (total: ${allItems.length} items, ${allRelatedObjects.length} related)`);
      
      // Update cursor for next page
      cursor = response.cursor;
      pageNumber++;
      
      // Small delay between requests to be respectful to API
      if (cursor) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
    } catch (error) {
      console.error(`❌ Failed to fetch page ${pageNumber} of menu items:`, error);
      break; // Stop pagination on error
    }
    
  } while (cursor); // Continue while there are more pages
  
  console.log(`🎯 Menu items pagination complete: Retrieved ${allItems.length} total items with ${allRelatedObjects.length} related objects across ${pageNumber - 1} pages`);
  return { items: allItems, relatedObjects: allRelatedObjects };
}

// NO CUSTOM MAPPING - Use actual Square categories only

// Get all Square locations
async function getAllSquareLocations(): Promise<any[]> {
  try {
    console.log('📍 Fetching Square locations using API...');
    
    const response = await makeSquareRequest('/locations', 'GET');
    
    if (response.locations) {
      console.log('📍 Available Square locations:');
      response.locations.forEach((location: any) => {
        console.log(`   - ${location.name} (ID: ${location.id})`);
      });
      return response.locations;
    }
    return [];
  } catch (error) {
    console.error('❌ Failed to get Square locations:', error);
    return [];
  }
}

// Get actual Square categories from ALL location items - NO CUSTOM MAPPING
async function getActualSquareCategoriesFromItems(): Promise<{ [categoryId: string]: string }> {
  try {
    console.log('🔍 Getting ACTUAL Square categories from ALL location items...');
    
    // Get all locations to check both Bean Stalker AND Zan Zanz
    const allLocations = await getAllSquareLocations();
    
    // Get all items from Square with FULL PAGINATION
    const allItems = await getAllSquareCatalogObjects('ITEM');
    
    if (allItems.length === 0) {
      console.log('❌ No items found in Square catalog');
      return {};
    }
    
    console.log(`📦 Retrieved ${allItems.length} total items from Square catalog (all pages)`);
    
    // Instead of filtering by location, check ALL items for categories
    // This allows us to find categories from both Bean Stalker and Zan Zanz locations
    console.log(`🏪 Checking ALL ${allItems.length} items from all locations for categories`);
    
    // DEBUG: Log sample item structure to see what fields are available
    if (allItems.length > 0) {
      console.log('🔍 DEBUG: Sample item structure:', JSON.stringify(allItems[0], null, 2));
    }
    
    // Collect unique category IDs from ALL items (not just one location)
    // CRITICAL FIX: Square API returns categories as array, not category_id
    const categoryIds = new Set<string>();
    allItems.forEach((item, index) => {
      // Try multiple category sources from Square API
      const categories = item.item_data?.categories || [];
      const reportingCategoryId = item.item_data?.reporting_category?.id;
      const legacyCategoryId = item.item_data?.category_id;
      
      // Extract category IDs from categories array (primary method)
      categories.forEach((category: any) => {
        if (category.id) {
          categoryIds.add(category.id);
        }
      });
      
      // Fallback to reporting category
      if (reportingCategoryId) {
        categoryIds.add(reportingCategoryId);
      }
      
      // Fallback to legacy category_id
      if (legacyCategoryId) {
        categoryIds.add(legacyCategoryId);
      }
      
      // Debug logging for first few items
      if (index < 10) {
        const totalCategoryIds = categories.length + (reportingCategoryId ? 1 : 0) + (legacyCategoryId ? 1 : 0);
        console.log(`🔍 Item "${item.item_data?.name}" has ${totalCategoryIds} category sources:`);
        console.log(`   - categories[]: ${categories.length} items`);
        console.log(`   - reporting_category: ${reportingCategoryId || 'none'}`);
        console.log(`   - category_id: ${legacyCategoryId || 'none'}`);
      }
    });
    
    console.log(`📂 Found ${categoryIds.size} unique categories from ALL items (Bean Stalker + Zan Zanz)`);
    
    // Fetch ALL category objects from Square with pagination
    const allCategories = await getAllSquareCatalogObjects('CATEGORY');
    console.log(`📂 Retrieved ${allCategories.length} total categories from Square catalog (all pages)`);
    
    // Build map of category ID to actual Square category name
    const actualCategories: { [categoryId: string]: string } = {};
    
    for (const categoryId of Array.from(categoryIds)) {
      const category = allCategories.find((cat: any) => cat.id === categoryId);
      if (category && category.category_data?.name) {
        actualCategories[categoryId] = category.category_data.name;
        console.log(`✅ ACTUAL Square category: "${category.category_data.name}" (${categoryId})`);
      }
    }
    
    return actualCategories;
  } catch (error) {
    console.error('❌ Failed to get actual Square categories:', error);
    return {};
  }
}

// NO INFERENCE LOGIC - Use actual Square categories only

export async function syncCategoriesToSquare(): Promise<any> {
  try {
    console.log('📂 Starting Square catalog categories sync...');
    
    // Get ALL existing categories from Square using pagination
    const existingCategories = await getAllSquareCatalogObjects('CATEGORY');
    const existingCategoryNames = existingCategories.map((cat: any) => cat.category_data?.name);
    
    console.log(`📂 Found ${existingCategories.length} existing Square categories (all pages)`);
    
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
    
    // Filter items to only include those with valid categories and that don't exist
    const validMenuItems = menuItems.filter(item => {
      // Only include items with categories that exist in our 7-category mapping
      const isValidCategory = Object.keys(CATEGORY_MAPPING).includes(item.category);
      if (!isValidCategory) {
        console.log(`🚫 Excluding item "${item.name}" - invalid category: "${item.category}"`);
        return false;
      }
      return true;
    });
    
    const itemsToCreate = validMenuItems.filter(item => !existingItemNames.includes(item.name));
    console.log(`🍽️ Filtered to ${validMenuItems.length}/${menuItems.length} items with valid categories`);
    console.log(`🍽️ Need to create ${itemsToCreate.length} new items`);
    
    const createdItems: any[] = [];
    
    // Process items in batches of 10 (Square API limit)
    for (let i = 0; i < itemsToCreate.length; i += 10) {
      const batch = itemsToCreate.slice(i, i + 10);
      
      const objects = batch.map((item, index) => {
        const categoryId = categoryMap[item.category];
        
        // Additional safety check - should not happen with validation above
        if (!categoryId) {
          console.error(`🚫 CRITICAL: No category mapping for "${item.category}" on item "${item.name}"`);
          return null;
        }
        
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
                  amount: createSquareMoneyFromCents(getCentsFromSquareMoney({ amount: item.price * 100, currency: 'AUD' })).amount,
                  currency: 'AUD'
                }
              }
            }]
          }
        };
      }).filter(obj => obj !== null);
      
      // Skip empty batches
      if (objects.length === 0) {
        console.log(`⚠️ Skipping empty batch ${Math.floor(i / 10) + 1}`);
        continue;
      }
      
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
    console.log('📂 Fetching ACTUAL Square categories from Bean Stalker items...');
    
    // Get the actual category mapping from items available at Bean Stalker location
    const actualCategories = await getActualSquareCategoriesFromItems();
    const categoryIds = Object.keys(actualCategories);
    
    if (categoryIds.length === 0) {
      console.log('❌ No categories found from Bean Stalker items');
      return [];
    }
    
    console.log(`📂 Found ${categoryIds.length} ACTUAL Square categories used by Bean Stalker items`);
    
    // Build the response in the expected format, using ACTUAL Square category names
    const beanStalkerCategories = categoryIds.map(categoryId => {
      const actualCategoryName = actualCategories[categoryId];
      return {
        id: categoryId,
        name: actualCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), // URL-safe slug
        displayName: actualCategoryName, // ACTUAL Square category name
        squareId: categoryId
      };
    });
    
    console.log(`📂 Retrieved ${beanStalkerCategories.length} ACTUAL Square categories:`);
    beanStalkerCategories.forEach(cat => {
      console.log(`   ✅ "${cat.displayName}" (${cat.squareId})`);
    });
    
    return beanStalkerCategories;
    
  } catch (error) {
    console.error('❌ Failed to fetch ACTUAL Square categories:', error);
    throw error;
  }
}

// NEW: Fetch items by specific category IDs (instead of all 500+ items)
export async function getSquareMenuItemsByCategories(): Promise<any> {
  try {
    console.log('🎯 Fetching menu items by SPECIFIC category IDs...');
    
    // Get categories from database
    const categories = await storage.getMenuCategories();
    console.log(`📂 Found ${categories.length} categories in database`);
    
    const seenItemIds = new Set<string>(); // Deduplication
    const normalizedItems: any[] = [];
    let totalItemsFound = 0;
    
    // Fetch items for each category with pagination
    for (const category of categories) {
      if (!category.squareCategoryId) {
        console.log(`⚠️ Skipping category "${category.displayName}" - no Square category ID`);
        continue;
      }
      
      console.log(`🔍 Fetching items for category: ${category.displayName} (${category.squareCategoryId})`);
      
      try {
        let cursor: string | undefined = undefined;
        let categoryItemCount = 0;
        
        // Paginate through all items in this category
        do {
          const searchBody: any = {
            object_types: ["ITEM"],
            query: {
              set_query: {
                attribute_name: "categories",
                attribute_values: [category.squareCategoryId]
              }
            },
            include_related_objects: true,
            limit: 100
          };
          
          if (cursor) {
            searchBody.cursor = cursor;
          }
          
          
          const response = await makeSquareRequest('/catalog/search', 'POST', searchBody);
          
          if (response.objects) {
            const categoryItems = response.objects.filter((item: any) => item.type === 'ITEM');
            
            // Normalize each Square item to expected format
            for (const rawItem of categoryItems) {
              // Skip duplicates
              if (seenItemIds.has(rawItem.id)) {
                console.log(`🔄 Skipping duplicate item: ${rawItem.item_data?.name || rawItem.id}`);
                continue;
              }
              seenItemIds.add(rawItem.id);
              
              // Extract price from variations (use first variation price)
              let price = 0;
              if (rawItem.item_data?.variations && rawItem.item_data.variations.length > 0) {
                const firstVariation = rawItem.item_data.variations[0];
                if (firstVariation.item_variation_data?.price_money) {
                  price = centsToDisplayPrice(getCentsFromSquareMoney(firstVariation.item_variation_data.price_money));
                }
              }
              
              // Normalize to expected format that sync route expects
              const normalizedItem = {
                squareId: rawItem.id,
                name: rawItem.item_data?.name || 'Unnamed Item',
                description: rawItem.item_data?.description || '',
                price: price,
                squareCategoryId: category.squareCategoryId,
                category: category.name, // For backwards compatibility
                imageUrl: null, // Will be filled by image mapping if available
                isAvailable: true,
                hasSizes: rawItem.item_data?.variations?.length > 1,
                variations: rawItem.item_data?.variations || [],
                rawSquareData: rawItem // Keep for debugging/advanced processing
              };
              
              normalizedItems.push(normalizedItem);
              categoryItemCount++;
              totalItemsFound++;
            }
          }
          
          // Get next page cursor
          cursor = response.cursor;
          
          // Small delay between pages
          if (cursor) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
        } while (cursor);
        
        console.log(`✅ Found ${categoryItemCount} items in category "${category.displayName}"`);
        
        // Small delay between categories
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Failed to fetch items for category "${category.displayName}":`, error);
      }
    }
    
    console.log(`🎯 Total unique items found across all categories: ${totalItemsFound}`);
    return normalizedItems;
    
  } catch (error) {
    console.error('❌ Failed to fetch menu items by categories:', error);
    return [];
  }
}

export async function getSquareMenuItems(): Promise<any> {
  try {
    console.log('🍽️ Fetching menu items from Square catalog...');
    
    // Get Bean Stalker location ID for validation
    const locationId = getSquareLocationId();
    console.log(`🏪 Bean Stalker location ID: ${locationId}`);
    
    // Use paginated search to get ALL items with proper category associations
    // Note: Square catalog API doesn't filter items by location - we need to filter by availability
    console.log('🔧 Using paginated search-catalog-items to get ALL items...');
    const { items, relatedObjects } = await getAllSquareMenuItemsWithPagination();
    
    // Enhanced debugging of paginated response structure
    console.log('🔧 DEBUG: Paginated Square API Response Structure:');
    console.log('  - Total items count:', items.length);
    console.log('  - Total related objects count:', relatedObjects.length);
    
    // Debug related objects breakdown
    const relatedObjectsByType = relatedObjects.reduce((acc: any, obj: any) => {
      acc[obj.type] = (acc[obj.type] || 0) + 1;
      return acc;
    }, {});
    console.log('🔧 DEBUG: Related objects by type:', relatedObjectsByType);
    
    // Sample the first few related objects for debugging
    if (relatedObjects.length > 0) {
      console.log('🔧 DEBUG: Sample related objects (first 3):');
      relatedObjects.slice(0, 3).forEach((obj: any, index: number) => {
        console.log(`  ${index + 1}. Type: ${obj.type}, ID: ${obj.id}, Has data: ${!!obj[`${obj.type.toLowerCase()}_data`]}`);
      });
    }
    
    // Create lookup maps for categories and variations
    const categoryMap: { [id: string]: any } = {};
    const variationMap: { [id: string]: any } = {};
    
    relatedObjects.forEach((obj: any) => {
      if (obj.type === 'CATEGORY') {
        categoryMap[obj.id] = obj;
        console.log(`🔧 DEBUG: Added category to map - ID: ${obj.id}, Name: ${obj.category_data?.name}`);
      } else if (obj.type === 'ITEM_VARIATION') {
        variationMap[obj.id] = obj;
      }
    });
    
    console.log(`🔧 DEBUG: CategoryMap built with ${Object.keys(categoryMap).length} categories`);
    console.log(`🔧 DEBUG: VariationMap built with ${Object.keys(variationMap).length} variations`);
    
    // Sample the first few items to see their structure
    if (items.length > 0) {
      console.log('🔧 DEBUG: Sample items structure (first 3):');
      items.slice(0, 3).forEach((item: any, index: number) => {
        const itemData = item.item_data;
        console.log(`  ${index + 1}. Item "${itemData?.name}":`, {
          id: item.id,
          category_id: itemData?.category_id || 'MISSING',
          has_variations: !!(itemData?.variations?.length),
          description: itemData?.description?.substring(0, 50) || 'no description'
        });
      });
    }
    
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
    
    // Apply lenient filtering to allow uncategorized items
    const filteredItems = locationFilteredItems.filter((item: any) => {
      const itemData = item.item_data;
      const categoryId = itemData?.category_id;
      
      if (!categoryId) {
        // Skip items without Square category ID - they're not from our whitelisted categories
        console.log(`🚫 Excluding uncategorized item: "${itemData?.name}" (no Square category ID)`);
        return false; // Only include items with proper Square category IDs
      }
      
      // Verify item belongs to one of our Bean Stalker categories
      if (beanStalkerCategoryIds.has(categoryId)) {
        console.log(`✅ Including categorized Bean Stalker item: "${itemData?.name}" (category: ${categoryId})`);
        return true; // Valid Bean Stalker item
      } else {
        console.log(`📝 Including item with unknown category (will use default): "${itemData?.name}" (category: ${categoryId})`);
        return true; // Include items with unknown categories, will assign default
      }
    });
    
    console.log(`🍽️ Final filtered result: ${filteredItems.length} items for Bean Stalker location`);
    
    // Convert Square items to Bean Stalker format using async map
    const beanStalkerItemPromises = filteredItems.map(async (item: any) => {
      const itemData = item.item_data;
      const category = categoryMap[itemData?.category_id];
      
      // Get the first variation for pricing - try multiple approaches
      let price = 0;
      
      // Approach 1: Try to get from variations in item data
      const firstVariationId = itemData?.variations?.[0]?.id;
      const variation = variationMap[firstVariationId];
      if (variation?.item_variation_data?.price_money?.amount) {
        price = centsToDisplayPrice(getCentsFromSquareMoney(variation.item_variation_data.price_money));
      }
      
      // Approach 2: Check if variation data is embedded directly in item
      else if (itemData?.variations?.[0]?.item_variation_data?.price_money?.amount) {
        price = centsToDisplayPrice(getCentsFromSquareMoney(itemData.variations[0].item_variation_data.price_money));
      }
      
      // Approach 3: Check related objects for ITEM_VARIATION type with matching item ID
      else {
        const relatedVariation = relatedObjects.find((obj: any) => 
          obj.type === 'ITEM_VARIATION' && 
          obj.item_variation_data?.item_id === item.id
        );
        if (relatedVariation?.item_variation_data?.price_money?.amount) {
          price = centsToDisplayPrice(getCentsFromSquareMoney(relatedVariation.item_variation_data.price_money));
        }
      }
      
      // Debug logging for price extraction
      if (price === 0) {
        console.log(`⚠️  Price extraction failed for "${itemData?.name}": no valid price found`);
        console.log(`   - Variation ID: ${firstVariationId}`);
        console.log(`   - Has variation in map: ${!!variation}`);
        console.log(`   - Related variations: ${relatedObjects.filter((obj: any) => obj.type === 'ITEM_VARIATION').length}`);
      }
      
      // Use proper Square category mapping from database - no more generic inference
      let categoryKey = 'food'; // fallback only
      let categoryDisplayName = 'Unknown';
      let squareCategoryId = itemData?.category_id;
      
      // This should not happen since we already filtered for items WITH category IDs
      if (!squareCategoryId) {
        console.log(`🚫 Skipping item "${itemData?.name}" - missing Square category ID`);
        return null;
      }
      
      // Look up proper category from database instead of generic mapping
      try {
        const categoryRecord = await storage.getCategoryBySquareId(squareCategoryId);
        if (categoryRecord) {
          categoryKey = categoryRecord.name;
          categoryDisplayName = categoryRecord.displayName || categoryRecord.name;
          console.log(`🔗 Mapped item "${itemData?.name}" to category "${categoryKey}"`);
        } else {
          console.log(`🚫 Skipping item "${itemData?.name}" - Square category "${squareCategoryId}" not in whitelist`);
          return null; // Skip items from non-whitelisted categories
        }
      } catch (error) {
        console.error(`❌ Error looking up category for item "${itemData?.name}":`, error);
        return null;
      }
      
      return {
        id: item.id,
        name: itemData?.name || 'Unknown Item',
        description: itemData?.description || '',
        price: price,
        category: categoryKey,
        categoryDisplayName: categoryDisplayName,
        squareId: item.id,
        squareCategoryId: squareCategoryId,
        image: null, // Square images would need separate API call
        isAvailable: true
      };
    });
    
    // Wait for all async operations to complete
    const beanStalkerItems = await Promise.all(beanStalkerItemPromises);
    
    // Filter out null items (items that were skipped due to invalid categories)
    const validItems = beanStalkerItems.filter(item => item !== null);
    
    console.log(`🍽️ Retrieved ${validItems.length} menu items from Square (${beanStalkerItems.length - validItems.length} skipped due to invalid categories)`);
    return validItems;
    
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
    
    // Apply strict Bean Stalker location filtering using inventory API
    const locationFilteredItems = await filterItemsByLocationAvailability(items, locationId);
    
    console.log(`🏪 Location filtering: ${locationFilteredItems.length}/${items.length} items filtered for Bean Stalker`);
    console.log(`🔍 Retrieved ${locationFilteredItems.length} items for category ${categoryId}`);
    
    // Convert Square items to Bean Stalker format with async image fetching
    const beanStalkerItems = await Promise.all(locationFilteredItems.map(async (item: any) => {
      const itemData = item.item_data;
      
      // Extract ALL variations data, not just the first one
      const variations = (itemData?.variations || []).map((variation: any, index: number) => {
        const variationData = variation.item_variation_data;
        const price = centsToDisplayPrice(getCentsFromSquareMoney(variationData?.price_money));
        
        return {
          id: variation.id,
          name: variationData?.name || `Option ${index + 1}`,
          price: price,
          squarePrice: variationData?.price_money?.amount || 0,
          isDefault: index === 0
        };
      });
      
      // Get price from first variation (for backwards compatibility)
      const price = variations.length > 0 ? variations[0].price : 0;
      
      // Use the requested category name directly - NO NAME-BASED INFERENCE  
      const categoryKey = requestedCategoryName || 'unknown';
      
      // Debug logging to track category mapping issue
      if (itemData?.name && (itemData.name.includes('Beans') || Math.random() < 0.1)) {
        console.log(`🔍 DEBUG: Item "${itemData.name}" - requestedCategoryName: "${requestedCategoryName}", final category: "${categoryKey}", categoryId: "${categoryId}"`);
      }
      
      // Debug variations to see if they're being created
      if (variations.length > 0) {
        console.log(`🔍 VARIATIONS DEBUG: "${itemData?.name}" has ${variations.length} variations:`, variations.map(v => `${v.name}($${v.price})`).join(', '));
      }
      
      // Check if item has variations (multiple options/sizes)
      const hasVariations = variations.length > 1;
      
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
      
      // Create item with Square data
      const itemObj = {
        id: parseInt(item.id.slice(-8), 16), // Generate numeric ID from Square ID
        name: itemData?.name || 'Unnamed Item',
        description: itemData?.description || '',
        price: price,
        category: categoryKey,
        categoryDisplayName: CATEGORY_MAPPING[categoryKey as keyof typeof CATEGORY_MAPPING] || categoryKey,
        squareId: item.id,
        squareCategoryId: categoryId,
        imageUrl: imageUrl, // Square image URL or null
        squareImageUrl: squareImageUrl, // Separate field for Square images
        isAvailable: true,
        hasOptions: Boolean(item.item_data?.modifier_list_info?.length || item.item_data?.variations?.some((v: any) => v.item_variation_data?.modifier_list_info?.length)), // Detect Square modifiers synchronously
        hasSizes: hasVariations, // True when Square has multiple size variations
        variations: variations // NEW: Include all Square variation data
      };

      // Override with local database image if available
      try {
        const dbItem = await storage.getMenuItemBySquareId(item.id);
        if (dbItem?.imageUrl) {
          itemObj.imageUrl = dbItem.imageUrl; // Prioritize local image
          console.log(`🖼️  Using local image for "${itemObj.name}": ${dbItem.imageUrl}`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to check local image for "${itemObj.name}":`, error);
        // Continue with Square image - don't break the sync
      }

      return itemObj;
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
    
    // Convert Square items to Bean Stalker format using async map
    const beanStalkerItemPromises = items.map(async (item: any) => {
      const itemData = item.item_data;
      const variationIds = itemData?.variations?.map((v: any) => v.id) || [];
      const variationObjects = variationIds.map(id => variationMap[id]).filter(Boolean);
      
      // Extract ALL variations data, not just the first one
      const variations = variationObjects.map((variation: any, index: number) => {
        const variationData = variation.item_variation_data;
        const price = centsToDisplayPrice(getCentsFromSquareMoney(variationData?.price_money));
        
        return {
          id: variation.id,
          name: variationData?.name || `Option ${index + 1}`,
          price: price,
          squarePrice: variationData?.price_money?.amount || 0,
          isDefault: index === 0
        };
      });
      
      // Get price from first variation (for backwards compatibility)
      const price = variations.length > 0 ? variations[0].price : 0;
      
      // Use proper Square category mapping instead of generic inference
      let categoryKey = 'food'; // fallback only
      let squareCategoryId = itemData?.category_id;
      
      // Since this function is called with whitelisted category IDs, items should have valid category IDs
      if (squareCategoryId) {
        try {
          const categoryRecord = await storage.getCategoryBySquareId(squareCategoryId);
          if (categoryRecord) {
            categoryKey = categoryRecord.name;
            console.log(`🔗 Item "${itemData?.name}" mapped to category "${categoryKey}"`);
          } else {
            console.log(`⚠️  Item "${itemData?.name}" has unknown category "${squareCategoryId}", using fallback`);
          }
        } catch (error) {
          console.error(`❌ Error mapping category for item "${itemData?.name}":`, error);
        }
      } else {
        console.log(`⚠️  Item "${itemData?.name}" missing category ID, using fallback category`);
      }
      
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
        category: categoryKey,
        categoryDisplayName: CATEGORY_MAPPING[categoryKey as keyof typeof CATEGORY_MAPPING] || categoryKey,
        squareId: item.id,
        squareCategoryId: squareCategoryId,
        imageUrl: imageUrl, // Square image URL or null
        isAvailable: true,
        hasOptions: Boolean(item.item_data?.modifier_list_info?.length || item.item_data?.variations?.some((v: any) => v.item_variation_data?.modifier_list_info?.length)), // Detect Square modifiers synchronously
        hasSizes: hasVariations, // True when Square has multiple size variations
        variations: variations // NEW: Include all Square variation data
      };
    });
    
    // Wait for all async category lookups to complete
    const beanStalkerItems = await Promise.all(beanStalkerItemPromises);
    
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
    console.log(`🔧 DATABASE-FIRST: Fetching variations for Square item: ${squareItemId}`);
    
    // DATABASE-FIRST: Verify this is a Bean Stalker item before processing variations
    const beanStalkerItem = await storage.getMenuItemBySquareId(squareItemId);
    if (!beanStalkerItem) {
      console.log(`🚫 Skipping variations for non-Bean Stalker item: ${squareItemId}`);
      return [];
    }
    
    // Use the correct Square API endpoint to get item with variations
    // Include related objects to get parent item if this is a variation ID
    const response = await makeSquareRequest(`/catalog/object/${squareItemId}?include_related_objects=true`, 'GET');
    
    if (!response.object) {
      console.log(`⚠️  No item found with ID: ${squareItemId}`);
      return [];
    }
    
    const item = response.object;
    const itemData = item.item_data;
    const variations = itemData?.variations || [];
    
    console.log(`🔧 Found ${variations.length} variations for Bean Stalker item "${itemData?.name}"`);
    
    // If no variations found in Square, return empty array (no fake options)
    if (variations.length === 0) {
      console.log(`🔧 No variations found for Bean Stalker item "${itemData?.name}" in Square`);
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

/**
 * Detect if a Square item has modifiers (customization options like flavors, add-ons)
 * This is different from variations (size options)
 */
async function detectSquareModifiers(item: any): Promise<boolean> {
  try {
    // Check item-level modifier lists
    const itemModifierLists = item.item_data?.modifier_list_info?.length || 0;
    
    // Check variation-level modifier lists
    let variationModifierLists = 0;
    if (item.item_data?.variations) {
      for (const variation of item.item_data.variations) {
        if (variation.item_variation_data?.modifier_list_info) {
          variationModifierLists += variation.item_variation_data.modifier_list_info.length;
        }
      }
    }
    
    const totalModifierLists = itemModifierLists + variationModifierLists;
    
    if (totalModifierLists > 0) {
      console.log(`🔧 Item ${item.id} (${item.item_data?.name}) has ${totalModifierLists} modifier lists (${itemModifierLists} item-level, ${variationModifierLists} variation-level)`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error detecting Square modifiers for ${item.id}:`, error);
    return false;
  }
}

/**
 * Sync Square modifiers (customization options) for all menu items
 * This retrieves modifier lists and their options from Square and stores them in our database
 */
async function syncSquareModifiers(): Promise<{ listsCreated: number; modifiersCreated: number; errors: string[] }> {
  const result = {
    listsCreated: 0,
    modifiersCreated: 0,
    errors: [] as string[]
  };

  try {
    console.log(`🔧 Starting Square modifier sync DATABASE-FIRST (extracting from Bean Stalker items only)...`);
    
    // Clear existing modifiers for clean sync
    await storage.clearSquareModifiers();
    console.log(`🧹 Cleared existing modifier data`);
    
    // DATABASE-FIRST: Get Bean Stalker Square IDs from database
    const allowedSquareIds = await getBeanStalkerSquareIds();
    
    if (allowedSquareIds.size === 0) {
      console.log('⚠️  No Bean Stalker items in database, skipping modifier sync');
      return result;
    }

    // Batch retrieve ONLY Bean Stalker items from Square
    const itemIds = Array.from(allowedSquareIds);
    const allItems: any[] = [];
    const chunkSize = 100;
    
    for (let i = 0; i < itemIds.length; i += chunkSize) {
      const chunk = itemIds.slice(i, i + chunkSize);
      console.log(`🔄 Batch retrieving ${chunk.length} Bean Stalker items (${i + 1}-${Math.min(i + chunkSize, itemIds.length)} of ${itemIds.length})`);
      
      try {
        const batchResponse = await makeSquareRequest('/catalog/batch-retrieve', 'POST', {
          object_ids: chunk,
          include_related_objects: true
        });
        
        if (batchResponse.objects) {
          allItems.push(...batchResponse.objects);
        }
        
        // Rate limit protection
        if (i + chunkSize < itemIds.length) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      } catch (error) {
        console.error(`❌ Failed to batch retrieve Bean Stalker items ${i + 1}-${Math.min(i + chunkSize, itemIds.length)}:`, error);
        result.errors.push(`Failed to batch retrieve items: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`🔧 Retrieved ${allItems.length} Bean Stalker items from Square, extracting modifier data...`);

    if (allItems.length === 0) {
      console.log(`⚠️  No Bean Stalker items found in Square catalog`);
      return result;
    }

    // Extract modifier data from Bean Stalker items that have modifier_list_info
    const modifierListsMap = new Map<string, any>();
    
    for (const item of allItems) {
      const itemData = item.item_data;
      if (!itemData) continue;
      
      // Check item-level modifier lists
      if (itemData.modifier_list_info) {
        for (const modifierListInfo of itemData.modifier_list_info) {
          const modifierListId = modifierListInfo.modifier_list_id;
          if (!modifierListsMap.has(modifierListId)) {
            modifierListsMap.set(modifierListId, modifierListInfo);
            console.log(`🔧 Found modifier list "${modifierListInfo.name || modifierListId}" on item "${itemData.name}"`);
          }
        }
      }
      
      // Check variation-level modifier lists
      if (itemData.variations) {
        for (const variation of itemData.variations) {
          const variationData = variation.item_variation_data;
          if (variationData?.modifier_list_info) {
            for (const modifierListInfo of variationData.modifier_list_info) {
              const modifierListId = modifierListInfo.modifier_list_id;
              if (!modifierListsMap.has(modifierListId)) {
                modifierListsMap.set(modifierListId, modifierListInfo);
                console.log(`🔧 Found modifier list "${modifierListInfo.name || modifierListId}" on variation of "${itemData.name}"`);
              }
            }
          }
        }
      }
    }

    console.log(`🔧 Extracted ${modifierListsMap.size} unique modifier lists from item data`);

    // Process each extracted modifier list
    for (const [modifierListId, modifierListInfo] of modifierListsMap) {
      const listResult = await syncModifierListFromInfo(modifierListId, modifierListInfo);
      result.listsCreated += listResult.listsCreated;
      result.modifiersCreated += listResult.modifiersCreated;
      result.errors.push(...listResult.errors);
    }
    
    console.log(`✅ Square modifier sync completed: ${result.listsCreated} lists, ${result.modifiersCreated} modifiers`);
    return result;
    
  } catch (error) {
    const errorMsg = `Square modifier sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`❌ ${errorMsg}`);
    result.errors.push(errorMsg);
    return result;
  }
}

/**
 * Sync a single modifier list from extracted modifier_list_info
 */
async function syncModifierListFromInfo(modifierListId: string, modifierListInfo: any): Promise<{ listsCreated: number; modifiersCreated: number; errors: string[] }> {
  const result = {
    listsCreated: 0,
    modifiersCreated: 0,
    errors: [] as string[]
  };

  try {
    console.log(`🔧 Processing modifier list: "${modifierListInfo.name || modifierListId}" (${modifierListId})`);

    // Create the modifier list using storage interface
    const modifierListData = {
      squareId: modifierListId,
      name: modifierListInfo.name || 'Unnamed List',
      selectionType: modifierListInfo.selection_type || 'SINGLE',
      minSelections: modifierListInfo.min_selected_modifiers || 0,
      maxSelections: modifierListInfo.max_selected_modifiers || null,
      enabled: !modifierListInfo.is_deleted,
      displayOrder: modifierListInfo.ordinal || 999
    };
    
    const createdList = await storage.createSquareModifierList(modifierListData);
    result.listsCreated = 1;
    console.log(`✅ Created modifier list: "${modifierListInfo.name || modifierListId}" (${modifierListId})`);
    
    // Process individual modifiers in this list
    const modifiers = modifierListInfo.modifiers || [];
    console.log(`🔧 Processing ${modifiers.length} modifiers for list "${modifierListInfo.name || modifierListId}"`);
    
    for (const modifier of modifiers) {
      const modifierData = modifier.modifier_data;
      if (!modifierData) {
        result.errors.push(`No modifier_data found for modifier ${modifier.id}`);
        continue;
      }

      const modifierInfo = {
        squareId: modifier.id,
        modifierListId: createdList.id, // ✅ Integer database ID from created list
        squareModifierListId: modifierListId, // ✅ Square string ID for reference
        name: modifierData.name || 'Unnamed Modifier',
        priceMoney: modifierData.price_money?.amount || 0,
        enabled: !modifier.is_deleted,
        displayOrder: modifierData.ordinal || 999
      };

      console.log(`🔧 Creating modifier with listId=${createdList.id} (int), squareListId=${modifierListId} (str), modifierSquareId=${modifier.id}`);
      await storage.upsertSquareModifier(modifierInfo);
      result.modifiersCreated++;
      console.log(`✅ Created modifier: "${modifierData.name}" (+$${((modifierInfo.priceMoney || 0) / 100).toFixed(2)})`);
    }

    return result;

  } catch (error) {
    const errorMsg = `Failed to sync modifier list ${modifierListId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`❌ ${errorMsg}`);
    result.errors.push(errorMsg);
    return result;
  }
}

/**
 * Sync a single modifier list and its modifiers (legacy function for standalone modifier lists)
 */
async function syncModifierList(modifierList: any): Promise<{ listsCreated: number; modifiersCreated: number; errors: string[] }> {
  const result = {
    listsCreated: 0,
    modifiersCreated: 0,
    errors: [] as string[]
  };

  try {
    const listData = modifierList.modifier_list_data;
    if (!listData) {
      result.errors.push(`No modifier_list_data found for list ${modifierList.id}`);
      return result;
    }

    console.log(`🔧 Processing modifier list: "${listData.name}" (${modifierList.id})`);

    // Create the modifier list using storage interface
    const modifierListData = {
      squareId: modifierList.id,
      name: listData.name || 'Unnamed List',
      selectionType: listData.selection_type || 'SINGLE',
      minSelections: listData.min_selected_modifiers || 0,
      maxSelections: listData.max_selected_modifiers || null,
      enabled: !modifierList.is_deleted,
      displayOrder: listData.ordinal || 999
    };
    
    const createdList = await storage.createSquareModifierList(modifierListData);
    result.listsCreated = 1;
    console.log(`✅ Created modifier list: "${listData.name}" (${modifierList.id})`);
    
    // Process individual modifiers in this list
    const modifiers = listData.modifiers || [];
    console.log(`🔧 Processing ${modifiers.length} modifiers for list "${listData.name}"`);
    
    for (const modifier of modifiers) {
      const modifierResult = await syncModifier(modifier, createdList.id, modifierList.id);
      result.modifiersCreated += modifierResult.created;
      if (modifierResult.error) {
        result.errors.push(modifierResult.error);
      }
    }
    
    return result;

  } catch (error) {
    const errorMsg = `Failed to sync modifier list ${modifierList.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`❌ ${errorMsg}`);
    result.errors.push(errorMsg);
    return result;
  }
}

/**
 * Sync a single modifier option
 */
async function syncModifier(modifier: any, modifierListId: number, squareModifierListId: string): Promise<{ created: number; error?: string }> {
  try {
    const modifierData = modifier.modifier_data;
    if (!modifierData) {
      return { created: 0, error: `No modifier_data found for modifier ${modifier.id}` };
    }

    const priceMoney = modifierData.price_money?.amount || 0;
    
    console.log(`🔧 Syncing modifier: "${modifierData.name}" (${modifier.id}) - $${priceMoney / 100}`);

    // Create the modifier using storage interface
    const modifierInsertData = {
      squareId: modifier.id,
      modifierListId,
      squareModifierListId,
      name: modifierData.name || 'Unnamed Modifier',
      priceMoney,
      enabled: !modifier.is_deleted,
      displayOrder: modifierData.ordinal || 999
    };
    
    await storage.upsertSquareModifier({ squareId: modifier.id, ...modifierInsertData });
    return { created: 1 };

  } catch (error) {
    const errorMsg = `Failed to sync modifier ${modifier.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`❌ ${errorMsg}`);
    return { created: 0, error: errorMsg };
  }
}

/**
 * Link modifier lists to menu items based on Square's modifier_list_info
 * Only processes items that are already in our Bean Stalker database
 */
async function linkModifiersToMenuItems() {
  const result = {
    linksCreated: 0,
    errors: [] as string[]
  };

  try {
    console.log(`🔧 Linking modifiers to menu items...`);
    
    // Get all Bean Stalker menu items from our database (these are already location-filtered)
    const dbMenuItems = await storage.getMenuItems();
    console.log(`🔍 Found ${dbMenuItems.length} Bean Stalker menu items to check for modifiers`);
    
    if (dbMenuItems.length === 0) {
      console.log(`⚠️  No menu items in database to link modifiers to`);
      return result;
    }

    // Get all our modifier lists for faster lookup
    const allModifierLists = await storage.getSquareModifierLists();
    const modifierListLookup = new Map(allModifierLists.map(list => [list.squareId, list.id]));
    console.log(`📋 Found ${allModifierLists.length} modifier lists in database`);
    
    // Process each Bean Stalker item to get its modifier associations
    for (const dbItem of dbMenuItems) {
      if (!dbItem.squareId) continue;
      
      try {
        // Get modifier associations for this specific Bean Stalker item
        const associations = await getSquareItemModifierAssociations(dbItem.squareId);
        
        if (!associations.success) {
          console.log(`⚠️  Failed to get modifier associations for "${dbItem.name}": ${associations.error}`);
          continue;
        }
        
        if (associations.modifierListIds.length === 0) {
          continue; // No modifiers for this item
        }

        console.log(`🔧 Item "${dbItem.name}" has ${associations.modifierListIds.length} modifier lists`);
        
        for (const modifierListId of associations.modifierListIds) {
          const dbListId = modifierListLookup.get(modifierListId);
          
          if (!dbListId) {
            console.log(`⚠️  Modifier list ${modifierListId} not found in database for item ${dbItem.name}`);
            continue;
          }
          
          try {
            // DATABASE-FIRST GUARD: Ensure we only link to Bean Stalker items that exist
            if (!dbItem.squareId || !modifierListId) {
              console.log(`⚠️  Skipping link: missing Square IDs for "${dbItem.name}"`);
              continue;
            }
            
            // Additional guard: Verify Bean Stalker item still exists in database
            const verifyItem = await storage.getMenuItemBySquareId(dbItem.squareId);
            if (!verifyItem) {
              console.log(`🚫 Skipping link for deleted Bean Stalker item: ${dbItem.squareId}`);
              continue;
            }
            
            // Create the link using storage interface (Square IDs only for Bean Stalker items)
            await storage.createMenuItemModifierList({
              squareItemId: dbItem.squareId,
              squareModifierListId: modifierListId,
              enabled: true // Default to enabled
            });
            
            result.linksCreated++;
            console.log(`  ✅ Linked modifier list to Bean Stalker item "${dbItem.name}"`);
          } catch (error) {
            const errorMsg = `Failed to link modifier list ${modifierListId} to item ${dbItem.squareId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.log(`  ⚠️  ${errorMsg}`);
            result.errors.push(errorMsg);
          }
        }
      } catch (itemError) {
        const errorMsg = `Failed to process modifier associations for item ${dbItem.name}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`;
        console.log(`⚠️  ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }
    
    console.log(`✅ Linked ${result.linksCreated} modifier lists to menu items`);
    return result;
    
  } catch (error) {
    const errorMsg = `Failed to link modifiers to menu items: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`❌ ${errorMsg}`);
    result.errors.push(errorMsg);
    return result;
  }
}

/**
 * Read-only approach: collect modifier list IDs from items and batch retrieve them from Square
 */
export async function readSquareModifiersFromItems(preAggregatedItems?: any[]) {
  const result = {
    listsCreated: 0,
    modifiersCreated: 0,
    linksCreated: 0,
    errors: [] as string[]
  };

  try {
    console.log(`🧩 readSquareModifiersFromItems DATABASE-FIRST v5 starting`);
    
    // Clear existing modifiers and bad data for clean sync
    await storage.clearSquareModifiers();
    console.log(`🧹 Cleared existing modifier data`);
    
    // Clean bad modifier links from previous syncs
    const cleanupResult = await cleanBadModifierLinks();
    console.log(`🧹 Cleaned up ${cleanupResult.removed} bad modifier links, ${cleanupResult.errors.length} errors`);
    
    // DATABASE-FIRST: Get Bean Stalker Square IDs from database
    const allowedSquareIds = await getBeanStalkerSquareIds();
    
    if (allowedSquareIds.size === 0) {
      console.log('⚠️  No Bean Stalker items in database, skipping modifier sync');
      return result;
    }

    console.log(`🗄️  Processing modifiers for ${allowedSquareIds.size} Bean Stalker items only (DATABASE-FIRST)`);

    // Convert Set to Array for batch retrieval
    const itemIds = Array.from(allowedSquareIds);

    // Collect all unique modifier list IDs and create item-to-list mappings
    const modifierListIds = new Set<string>();
    const itemModifierMappings: Array<{ itemId: string; modifierListId: string; modifierListInfo: any }> = [];
    let invalidIdCount = 0;
    let itemsWithModifiers = 0;

    // Batch retrieve full ITEM objects (chunks of 100)
    const fullItems: any[] = [];
    const chunkSize = 100;
    
    for (let i = 0; i < itemIds.length; i += chunkSize) {
      const chunk = itemIds.slice(i, i + chunkSize);
      console.log(`🔄 Batch retrieving ${chunk.length} full items (${i + 1}-${Math.min(i + chunkSize, itemIds.length)} of ${itemIds.length})`);
      
      try {
        const batchResponse = await makeSquareRequest('/catalog/batch-retrieve', 'POST', {
          object_ids: chunk
        });
        
        if (batchResponse.objects) {
          fullItems.push(...batchResponse.objects);
          console.log(`✅ Retrieved ${batchResponse.objects.length} full item objects`);
        }
        
        // Rate limit protection
        if (i + chunkSize < itemIds.length) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      } catch (error) {
        console.error(`❌ Failed to batch retrieve items ${i + 1}-${Math.min(i + chunkSize, itemIds.length)}:`, error);
        result.errors.push(`Failed to batch retrieve items: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`📊 Retrieved ${fullItems.length} full item objects for modifier analysis`);

    for (const item of fullItems) {
      const itemData = item.item_data;
      if (!itemData) continue;
      
      // Check item-level modifier lists
      if (itemData.modifier_list_info) {
        itemsWithModifiers++;
        for (const modifierListInfo of itemData.modifier_list_info) {
          const modifierListId = modifierListInfo.modifier_list_id;
          
          // ID validation - allow any valid Square IDs (exclude temp/invalid IDs starting with #)
          if (typeof modifierListId === 'string' && 
              modifierListId.length > 0 && 
              !modifierListId.startsWith('#')) {
            
            modifierListIds.add(modifierListId);
            itemModifierMappings.push({
              itemId: item.id,
              modifierListId,
              modifierListInfo
            });
            console.log(`🔧 Item "${itemData.name}" (${item.id}) has modifier list: ${modifierListInfo.name || modifierListId}`);
          } else {
            invalidIdCount++;
            console.log(`⚠️  Invalid modifier list ID "${modifierListId}" on item "${itemData.name}" - skipping`);
          }
        }
      }
      
      // Check variation-level modifier lists
      if (itemData.variations) {
        for (const variation of itemData.variations) {
          const variationData = variation.item_variation_data;
          
          if (variationData?.modifier_list_info) {
            for (const modifierListInfo of variationData.modifier_list_info) {
              const modifierListId = modifierListInfo.modifier_list_id;
              
              // ID validation - allow any valid Square IDs (exclude temp/invalid IDs starting with #)
              if (typeof modifierListId === 'string' && 
                  modifierListId.length > 0 && 
                  !modifierListId.startsWith('#')) {
                
                modifierListIds.add(modifierListId);
                itemModifierMappings.push({
                  itemId: item.id,
                  modifierListId,
                  modifierListInfo
                });
                console.log(`🔧 Item "${itemData.name}" variation has modifier list: ${modifierListInfo.name || modifierListId}`);
              } else {
                invalidIdCount++;
                console.log(`⚠️  Invalid modifier list ID "${modifierListId}" on variation of "${itemData.name}" - skipping`);
              }
            }
          }
        }
      }
    }

    const uniqueModifierListIds = Array.from(modifierListIds);
    console.log(`🔧 Collected ${uniqueModifierListIds.length} unique modifier list IDs (${invalidIdCount} invalid IDs filtered out)`);
    
    // Log sample of collected IDs for debugging
    if (uniqueModifierListIds.length > 0) {
      const sampleIds = uniqueModifierListIds.slice(0, 10);
      console.log(`🔧 Sample modifier list IDs: ${sampleIds.join(', ')}`);
    }

    // Guard against empty ID sets to prevent 404 errors
    if (uniqueModifierListIds.length === 0) {
      console.log(`⚠️  No valid modifier lists found in any items, skipping batch retrieve`);
      return result;
    }

    // Batch retrieve modifier lists in chunks to avoid request size limits
    const CHUNK_SIZE = 50;
    const allRetrievedObjects: any[] = [];
    const allRelatedObjects: any[] = [];
    
    for (let i = 0; i < uniqueModifierListIds.length; i += CHUNK_SIZE) {
      const chunk = uniqueModifierListIds.slice(i, i + CHUNK_SIZE);
      console.log(`🔍 Batch retrieving chunk ${Math.floor(i/CHUNK_SIZE) + 1}: ${chunk.length} modifier lists (${chunk[0]}...)`);
      
      try {
        const batchResponse = await makeSquareRequest('/catalog/batch-retrieve', 'POST', {
          object_ids: chunk,
          include_related_objects: true
        });

        if (batchResponse.objects) {
          allRetrievedObjects.push(...batchResponse.objects);
        }
        if (batchResponse.related_objects) {
          allRelatedObjects.push(...batchResponse.related_objects);
        }
      } catch (error) {
        console.error(`❌ Failed to retrieve chunk starting with ${chunk[0]}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Try individual IDs in this chunk to isolate bad ones
        for (const id of chunk) {
          try {
            const singleResponse = await makeSquareRequest('/catalog/batch-retrieve', 'POST', {
              object_ids: [id],
              include_related_objects: true
            });
            
            if (singleResponse.objects) {
              allRetrievedObjects.push(...singleResponse.objects);
            }
            if (singleResponse.related_objects) {
              allRelatedObjects.push(...singleResponse.related_objects);
            }
          } catch (singleError) {
            console.error(`❌ Bad modifier list ID: ${id} - ${singleError instanceof Error ? singleError.message : 'Unknown error'}`);
            result.errors.push(`Invalid modifier list ID: ${id}`);
          }
        }
      }
    }

    if (allRetrievedObjects.length === 0) {
      console.log(`⚠️  No modifier lists returned from Square batch retrieve`);
      return result;
    }

    console.log(`📦 Retrieved ${allRetrievedObjects.length} objects and ${allRelatedObjects.length} related objects`);
    
    const retrievedObjects = allRetrievedObjects;
    const relatedObjects = allRelatedObjects;
    
    console.log(`📦 Retrieved ${retrievedObjects.length} objects and ${relatedObjects.length} related objects`);

    // Process modifier lists
    const modifierLists = retrievedObjects.filter(obj => obj.type === 'MODIFIER_LIST');
    const modifiers = [...retrievedObjects.filter(obj => obj.type === 'MODIFIER'), ...relatedObjects.filter(obj => obj.type === 'MODIFIER')];
    
    console.log(`🔧 Processing ${modifierLists.length} modifier lists and ${modifiers.length} modifiers`);
    
    // CRITICAL FIX: Extract individual modifiers directly from modifier list data structure
    // Individual modifiers are embedded in modifier_list_data.modifiers, not in related_objects
    console.log(`🔧 Extracting individual modifiers from ${modifierLists.length} modifier lists...`);
    
    const extractedModifiers: any[] = [];
    
    for (const modifierList of modifierLists) {
      const listData = modifierList.modifier_list_data;
      if (!listData || !listData.modifiers) {
        console.log(`⚠️  Modifier list "${listData?.name || modifierList.id}" has no modifiers array`);
        continue;
      }
      
      const listModifiers = listData.modifiers || [];
      console.log(`📋 Extracting ${listModifiers.length} modifiers from "${listData.name}" (${modifierList.id})`);
      
      for (const modifierRef of listModifiers) {
        // Each modifier reference contains the full modifier data
        if (modifierRef.type === 'MODIFIER') {
          // Add parent list ID to modifier data for storage
          if (modifierRef.modifier_data) {
            modifierRef.modifier_data.modifier_list_id = modifierList.id;
          }
          extractedModifiers.push(modifierRef);
          
          console.log(`  📌 "${modifierRef.modifier_data?.name}" - $${(modifierRef.modifier_data?.price_money?.amount || 0) / 100}`);
        }
      }
    }
    
    console.log(`✅ Extracted ${extractedModifiers.length} individual modifiers from modifier lists`);
    
    // Add extracted modifiers to our list
    modifiers.push(...extractedModifiers);

    // Store modifier lists
    for (const modifierList of modifierLists) {
      try {
        const listData = modifierList.modifier_list_data;
        if (!listData) continue;

        await storage.createSquareModifierList({
          squareId: modifierList.id,
          name: listData.name || 'Unnamed List',
          selectionType: listData.selection_type || 'SINGLE',
          minSelections: listData.min_selected_modifiers || 0,
          maxSelections: listData.max_selected_modifiers || null,
          enabled: !modifierList.is_deleted,
          displayOrder: listData.ordinal || 0
        });
        
        result.listsCreated++;
        console.log(`✅ Stored modifier list: "${listData.name}" (${modifierList.id})`);
      } catch (error) {
        result.errors.push(`Failed to store modifier list ${modifierList.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Store individual modifiers
    for (const modifier of modifiers) {
      try {
        const modifierData = modifier.modifier_data;
        if (!modifierData) continue;

        // Find the parent modifier list ID (Square string ID)
        const parentSquareListId = modifierData.modifier_list_id;
        if (!parentSquareListId) continue;

        // Resolve Square list ID to database integer ID
        const parentList = await storage.getSquareModifierListBySquareId(parentSquareListId);
        if (!parentList) {
          console.warn(`❌ Could not find modifier list with Square ID: ${parentSquareListId}`);
          continue;
        }

        console.log(`🔧 Creating modifier with RESOLVED listId=${parentList.id} (int), squareListId=${parentSquareListId} (str), modifierSquareId=${modifier.id}`);

        // Store individual modifier data to database with proper price conversion and idempotency
        await storage.upsertSquareModifier({
          squareId: modifier.id,
          modifierListId: parentList.id, // ✅ Now using integer database ID
          name: modifierData.name || 'Unnamed Modifier',
          priceMoney: modifierData.price_money?.amount || 0, // Store cents as integer
          enabled: !modifier.is_deleted,
          displayOrder: modifierData.ordinal || 0
        });
        
        result.modifiersCreated++;
        console.log(`✅ Stored modifier: "${modifierData.name}" ($${(modifierData.price_money?.amount || 0) / 100}) (${modifier.id})`);
      } catch (error) {
        result.errors.push(`Failed to store modifier ${modifier.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Create item-to-modifier-list links in batches for speed
    console.log(`🔗 Creating links from ${itemModifierMappings.length} item-modifier mappings in batches...`);
    
    const batchSize = 25; // Process in smaller batches for stability
    for (let i = 0; i < itemModifierMappings.length; i += batchSize) {
      const batch = itemModifierMappings.slice(i, i + batchSize);
      const batchNum = Math.floor(i/batchSize) + 1;
      const totalBatches = Math.ceil(itemModifierMappings.length/batchSize);
      
      console.log(`🔗 Processing batch ${batchNum}/${totalBatches} (${batch.length} links)`);
      
      // Process batch in parallel for speed
      const batchResults = await Promise.allSettled(batch.map(async (mapping) => {
        await storage.createMenuItemModifierList({
          squareItemId: mapping.itemId,
          squareModifierListId: mapping.modifierListId,
          enabled: mapping.modifierListInfo.enabled !== false
        });
      }));
      
      // Count successful operations
      let batchSuccess = 0;
      batchResults.forEach((batchResult, index) => {
        if (batchResult.status === 'fulfilled') {
          batchSuccess++;
        } else {
          const mapping = batch[index];
          result.errors.push(`Failed to link modifier list ${mapping.modifierListId} to item ${mapping.itemId}: ${batchResult.reason}`);
        }
      });
      
      result.linksCreated += batchSuccess;
      console.log(`✅ Batch ${batchNum} completed: ${batchSuccess}/${batch.length} links created`);
    }
    
    console.log(`✅ Read-only modifier sync completed: ${result.listsCreated} lists, ${result.modifiersCreated} modifiers, ${result.linksCreated} links`);
    return result;
    
  } catch (error) {
    const errorMsg = `Read-only modifier sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`❌ ${errorMsg}`);
    result.errors.push(errorMsg);
    return result;
  }
}

/**
 * Export function to sync all Square modifiers - can be called from API
 */
export async function syncAllSquareModifiers(): Promise<{ success: boolean; listsCreated: number; modifiersCreated: number; linksCreated: number; errors: string[] }> {
  console.log(`🔧 Starting read-only Square modifier sync...`);
  
  const result = {
    success: false,
    listsCreated: 0,
    modifiersCreated: 0,
    linksCreated: 0,
    errors: [] as string[]
  };

  try {
    // Read-only approach: collect modifier list IDs from existing items and batch retrieve them
    const readResult = await readSquareModifiersFromItems();
    result.listsCreated = readResult.listsCreated;
    result.modifiersCreated = readResult.modifiersCreated;
    
    // NOW CREATE THE ACTUAL LINKS!
    console.log(`🔗 Creating links between menu items and modifier lists...`);
    const linkResult = await linkModifiersToMenuItems();
    result.linksCreated = linkResult.linksCreated;
    result.errors.push(...linkResult.errors);
    result.errors.push(...readResult.errors);
    
    // Verify data was actually stored
    const storedLists = await storage.getSquareModifierLists();
    const storedModifiers = await storage.getSquareModifiers();
    const storedLinks = await storage.getMenuItemModifierLists();
    
    console.log(`📊 Verification: ${storedLists.length} lists, ${storedModifiers.length} modifiers, ${storedLinks.length} links in storage`);
    
    // Update has_options and has_sizes flags based on actual linked modifiers
    console.log(`🏷️  Updating menu item flags based on linked modifiers...`);
    const flagsResult = await updateMenuItemFlagsFromLinks();
    console.log(`✅ Updated flags for ${flagsResult.itemsUpdated} menu items`);
    
    result.success = result.errors.length === 0;
    console.log(`✅ Read-only Square modifier sync finished - Success: ${result.success}`);
    
    return result;
  } catch (error) {
    const errorMsg = `Read-only Square modifier sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`❌ ${errorMsg}`);
    result.errors.push(errorMsg);
    return result;
  }
}

/**
 * Update has_options and has_sizes flags based on actual database links
 * This ensures the flags accurately reflect linked modifiers after sync
 */
async function updateMenuItemFlagsFromLinks(): Promise<{ itemsUpdated: number; errors: string[] }> {
  const result = {
    itemsUpdated: 0,
    errors: [] as string[]
  };

  try {
    console.log(`🏷️  Analyzing menu items to update has_options and has_sizes flags...`);
    
    // Get all menu items from database
    const menuItems = await storage.getMenuItems();
    console.log(`📋 Found ${menuItems.length} menu items to analyze`);
    
    if (menuItems.length === 0) {
      return result;
    }
    
    // Get all modifier links
    const modifierLinks = await storage.getMenuItemModifierLists();
    console.log(`🔗 Found ${modifierLinks.length} modifier links in database`);
    
    // Create a map of Square item IDs to their modifier counts
    const itemModifierCounts = new Map<string, number>();
    for (const link of modifierLinks) {
      if (link.squareItemId) {
        const currentCount = itemModifierCounts.get(link.squareItemId) || 0;
        itemModifierCounts.set(link.squareItemId, currentCount + 1);
      }
    }
    
    console.log(`📊 Modifier count summary: ${itemModifierCounts.size} items have linked modifiers`);
    
    // Process each menu item to update flags
    for (const item of menuItems) {
      try {
        let hasOptions = false;
        let hasSizes = false;
        
        // Check if item has linked modifier lists (has_options)
        if (item.squareId) {
          const modifierCount = itemModifierCounts.get(item.squareId) || 0;
          hasOptions = modifierCount > 0;
          
          if (hasOptions) {
            console.log(`  ✅ "${item.name}" has ${modifierCount} modifier lists - setting has_options = true`);
          }
        }
        
        // Check if item has multiple size variations (has_sizes)
        // For now, we'll use the existing Square data approach since variations aren't in database yet
        if (item.squareId) {
          try {
            // Fetch Square item to check for multiple variations
            const squareItem = await makeSquareRequest(`/catalog/object/${item.squareId}`, 'GET');
            const variations = squareItem.object?.item_data?.variations || [];
            hasSizes = variations.length > 1;
            
            if (hasSizes) {
              console.log(`  ✅ "${item.name}" has ${variations.length} variations - setting has_sizes = true`);
            }
          } catch (error) {
            console.warn(`  ⚠️  Failed to check variations for "${item.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            // Continue without updating has_sizes for this item
          }
        }
        
        // Update flags if they're different from current values
        const needsUpdate = item.hasOptions !== hasOptions || item.hasSizes !== hasSizes;
        
        if (needsUpdate) {
          console.log(`  🔄 Updating "${item.name}": has_options ${item.hasOptions} → ${hasOptions}, has_sizes ${item.hasSizes} → ${hasSizes}`);
          
          await storage.updateMenuItemFlags(item.id, hasOptions, hasSizes);
          result.itemsUpdated++;
        }
        
      } catch (itemError) {
        const errorMsg = `Failed to update flags for item "${item.name}": ${itemError instanceof Error ? itemError.message : 'Unknown error'}`;
        console.warn(`  ⚠️  ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }
    
    console.log(`🏷️  Flag update completed: ${result.itemsUpdated} items updated, ${result.errors.length} errors`);
    return result;
    
  } catch (error) {
    const errorMsg = `Failed to update menu item flags from links: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`❌ ${errorMsg}`);
    result.errors.push(errorMsg);
    return result;
  }
}

// Simple in-memory cache with TTL for getSquareItemModifierAssociations
interface CachedModifierAssociation {
  data: {
    success: boolean;
    modifierListIds: string[];
    error?: string;
  };
  timestamp: number;
}

const modifierAssociationsCache = new Map<string, CachedModifierAssociation>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

/**
 * Clear the entire modifier associations cache
 * Should be called after global catalog sync to ensure fresh data
 */
export function clearModifierAssociationsCache(): void {
  modifierAssociationsCache.clear();
  console.log('🗑️ Cleared modifier associations cache');
}

/**
 * Get cached modifier associations if still valid (within TTL)
 */
function getCachedModifierAssociations(squareItemId: string): CachedModifierAssociation['data'] | null {
  const cached = modifierAssociationsCache.get(squareItemId);
  if (!cached) {
    return null;
  }
  
  const now = Date.now();
  const isExpired = (now - cached.timestamp) > CACHE_TTL_MS;
  
  if (isExpired) {
    modifierAssociationsCache.delete(squareItemId);
    return null;
  }
  
  return cached.data;
}

/**
 * Cache modifier associations with current timestamp
 */
function setCachedModifierAssociations(squareItemId: string, data: CachedModifierAssociation['data']): void {
  modifierAssociationsCache.set(squareItemId, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Fetch Square item with authoritative modifier_list_info associations
 * This is the source of truth for which modifier lists should be associated with an item
 * Now includes caching to reduce API calls
 */
export async function getSquareItemModifierAssociations(squareItemId: string): Promise<{
  success: boolean;
  modifierListIds: string[];
  error?: string;
}> {
  try {

    // Check cache first
    const cached = getCachedModifierAssociations(squareItemId);
    if (cached) {
      console.log(`🔍 CACHED: Returning cached modifier associations for ${squareItemId} (${cached.modifierListIds.length} lists)`);
      return cached;
    }

    console.log(`🔍 Fetching authoritative modifier associations for Square item: ${squareItemId}`);
    
    // Fetch the item with its variations to get complete modifier_list_info
    const response = await makeSquareRequest('/catalog/batch-retrieve', 'POST', {
      object_ids: [squareItemId],
      include_related_objects: true
    });
    
    if (!response.objects || response.objects.length === 0) {
      return {
        success: false,
        modifierListIds: [],
        error: `Item ${squareItemId} not found in Square catalog`
      };
    }
    
    const item = response.objects[0];
    const itemData = item.item_data;
    
    if (!itemData) {
      return {
        success: false,
        modifierListIds: [],
        error: `Item ${squareItemId} has no item_data`
      };
    }
    
    const allModifierListIds = new Set<string>();
    
    // Extract item-level modifier lists (only location-active ones)
    const beanStalkerLocationId = process.env.SQUARE_LOCATION_ID || 'LW166BYW0A6E0';
    
    if (itemData.modifier_list_info) {
      for (const modifierListInfo of itemData.modifier_list_info) {
        if (modifierListInfo.modifier_list_id) {
          // Get the modifier list object from related objects
          const modifierListObject = response.related_objects?.find(obj => 
            obj.id === modifierListInfo.modifier_list_id && obj.type === 'MODIFIER_LIST'
          );
          
          if (!modifierListObject) {
            console.log(`❌ Modifier list object not found: ${modifierListInfo.modifier_list_id}`);
            continue;
          }

          // Filter out deleted modifier lists
          if (modifierListObject.is_deleted === true) {
            console.log(`❌ Skipping deleted modifier list: ${modifierListInfo.modifier_list_id} (${modifierListInfo.name || 'unnamed'})`);
            continue;
          }
          
          // Filter out hidden modifier lists
          if (modifierListObject.modifier_list_data?.hidden_from_customer === true) {
            console.log(`❌ Skipping hidden modifier list: ${modifierListInfo.modifier_list_id} (${modifierListInfo.name || 'unnamed'})`);
            continue;
          }
          
          // REMOVED: Location filtering - now sync ALL modifier lists regardless of location
          // This allows items to get all their Square modifiers (milk/syrup options, etc.)
          console.log(`✅ Processing modifier list (no location filtering): ${modifierListInfo.modifier_list_id} (${modifierListInfo.name || 'unnamed'})`);
          
          // Count enabled modifiers in this list to detect empty/placeholder lists
          const modifierListData = modifierListObject.modifier_list_data;
          if (modifierListData?.modifiers) {
            let enabledModifierCount = 0;
            for (const modifier of modifierListData.modifiers) {
              // Skip deleted modifiers
              if (modifier.is_deleted === true) continue;
              
              // REMOVED: Individual modifier location filtering - count all non-deleted modifiers
              // This ensures all modifiers are included regardless of location restrictions
              enabledModifierCount++;
            }
            
            if (enabledModifierCount === 0) {
              console.log(`❌ Skipping empty modifier list (no enabled modifiers): ${modifierListInfo.modifier_list_id} (${modifierListInfo.name || 'unnamed'})`);
              continue;
            }
          }
          
          allModifierListIds.add(modifierListInfo.modifier_list_id);
          console.log(`✅ Found location-active modifier list: ${modifierListInfo.modifier_list_id} (${modifierListInfo.name || 'unnamed'})`);
        }
      }
    }
    
    // Extract variation-level modifier lists (only location-active ones)
    if (itemData.variations) {
      for (const variation of itemData.variations) {
        const variationData = variation.item_variation_data;
        if (variationData?.modifier_list_info) {
          for (const modifierListInfo of variationData.modifier_list_info) {
            if (modifierListInfo.modifier_list_id) {
              // Get the modifier list object from related objects
              const modifierListObject = response.related_objects?.find(obj => 
                obj.id === modifierListInfo.modifier_list_id && obj.type === 'MODIFIER_LIST'
              );
              
              if (!modifierListObject) {
                console.log(`❌ Variation modifier list object not found: ${modifierListInfo.modifier_list_id}`);
                continue;
              }

              // Filter out deleted modifier lists
              if (modifierListObject.is_deleted === true) {
                console.log(`❌ Skipping deleted variation modifier list: ${modifierListInfo.modifier_list_id} (${modifierListInfo.name || 'unnamed'})`);
                continue;
              }
              
              // Filter out hidden modifier lists
              if (modifierListObject.modifier_list_data?.hidden_from_customer === true) {
                console.log(`❌ Skipping hidden variation modifier list: ${modifierListInfo.modifier_list_id} (${modifierListInfo.name || 'unnamed'})`);
                continue;
              }
              
              // REMOVED: Variation-level location filtering - sync ALL variation modifier lists
              // This ensures variations like 12oz/8oz get their proper milk/syrup options
              console.log(`✅ Processing variation modifier list (no location filtering): ${modifierListInfo.modifier_list_id} (${modifierListInfo.name || 'unnamed'})`);
              
              // Count enabled modifiers
              const modifierListData = modifierListObject.modifier_list_data;
              if (modifierListData?.modifiers) {
                let enabledModifierCount = 0;
                for (const modifier of modifierListData.modifiers) {
                  if (modifier.is_deleted === true) continue;
                  
                  // REMOVED: Variation modifier location filtering - count all non-deleted modifiers
                  // This ensures all variation modifiers are included regardless of location
                  enabledModifierCount++;
                }
                
                if (enabledModifierCount === 0) {
                  console.log(`❌ Skipping empty variation modifier list (no enabled modifiers): ${modifierListInfo.modifier_list_id} (${modifierListInfo.name || 'unnamed'})`);
                  continue;
                }
              }
              
              allModifierListIds.add(modifierListInfo.modifier_list_id);
              console.log(`✅ Found location-active variation modifier list: ${modifierListInfo.modifier_list_id} (${modifierListInfo.name || 'unnamed'})`);
            }
          }
        }
      }
    }
    
    const modifierListIds = Array.from(allModifierListIds);
    console.log(`📊 Square item ${squareItemId} has ${modifierListIds.length} authoritative modifier lists: ${modifierListIds.join(', ')}`);
    
    return {
      success: true,
      modifierListIds
    };
    
  } catch (error) {
    console.error(`❌ Failed to fetch Square item modifier associations for ${squareItemId}:`, error);
    return {
      success: false,
      modifierListIds: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Reconcile database modifier associations with Square's authoritative data
 * This replaces (not merges) database associations with Square's exact configuration
 */
export async function reconcileItemModifierAssociations(squareItemId: string): Promise<{
  success: boolean;
  associationsUpdated: number;
  error?: string;
}> {
  try {
    console.log(`🔄 Reconciling modifier associations for item ${squareItemId} with Square source of truth`);
    
    // Get authoritative associations from Square
    const squareAssociations = await getSquareItemModifierAssociations(squareItemId);
    
    if (!squareAssociations.success) {
      return {
        success: false,
        associationsUpdated: 0,
        error: squareAssociations.error
      };
    }
    
    // Get current database associations
    const allDatabaseLinks = await storage.getMenuItemModifierLists();
    const currentDatabaseLinks = allDatabaseLinks.filter(link => link.squareItemId === squareItemId);
    
    console.log(`📊 Current database has ${currentDatabaseLinks.length} associations, Square says ${squareAssociations.modifierListIds.length}`);
    
    // Clear existing database associations for this item
    // Note: We would need to add a deleteMenuItemModifierLinksBySquareItemId method to storage
    // For now, we'll work with what we have and add reconciliation logic
    
    // Get all available modifier lists from database
    const allModifierLists = await storage.getSquareModifierLists();
    const modifierListLookup = new Map(allModifierLists.map(list => [list.squareId, list.id]));
    
    // Count how many Square associations we can fulfill
    let fulfillableCount = 0;
    const missingLists: string[] = [];
    
    for (const squareModifierListId of squareAssociations.modifierListIds) {
      if (modifierListLookup.has(squareModifierListId)) {
        fulfillableCount++;
      } else {
        missingLists.push(squareModifierListId);
      }
    }
    
    if (missingLists.length > 0) {
      console.log(`⚠️  Missing ${missingLists.length} modifier lists in database: ${missingLists.join(', ')}`);
      console.log(`🔧 Will need to sync these modifier lists first`);
    }
    
    console.log(`✅ Can fulfill ${fulfillableCount}/${squareAssociations.modifierListIds.length} Square modifier associations`);
    
    return {
      success: true,
      associationsUpdated: fulfillableCount,
      error: missingLists.length > 0 ? `Missing modifier lists: ${missingLists.join(', ')}` : undefined
    };
    
  } catch (error) {
    console.error(`❌ Failed to reconcile modifier associations for ${squareItemId}:`, error);
    return {
      success: false,
      associationsUpdated: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * ALTERNATIVE IMPLEMENTATION: Get menu items using /catalog/search endpoint
 * This is a different approach to test if it returns better category associations
 */
export async function getSquareMenuItemsAlt(): Promise<any> {
  try {
    console.log('🍽️ [ALT] Fetching menu items using /catalog/search endpoint...');
    
    const locationId = getSquareLocationId();
    console.log(`🏪 [ALT] Bean Stalker location ID: ${locationId}`);
    
    // Enhanced debugging for alternative approach
    console.log('🔧 [ALT] DEBUG: Making Square API call with parameters:', {
      endpoint: '/catalog/search',
      method: 'POST',
      body: {
        object_types: ['ITEM'],
        include_related_objects: true,
        limit: 100
      }
    });

    // Try the /catalog/search endpoint with ITEM object type
    const response = await makeSquareRequest('/catalog/search', 'POST', {
      object_types: ['ITEM'],
      include_related_objects: true,
      limit: 100
    });
    
    // Enhanced debugging of API response structure
    console.log('🔧 [ALT] DEBUG: Square API Response Structure:');
    console.log('  - Response keys:', Object.keys(response || {}));
    console.log('  - Objects count:', (response.objects || []).length);
    console.log('  - Related objects count:', (response.related_objects || []).length);
    console.log('  - Cursor:', response.cursor || 'none');
    
    const items = response.objects || [];
    const relatedObjects = response.related_objects || [];
    
    // Debug related objects breakdown
    const relatedObjectsByType = relatedObjects.reduce((acc: any, obj: any) => {
      acc[obj.type] = (acc[obj.type] || 0) + 1;
      return acc;
    }, {});
    console.log('🔧 [ALT] DEBUG: Related objects by type:', relatedObjectsByType);
    
    // Sample the first few related objects for debugging
    if (relatedObjects.length > 0) {
      console.log('🔧 [ALT] DEBUG: Sample related objects (first 5):');
      relatedObjects.slice(0, 5).forEach((obj: any, index: number) => {
        console.log(`  ${index + 1}. Type: ${obj.type}, ID: ${obj.id}, Has data: ${!!obj[`${obj.type.toLowerCase()}_data`]}`);
        if (obj.type === 'CATEGORY') {
          console.log(`     Category name: ${obj.category_data?.name}`);
        }
      });
    }
    
    // Create lookup maps for categories and variations
    const categoryMap: { [id: string]: any } = {};
    const variationMap: { [id: string]: any } = {};
    
    relatedObjects.forEach((obj: any) => {
      if (obj.type === 'CATEGORY') {
        categoryMap[obj.id] = obj;
        console.log(`🔧 [ALT] DEBUG: Added category to map - ID: ${obj.id}, Name: ${obj.category_data?.name}`);
      } else if (obj.type === 'ITEM_VARIATION') {
        variationMap[obj.id] = obj;
      }
    });
    
    console.log(`🔧 [ALT] DEBUG: CategoryMap built with ${Object.keys(categoryMap).length} categories`);
    console.log(`🔧 [ALT] DEBUG: VariationMap built with ${Object.keys(variationMap).length} variations`);
    
    // Sample the first few items to see their structure
    if (items.length > 0) {
      console.log('🔧 [ALT] DEBUG: Sample items structure (first 5):');
      items.slice(0, 5).forEach((item: any, index: number) => {
        const itemData = item.item_data;
        console.log(`  ${index + 1}. Item "${itemData?.name}":`, {
          id: item.id,
          category_id: itemData?.category_id || 'MISSING',
          has_variations: !!(itemData?.variations?.length),
          description: itemData?.description?.substring(0, 50) || 'no description'
        });
      });
    }
    
    console.log(`📱 [ALT] Square API returned ${items.length} items using /catalog/search endpoint`);
    
    // Count items with and without categories
    const itemsWithCategories = items.filter(item => item?.item_data?.category_id);
    const itemsWithoutCategories = items.filter(item => !item?.item_data?.category_id);
    
    console.log(`🔧 [ALT] DEBUG: Item category analysis:`);
    console.log(`  - Items with category IDs: ${itemsWithCategories.length}/${items.length}`);
    console.log(`  - Items without category IDs: ${itemsWithoutCategories.length}/${items.length}`);
    
    return {
      success: true,
      endpoint: '/catalog/search',
      items: items,
      relatedObjects: relatedObjects,
      categoryMap: categoryMap,
      itemsWithCategories: itemsWithCategories.length,
      itemsWithoutCategories: itemsWithoutCategories.length,
      totalItems: items.length,
      totalRelatedObjects: relatedObjects.length,
      categoriesInRelated: Object.keys(categoryMap).length
    };
    
  } catch (error) {
    console.error('❌ [ALT] Failed to fetch Square menu items with /catalog/search:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * DEBUG TEST: Compare both API approaches side by side
 */
export async function debugSquareAPIApproaches(): Promise<any> {
  try {
    console.log('🔍 DEBUG TEST: Comparing Square API approaches...');
    
    // Test original approach with enhanced debugging
    console.log('\n🔧 === TESTING ORIGINAL APPROACH (/catalog/search-catalog-items) ===');
    const originalResult = await getSquareMenuItems();
    
    // Test alternative approach
    console.log('\n🔧 === TESTING ALTERNATIVE APPROACH (/catalog/search) ===');
    const alternativeResult = await getSquareMenuItemsAlt();
    
    // Compare results
    console.log('\n🔧 === COMPARISON RESULTS ===');
    console.log('Original approach:');
    console.log(`  - Items returned: ${originalResult?.length || 0}`);
    console.log(`  - First item name: ${originalResult?.[0]?.name || 'none'}`);
    console.log(`  - First item category: ${originalResult?.[0]?.category || 'none'}`);
    
    console.log('Alternative approach:');
    console.log(`  - Success: ${alternativeResult?.success}`);
    console.log(`  - Total items: ${alternativeResult?.totalItems || 0}`);
    console.log(`  - Items with categories: ${alternativeResult?.itemsWithCategories || 0}`);
    console.log(`  - Items without categories: ${alternativeResult?.itemsWithoutCategories || 0}`);
    console.log(`  - Categories in related: ${alternativeResult?.categoriesInRelated || 0}`);
    console.log(`  - Total related objects: ${alternativeResult?.totalRelatedObjects || 0}`);
    
    return {
      original: {
        itemCount: originalResult?.length || 0,
        firstItemName: originalResult?.[0]?.name || null,
        firstItemCategory: originalResult?.[0]?.category || null
      },
      alternative: alternativeResult
    };
    
  } catch (error) {
    console.error('❌ DEBUG TEST failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}


/**
 * BACKFILL: Fix existing menu items with correct categories from Square data
 * This function addresses items that were created before proper category mapping
 */
export async function backfillCorrectCategories(): Promise<any> {
  try {
    console.log("🔄 Starting category backfill for existing menu items...");
    
    // Get all existing menu items that need fixing
    const existingItems = await storage.getAllMenuItems();
    console.log(`📋 Found ${existingItems.length} existing menu items to check`);
    
    if (existingItems.length === 0) {
      return { success: true, itemsProcessed: 0, itemsUpdated: 0, message: "No items to process" };
    }
    
    let itemsProcessed = 0;
    let itemsUpdated = 0;
    let itemsSkipped = 0;
    const errors: string[] = [];
    
    // Process items in batches to avoid overwhelming Square API
    const BATCH_SIZE = 10;
    for (let i = 0; i < existingItems.length; i += BATCH_SIZE) {
      const batch = existingItems.slice(i, i + BATCH_SIZE);
      console.log(`🔄 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(existingItems.length/BATCH_SIZE)} (${batch.length} items)`);
      
      // Process batch items in parallel
      const batchPromises = batch.map(async (item) => {
        try {
          itemsProcessed++;
          
          // Skip if no Square ID
          if (!item.squareId) {
            console.log(`⚠️  Skipping item "${item.name}" - no Square ID`);
            itemsSkipped++;
            return { success: false, reason: "no_square_id" };
          }
          
          // Fetch current item data from Square API
          console.log(`🔍 Fetching Square data for: ${item.name} (${item.squareId})`);
          const squareResponse = await makeSquareRequest("/catalog/search-catalog-objects", "POST", {
            object_types: ["ITEM"],
            query: {
              exact_query: {
                attribute_name: "id",
                attribute_value: item.squareId
              }
            },
            include_related_objects: true
          });
          
          const squareItems = squareResponse.objects || [];
          if (squareItems.length === 0) {
            console.log(`⚠️  No Square data found for item: ${item.name} (${item.squareId})`);
            itemsSkipped++;
            return { success: false, reason: "not_found_in_square" };
          }
          
          const squareItem = squareItems[0];
          const squareCategoryId = squareItem?.item_data?.category_id;
          
          if (!squareCategoryId) {
            console.log(`⚠️  Item "${item.name}" has no category in Square, skipping`);
            itemsSkipped++;
            return { success: false, reason: "no_square_category" };
          }
          
          // Get the proper category name from our database
          const categoryRecord = await storage.getCategoryBySquareId(squareCategoryId);
          if (!categoryRecord) {
            console.log(`⚠️  Item "${item.name}" has unknown Square category "${squareCategoryId}", skipping`);
            itemsSkipped++;
            return { success: false, reason: "unknown_category" };
          }
          
          // Check if update is needed
          const correctCategory = categoryRecord.name;
          if (item.category === correctCategory && item.squareCategoryId === squareCategoryId) {
            console.log(`✅ Item "${item.name}" already has correct category "${correctCategory}"`);
            return { success: true, reason: "already_correct" };
          }
          
          // Update the item with correct category
          console.log(`🔄 Updating "${item.name}": "${item.category}" → "${correctCategory}"`);
          await storage.updateMenuItem(item.id, {
            category: correctCategory,
            squareCategoryId: squareCategoryId
          });
          
          itemsUpdated++;
          console.log(`✅ Updated "${item.name}" with category "${correctCategory}"`);
          return { success: true, reason: "updated" };
          
        } catch (error) {
          const errorMsg = `Failed to process item "${item.name}": ${error instanceof Error ? error.message : "Unknown error"}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
          return { success: false, reason: "error", error: errorMsg };
        }
      });
      
      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Small delay between batches to be respectful to Square API
      if (i + BATCH_SIZE < existingItems.length) {
        console.log("⏳ Brief pause between batches...");
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
    
    // Summary
    console.log("\\n📊 Category Backfill Summary:");
    console.log(`  ✅ Items processed: ${itemsProcessed}`);
    console.log(`  🔄 Items updated: ${itemsUpdated}`);
    console.log(`  ⚠️  Items skipped: ${itemsSkipped}`);
    console.log(`  ❌ Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log("\\n❌ Errors encountered:");
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    return {
      success: true,
      itemsProcessed,
      itemsUpdated, 
      itemsSkipped,
      errors: errors.length,
      errorDetails: errors
    };
    
  } catch (error) {
    console.error("❌ Category backfill failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Dedicated variations sync for all menu items
 * This function iterates through all menu items with Square IDs and syncs their variations
 * to the menu_item_options table, providing comprehensive logging
 */
export async function syncVariationsForAllMenuItems(): Promise<{
  success: boolean;
  itemsProcessed: number;
  variationsCreated: number;
  variationsUpdated: number;
  variationsDeleted: number;
  errors: string[];
}> {
  try {
    console.log('\n🔧 VARIATIONS SYNC: Starting dedicated variations sync for all menu items...');
    
    const result = {
      success: true,
      itemsProcessed: 0,
      variationsCreated: 0,
      variationsUpdated: 0,
      variationsDeleted: 0,
      errors: [] as string[]
    };

    // Step 1: Get all menu items with Square IDs
    const allMenuItems = await storage.getMenuItems();
    const itemsWithSquareIds = allMenuItems.filter(item => item.squareId);
    
    console.log(`🔧 VARIATIONS: Found ${allMenuItems.length} total menu items, ${itemsWithSquareIds.length} with Square IDs`);
    
    if (itemsWithSquareIds.length === 0) {
      console.log('🔧 VARIATIONS: No items with Square IDs to process');
      return result;
    }

    // Step 2: Process each menu item
    for (const [index, menuItem] of itemsWithSquareIds.entries()) {
      const itemProgress = `[${index + 1}/${itemsWithSquareIds.length}]`;
      
      try {
        console.log(`🔧 VARIATIONS: ${itemProgress} Processing "${menuItem.name}" (${menuItem.squareId})`);
        result.itemsProcessed++;

        // Get existing variations for this menu item
        const existingVariations = await storage.getMenuItemOptions(menuItem.id);
        const existingVariationsByName = new Map(
          existingVariations
            .filter(opt => opt.optionType === 'size')
            .map(opt => [opt.name, opt])
        );

        // Fetch variations from Square
        const squareVariations = await getSquareItemVariations(menuItem.squareId);
        
        if (!squareVariations || squareVariations.length === 0) {
          console.log(`🔧 VARIATIONS: ${itemProgress} No variations found for "${menuItem.name}"`);
          
          // If no Square variations but we have existing size options, remove them
          if (existingVariationsByName.size > 0) {
            console.log(`🔧 VARIATIONS: ${itemProgress} Removing ${existingVariationsByName.size} obsolete size options`);
            for (const [, existingVariation] of existingVariationsByName) {
              await storage.deleteMenuItemOption(existingVariation.id);
              result.variationsDeleted++;
            }
          }
          continue;
        }

        console.log(`🔧 VARIATIONS: ${itemProgress} Found ${squareVariations.length} Square variations for "${menuItem.name}"`);

        // Process each Square variation
        const processedVariationNames = new Set<string>();
        
        for (const [variationIndex, squareVariation] of squareVariations.entries()) {
          try {
            processedVariationNames.add(squareVariation.name);
            const priceAdjustmentCents = squareVariation.price - Math.round(menuItem.price * 100);
            
            const existingVariation = existingVariationsByName.get(squareVariation.name);
            
            if (existingVariation) {
              // Update existing variation
              await storage.updateMenuItemOption(existingVariation.id, {
                name: squareVariation.name,
                optionType: 'size',
                displayOrder: variationIndex,
                priceAdjustmentCents: priceAdjustmentCents
              });
              console.log(`🔧 VARIATIONS: ${itemProgress} Updated size option "${squareVariation.name}" - $${(squareVariation.price / 100).toFixed(2)}`);
              result.variationsUpdated++;
            } else {
              // Create new variation
              await storage.createMenuItemOption({
                menuItemId: menuItem.id,
                name: squareVariation.name,
                optionType: 'size',
                displayOrder: variationIndex,
                priceAdjustmentCents: priceAdjustmentCents
              });
              console.log(`🔧 VARIATIONS: ${itemProgress} Created size option "${squareVariation.name}" - $${(squareVariation.price / 100).toFixed(2)}`);
              result.variationsCreated++;
            }
          } catch (variationError) {
            const errorMsg = `Failed to process variation "${squareVariation.name}" for item "${menuItem.name}": ${variationError instanceof Error ? variationError.message : 'Unknown error'}`;
            console.warn(`🔧 VARIATIONS: ${itemProgress} ⚠️  ${errorMsg}`);
            result.errors.push(errorMsg);
          }
        }

        // Remove obsolete variations (exist locally but not in Square)
        for (const [variationName, existingVariation] of existingVariationsByName) {
          if (!processedVariationNames.has(variationName)) {
            await storage.deleteMenuItemOption(existingVariation.id);
            console.log(`🔧 VARIATIONS: ${itemProgress} Removed obsolete size option "${variationName}"`);
            result.variationsDeleted++;
          }
        }

        // Update menu item flags to indicate it has size options
        const hasSizeOptions = squareVariations.length > 0;
        await storage.updateMenuItemFlags(menuItem.id, menuItem.hasOptions || false, hasSizeOptions);
        
      } catch (itemError) {
        const errorMsg = `Failed to sync variations for item "${menuItem.name}" (${menuItem.squareId}): ${itemError instanceof Error ? itemError.message : 'Unknown error'}`;
        console.error(`🔧 VARIATIONS: ${itemProgress} ❌ ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    // Step 3: Summary
    console.log('\n🔧 VARIATIONS SYNC: Summary');
    console.log(`  📋 Items processed: ${result.itemsProcessed}`);
    console.log(`  ✨ Variations created: ${result.variationsCreated}`);
    console.log(`  🔄 Variations updated: ${result.variationsUpdated}`);
    console.log(`  🗑️  Variations deleted: ${result.variationsDeleted}`);
    console.log(`  ❌ Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n🔧 VARIATIONS: Errors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    result.success = result.errors.length === 0;
    console.log(`🔧 VARIATIONS SYNC: ${result.success ? 'Completed successfully' : 'Completed with errors'}`);
    
    return result;
    
  } catch (error) {
    const errorMsg = `Variations sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('🔧 VARIATIONS: ❌ ' + errorMsg);
    
    return {
      success: false,
      itemsProcessed: 0,
      variationsCreated: 0,
      variationsUpdated: 0,
      variationsDeleted: 0,
      errors: [errorMsg]
    };
  }
}
