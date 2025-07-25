import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { FavoritesList } from "@/components/favorites-list";

export default function FavoritesPage() {
  return (
    <div 
      className="fixed inset-0 bg-secondary" 
      style={{ 
        overflowY: 'scroll',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        height: '100vh',
        width: '100vw'
      }}
    >
      <AppHeader />
      
      <main className="p-5 pb-32">
        <h1 className="font-semibold text-2xl mb-4 text-primary">My Favorites</h1>
        <FavoritesList />
      </main>
      
      <BottomNav />
    </div>
  );
}