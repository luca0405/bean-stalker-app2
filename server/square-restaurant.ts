// TEMPORARILY DISABLED - THIS FILE CONTAINS SQUARE SDK IMPORTS THAT CAUSE PRODUCTION ISSUES
// The Square SDK has import compatibility issues in the production environment
// This file is disabled until we can resolve the "Cannot read properties of undefined (reading 'Sandbox')" error

// Original file moved to square-restaurant-disabled.ts
// All functions that depend on Square SDK are temporarily unavailable

export async function createRestaurantOrder() {
  throw new Error('Square Restaurant integration temporarily disabled due to SDK compatibility issues');
}

export async function updateOrderStatus() {
  throw new Error('Square Restaurant integration temporarily disabled due to SDK compatibility issues');
}

export async function getSquareMenuItems() {
  throw new Error('Square Restaurant integration temporarily disabled due to SDK compatibility issues');
}

export async function syncInventoryLevels() {
  throw new Error('Square Restaurant integration temporarily disabled due to SDK compatibility issues');
}

export async function processRestaurantPayment() {
  throw new Error('Square Restaurant integration temporarily disabled due to SDK compatibility issues');
}

export async function getLocationInfo() {
  throw new Error('Square Restaurant integration temporarily disabled due to SDK compatibility issues');
}