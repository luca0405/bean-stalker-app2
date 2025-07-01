import { createContext, useContext, ReactNode } from "react";
import { MenuItem } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface MenuCategory {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  displayOrder: number | null;
  createdAt: Date;
}

interface MenuContextType {
  menuItems: MenuItem[];
  categories: string[];
  categoryObjects: MenuCategory[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refreshMenu: () => Promise<void>;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const {
    data: menuItems = [],
    isLoading: menuLoading,
    error: menuError,
    isRefetching: menuRefetching,
  } = useQuery<MenuItem[], Error>({
    queryKey: ["/api/menu"],
  });

  const {
    data: categoryObjects = [],
    isLoading: categoriesLoading,
    error: categoriesError,
    isRefetching: categoriesRefetching,
  } = useQuery<MenuCategory[], Error>({
    queryKey: ["/api/categories"],
  });

  // Sort categories by display order and extract names
  const categories = categoryObjects
    ? [...categoryObjects]
        .sort((a, b) => {
          const aOrder = a.displayOrder ?? 999;
          const bOrder = b.displayOrder ?? 999;
          return aOrder - bOrder;
        })
        .map(cat => cat.name)
    : [];

  const isLoading = menuLoading || categoriesLoading;
  const error = menuError || categoriesError;
  const isRefetching = menuRefetching || categoriesRefetching;

  // Function to refresh menu data
  const refreshMenu = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      console.log("Menu data refreshed");
    } catch (err) {
      console.error("Error refreshing menu data:", err);
    }
  };

  return (
    <MenuContext.Provider
      value={{
        menuItems,
        categories,
        categoryObjects,
        isLoading,
        isRefreshing: isRefetching,
        error: error || null,
        refreshMenu,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error("useMenu must be used within a MenuProvider");
  }
  return context;
}
