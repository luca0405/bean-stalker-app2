import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";
import { MenuItemOption } from "@shared/schema";

interface OptionGroup {
  id: number;
  name: string;
  optionType?: string;
  options: MenuItemOption[];
}

interface GroupedOptionSelectorProps {
  options: MenuItemOption[];
  onChange: (selectedOptions: Record<string, string>) => void;
  initialSelections?: Record<string, string>;
}

export function GroupedOptionSelector({ options, onChange, initialSelections = {} }: GroupedOptionSelectorProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(initialSelections);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);

  // Organize options into parent-children groups
  useEffect(() => {
    // Find parent options (groups)
    const parents = options.filter(option => option.isParent);
    
    // Create option groups with their children
    const groups: OptionGroup[] = parents.map(parent => {
      return {
        id: parent.id,
        name: parent.name,
        optionType: parent.optionType || 'group',
        options: options.filter(o => !o.isParent && o.parentId === parent.id)
      };
    });

    // Add standalone options that are not in any group
    const standaloneOptions = options.filter(
      option => !option.isParent && !option.parentId
    );

    if (standaloneOptions.length > 0) {
      groups.push({
        id: 0, // Use 0 for standalone options
        name: "Options",
        optionType: 'standalone',
        options: standaloneOptions
      });
    }

    setOptionGroups(groups);
    
    // No longer initializing with defaults - user must explicitly select
    // We'll keep the structure but won't auto-select anything
    
    // Initialize empty selections object
    const newSelections = { ...selectedOptions };
    // We don't force any default selections now
  }, [options, onChange]);

  const handleOptionChange = (groupName: string, value: string) => {
    const newSelections = {
      ...selectedOptions,
      [groupName]: value
    };
    
    setSelectedOptions(newSelections);
    onChange(newSelections);
  };

  // Skip rendering if no option groups
  if (optionGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="max-h-[300px] pr-4 overflow-y-auto">
        <Accordion 
          type="multiple" 
          defaultValue={optionGroups.map(g => g.name)} 
          className="w-full"
        >
          {optionGroups.map((group) => (
            <AccordionItem value={group.name} key={group.id || group.name}>
              <AccordionTrigger className="text-primary font-medium">
                {group.name}
              </AccordionTrigger>
              <AccordionContent>
                <RadioGroup 
                  value={selectedOptions[group.name] || ""}
                  onValueChange={(value) => handleOptionChange(group.name, value)}
                  className="space-y-2"
                >
                  {group.options.map((option) => (
                    <div 
                      key={option.id} 
                      className={`flex items-center space-x-2 rounded-md p-1.5 transition-colors ${
                        selectedOptions[group.name] === option.name 
                          ? 'bg-primary/10 border border-primary/30' 
                          : ''
                      }`}
                    >
                      <RadioGroupItem value={option.name} id={`option-${option.id}`} />
                      <Label htmlFor={`option-${option.id}`} className="flex-1 cursor-pointer">
                        {option.name}
                        {typeof option.priceAdjustment === 'number' && option.priceAdjustment > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            +{formatCurrency(option.priceAdjustment)}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}