import { useState, useMemo, useCallback } from "react";
import { AppHeader } from "@/components/app-header";
import { CategoryFilter } from "@/components/category-filter";
import { GrabMenuCard } from "@/components/grab-menu-card";
import { ProductDetailModal } from "@/components/product-detail-modal";
import { useMenu } from "@/contexts/menu-context";
import { Loader2, RefreshCw } from "lucide-react";
import { formatCategoryName } from "@/lib/utils";
import { useNativeNotification } from "@/services/native-notification-service";
import { Button } from "@/components/ui/button";
import { MenuItem } from "@shared/schema";

export default function MenuPage() {
  const { menuItems, categories, isLoading, isRefreshing, refreshMenu } = useMenu();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { notify } = useNativeNotification();

  const handleItemClick = (item: MenuItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };
  

  
  const filteredItems = useMemo(() => {
    if (selectedCategory === "all") {
      return menuItems;
    } else {
      return menuItems.filter((item) => item.category === selectedCategory);
    }
  }, [menuItems, selectedCategory]);
  
  // Group menu items by category in the correct order
  const groupedItems = useMemo(() => {
    if (selectedCategory !== "all") {
      // If a specific category is selected, only show that category
      return new Map([[selectedCategory, filteredItems]]);
    }
    
    // When "all" is selected, group items by their categories and order by category display order
    const grouped = new Map<string, typeof menuItems>();
    
    // Group all items by category first
    menuItems.forEach((item) => {
      if (!grouped.has(item.category)) {
        grouped.set(item.category, []);
      }
      grouped.get(item.category)?.push(item);
    });
    
    // Create a new map with categories in the correct order
    const orderedGrouped = new Map<string, typeof menuItems>();
    categories.forEach((category) => {
      if (grouped.has(category)) {
        orderedGrouped.set(category, grouped.get(category)!);
      }
    });
    
    return orderedGrouped;
  }, [filteredItems, menuItems, selectedCategory, categories]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      await refreshMenu();
      notify({
        title: "Menu Updated",
        description: "Latest menu items loaded",
      });
    } catch (error) {
      notify({
        title: "Refresh Failed",
        description: "Could not refresh menu items",
        variant: "destructive",
      });
    }
  }, [refreshMenu, notify]);

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-slate-50 via-gray-50 to-green-50/30 native-page-scroll"
    >
      <AppHeader />
      
      <main className="p-4 pb-32 max-w-6xl mx-auto">
          {/* Enhanced Header Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 mb-6 shadow-sm border border-white/20">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-bold text-2xl text-gray-900 mb-1">Our Menu</h1>
                <p className="text-sm text-gray-600">Freshly made with premium ingredients</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : (
            <>
              <CategoryFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
              
              {selectedCategory === "all" ? (
                // When "all" is selected, show sections for each category
                Array.from(groupedItems.entries()).map(([category, items]) => (
                  <div key={category} className="mb-8">
                    <div className="bg-white border-2 border-orange-200 rounded-xl p-4 mb-4 shadow-sm">
                      <h2 className="font-bold text-xl text-gray-900">
                        {formatCategoryName(category)}
                      </h2>
                      <p className="text-gray-600 text-sm">{items.length} items available</p>
                    </div>
                    {/* Grab-style 2-column grid */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {items.map((item) => (
                        <GrabMenuCard 
                          key={item.id} 
                          item={item} 
                          onClick={() => handleItemClick(item)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div>
                  <div className="bg-white border-2 border-orange-200 rounded-xl p-4 mb-4 shadow-sm">
                    <h2 className="font-bold text-xl text-gray-900">
                      {formatCategoryName(selectedCategory)}
                    </h2>
                    <p className="text-gray-600 text-sm">{filteredItems.length} items available</p>
                  </div>
                  {/* Grab-style 2-column grid for selected category */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {filteredItems.map((item) => (
                      <GrabMenuCard 
                        key={item.id} 
                        item={item} 
                        onClick={() => handleItemClick(item)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>

      {/* Product Detail Modal */}
      <ProductDetailModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
