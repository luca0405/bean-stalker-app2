import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryFilter({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: CategoryFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <ScrollArea className="w-full whitespace-nowrap mb-6">
      <div className="flex space-x-2 py-4" ref={scrollRef}>
        <Badge
          variant={selectedCategory === "all" ? "selectedCategory" : "unselectedCategory"}
          className="cursor-pointer px-4 py-2 text-sm rounded-full"
          onClick={() => onSelectCategory("all")}
        >
          All
        </Badge>
        
        {categories.map((category) => (
          <Badge
            key={category}
            variant={selectedCategory === category ? "selectedCategory" : "unselectedCategory"}
            className="cursor-pointer px-4 py-2 text-sm rounded-full"
            onClick={() => onSelectCategory(category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ')}
          </Badge>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
