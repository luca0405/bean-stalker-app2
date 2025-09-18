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
  const [selectedCategory, setSelectedCategory] = useState("coffee");
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
  

  
  // Filter menu items by selected category locally (no API calls)
  const filteredItems = useMemo(() => {
    if (!menuItems || menuItems.length === 0) {
      return [];
    }
    
    // Filter items by the selected category
    return menuItems.filter(item => item.category === selectedCategory);
  }, [menuItems, selectedCategory]);
  


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
      
      <main className="p-4 pb-32 w-full mx-auto
        sm:max-w-none sm:px-6 
        md:max-w-7xl md:px-8
        lg:max-w-none lg:px-10"
      >
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
          
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
          
          <div>
            <div className="bg-white border-2 border-orange-200 rounded-xl p-4 mb-4 shadow-sm">
              <h2 className="font-bold text-xl text-gray-900">
                {formatCategoryName(selectedCategory)}
              </h2>
              <p className="text-gray-600 text-sm">{filteredItems.length} items available</p>
            </div>
            
            {/* Show loading state from menu context */}
            {isLoading && (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-800" />
              </div>
            )}
            
            {/* Responsive grid for selected category */}
            {!isLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-3 sm:gap-4">
                {filteredItems.map((item) => (
                  <GrabMenuCard 
                    key={item.id} 
                    item={item} 
                    onClick={() => handleItemClick(item)}
                  />
                ))}
              </div>
            )}
          </div>
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
