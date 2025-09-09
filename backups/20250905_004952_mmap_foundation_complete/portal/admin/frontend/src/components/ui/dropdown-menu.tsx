import React from 'react';
import { cn } from '../../lib/utils';

interface DropdownMenuProps extends React.HTMLAttributes<HTMLDivElement> {}

const DropdownMenu = React.forwardRef<HTMLDivElement, DropdownMenuProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative inline-block text-left', className)}
        {...props}
      />
    );
  }
);
DropdownMenu.displayName = 'DropdownMenu';

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ className, asChild, ...props }, ref) => {
    if (asChild) {
      // When asChild is true, we expect a single child element
      const child = React.Children.only(props.children) as React.ReactElement;
      return React.cloneElement(child, {
        ref,
        className: cn('', className, child.props.className),
        ...props,
        ...child.props,
      });
    }
    
    return (
      <button
        ref={ref}
        className={cn('', className)}
        {...props}
      />
    );
  }
);
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
          className
        )}
        {...props}
      />
    );
  }
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className, asChild, ...props }, ref) => {
    if (asChild) {
      // When asChild is true, we expect a single child element
      const child = React.Children.only(props.children) as React.ReactElement;
      return React.cloneElement(child, {
        ref,
        className: cn(
          'block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100',
          className,
          child.props.className
        ),
        ...props,
        ...child.props,
      });
    }
    
    return (
      <button
        ref={ref}
        className={cn(
          'block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100',
          className
        )}
        {...props}
      />
    );
  }
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem };
