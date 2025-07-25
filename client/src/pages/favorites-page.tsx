import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { FavoritesList } from "@/components/favorites-list";

export default function FavoritesPage() {
  return (
    <div className="flex flex-col bg-secondary iphone-fullscreen" style={{ 
      height: '-webkit-fill-available',
      width: '100vw',
      margin: 0,
      padding: 0 
    }}>
      <AppHeader />
      
      <main className="flex-1 p-5">
        <h1 className="font-semibold text-2xl mb-4 text-primary">My Favorites</h1>
        <FavoritesList />
      </main>
      
      <BottomNav />
    </div>
  );
}