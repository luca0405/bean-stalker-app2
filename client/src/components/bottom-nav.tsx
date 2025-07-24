import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { HomeIcon, OrdersIcon, ProfileIcon, SettingsIcon } from "@/components/icons";
import { Heart, Coffee } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface NavItem {
  icon: typeof HomeIcon | typeof Heart;
  label: string;
  href: string;
}

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Base navigation items for all users
  const navItems: NavItem[] = [
    {
      icon: HomeIcon,
      label: "Home",
      href: "/",
    },
    {
      icon: Coffee,
      label: "Menu",
      href: "/menu",
    },
    {
      icon: Heart,
      label: "Favorites",
      href: "/favorites",
    },
    {
      icon: OrdersIcon,
      label: "Orders",
      href: "/orders",
    },
    {
      icon: ProfileIcon,
      label: "Profile",
      href: "/profile",
    },
  ];
  
  // Add admin link if user has admin privileges
  if (user?.isAdmin) {
    navItems.push({
      icon: SettingsIcon,
      label: "Admin",
      href: "/admin",
    });
  }

  return (
    <div 
      className="fixed left-1/2 z-[9999]" 
      style={{ 
        position: 'fixed',
        bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        pointerEvents: 'auto'
      }}
    >
      <nav className="bg-green-800 backdrop-blur-xl border border-green-700/50 rounded-full shadow-2xl px-4 py-2">
        <div className="flex items-center space-x-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a className={cn(
                  "flex items-center justify-center p-3 rounded-full transition-all duration-300 relative group",
                  isActive 
                    ? "bg-white shadow-lg transform scale-105" 
                    : "hover:bg-green-700/50 hover:scale-105"
                )}>
                  
                  <item.icon
                    className={cn(
                      "h-6 w-6 transition-all duration-300",
                      isActive ? "text-green-600" : "text-white group-hover:text-green-100"
                    )}
                  />
                </a>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
