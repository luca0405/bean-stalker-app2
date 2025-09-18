#!/usr/bin/env node

/**
 * Debug script for modifier sync - runs the sync process and logs detailed information
 */

import { storage } from './server/storage.js';
import { syncAllSquareModifiers } from './server/square-catalog-sync.js';

async function debugModifierSync() {
  console.log('🔍 DEBUG: Starting modifier sync investigation...');
  
  try {
    // Check current state before sync
    console.log('📊 BEFORE SYNC:');
    const beforeLists = await storage.getSquareModifierLists();
    const beforeModifiers = await storage.getSquareModifiers();
    const beforeLinks = await storage.getMenuItemModifierLists();
    
    console.log(`  - Modifier Lists: ${beforeLists.length}`);
    console.log(`  - Individual Modifiers: ${beforeModifiers.length}`);
    console.log(`  - Links: ${beforeLinks.length}`);
    
    if (beforeLists.length > 0) {
      console.log(`  - Sample list: "${beforeLists[0].name}" (${beforeLists[0].squareId})`);
    }
    
    // Run the sync
    console.log('\n🔧 RUNNING SYNC:');
    const syncResult = await syncAllSquareModifiers();
    
    console.log('\n📊 SYNC RESULT:');
    console.log(`  - Success: ${syncResult.success}`);
    console.log(`  - Lists Created: ${syncResult.listsCreated}`);
    console.log(`  - Modifiers Created: ${syncResult.modifiersCreated}`);
    console.log(`  - Links Created: ${syncResult.linksCreated}`);
    console.log(`  - Errors: ${syncResult.errors.length}`);
    
    if (syncResult.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      syncResult.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
    
    // Check state after sync
    console.log('\n📊 AFTER SYNC:');
    const afterLists = await storage.getSquareModifierLists();
    const afterModifiers = await storage.getSquareModifiers();
    const afterLinks = await storage.getMenuItemModifierLists();
    
    console.log(`  - Modifier Lists: ${afterLists.length}`);
    console.log(`  - Individual Modifiers: ${afterModifiers.length}`);
    console.log(`  - Links: ${afterLinks.length}`);
    
    if (afterModifiers.length > 0) {
      console.log('\n📋 SAMPLE MODIFIERS:');
      afterModifiers.slice(0, 5).forEach((mod, i) => {
        console.log(`  ${i + 1}. "${mod.name}" - $${mod.priceAdjustment} (List: ${mod.modifierListId})`);
      });
    } else {
      console.log('\n⚠️  NO INDIVIDUAL MODIFIERS CREATED - This is the bug!');
    }
    
    // Test specific modifier list retrieval
    if (afterLists.length > 0) {
      const testList = afterLists[0];
      console.log(`\n🔬 TESTING MODIFIER RETRIEVAL for "${testList.name}":`)
      
      try {
        const modifiersForList = await storage.getSquareModifiersByListSquareId(testList.squareId);
        console.log(`  - Found ${modifiersForList.length} modifiers for this list`);
        
        if (modifiersForList.length > 0) {
          modifiersForList.forEach((mod, i) => {
            console.log(`    ${i + 1}. "${mod.name}" - $${mod.priceAdjustment}`);
          });
        }
      } catch (error) {
        console.log(`  - Error getting modifiers: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('💥 DEBUG FAILED:', error);
  }
}

// Run the debug
debugModifierSync().then(() => {
  console.log('\n✅ Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Debug script failed:', error);
  process.exit(1);
});