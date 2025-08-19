# Square Catalog Sync Guide

## Overview ✨
Creating your Bean Stalker menu in Square catalog will solve the Kitchen Display visibility issue and provide better integration with Square's ecosystem.

## What This Will Do
**Sync 33 Bean Stalker Menu Items** to your production Square account:

### Categories to Create:
- **Breakfast** (5 items) - Paninis, croissants, smashed avo
- **Coffee** (2 items) - Black coffee, white coffee  
- **Hot Drinks** (4 items) - Chai, hot chocolate, matcha, tea
- **Iced Drinks** (7 items) - Cold brew, iced lattes, milkshakes
- **Juices & Refreshers** (4 items) - Orange juice, coconut refresher, spritzers
- **Lunch** (5 items) - Chicken baguettes, wraps, pizza panini
- **Smoothies** (6 items) - Big breakie, protein, tropical crush

### Benefits After Sync:
1. **Kitchen Display Visibility** - Orders will appear as proper tickets
2. **Inventory Tracking** - Square can track your Bean Stalker items
3. **Better Reporting** - Detailed sales reports by category/item
4. **Catalog Recognition** - Orders will reference actual Square catalog IDs
5. **POS Integration** - Items available in Square POS if needed

## API Endpoints Available:
- `POST /api/square/catalog/sync` - Sync full menu (categories + items)
- `POST /api/square/catalog/categories` - Sync categories only  
- `POST /api/square/catalog/items` - Sync menu items only

## Next Steps:
Run the catalog sync to create your Bean Stalker menu in Square, then test Kitchen Display integration with proper catalog item recognition.

This will make Order #81 and future orders display correctly in your Square Kitchen Display dashboard.