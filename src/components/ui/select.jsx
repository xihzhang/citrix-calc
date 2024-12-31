import * as SelectPrimitive from "@radix-ui/react-select";

export const Select = SelectPrimitive.Root;

export const SelectTrigger = ({ className = "", children, ...props }) => (
  <SelectPrimitive.Trigger
    className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  >
    {children}
  </SelectPrimitive.Trigger>
);

export const SelectContent = ({ className = "", ...props }) => (
  <SelectPrimitive.Content
    className={`relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80 ${className}`}
    {...props}
  />
);

export const SelectItem = ({ className = "", ...props }) => (
  <SelectPrimitive.Item
    className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className}`}
    {...props}
  />
);

export const SelectValue = SelectPrimitive.Value;