import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

// Helper function to get initials from username
function getUserInitials(username: string | undefined): string {
  // Default to SB if no username
  if (!username) return "SB";
  
  // Check if username has a name format (first and last name)
  const nameParts = username.split(/[\s_-]/);
  
  if (nameParts.length > 1) {
    // If there are multiple parts, use first letter of first and first letter of last name
    return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
  } else if (username.length >= 2) {
    // If just one name, use first two letters
    return username.substring(0, 2).toUpperCase();
  } else if (username.length === 1) {
    // If only one character, duplicate it
    return (username[0] + username[0]).toUpperCase();
  }
  
  // Fallback
  return "SB";
}

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const { user } = useAuth();
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };
  
  // Get initials from username
  const initials = getUserInitials(user?.username);

  return (
    <div className={cn("bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center", sizeClasses[size], className)}>
      <span className="text-white font-semibold text-xl">{initials}</span>
    </div>
  );
}

export function LogoWithText() {
  const { user } = useAuth();
  
  // Get initials from username
  const initials = getUserInitials(user?.username);
  
  return (
    <div className="flex flex-col items-center">
      <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
        <span className="text-white font-semibold text-3xl">{initials}</span>
      </div>
      <h1 className="mt-4 text-2xl font-semibold text-center tracking-wide text-primary">BEAN STALKER</h1>
    </div>
  );
}

export function MagnifyingGlassLogo() {
  return (
    <svg className="w-20 h-20 text-primary" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="35" r="25" stroke="currentColor" strokeWidth="5"/>
      <path d="M60 28 L70 20" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
      <path d="M50 60 L50 85" stroke="currentColor" strokeWidth="5"/>
      <path d="M35 75 L65 75 L65 85 L35 85 Z" stroke="currentColor" strokeWidth="5"/>
    </svg>
  );
}
