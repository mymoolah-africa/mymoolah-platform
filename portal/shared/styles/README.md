# MyMoolah Portal - Centralized CSS System

## Overview
This directory contains the centralized CSS system for all MyMoolah portals (Admin, Supplier, Client, Merchant, Reseller). The system is based on the CURSOR_CSS_INTEGRATION_GUIDE.md and provides consistent styling across all portal components.

## Files

### `globals.css`
The main CSS file containing:
- CSS custom properties (brand colors, spacing, typography)
- Base styles and font loading
- Loading states
- Layout components
- Typography classes
- Spacing utilities
- Card system
- Button system
- Background utilities
- Text color utilities
- Mobile-first responsive design
- Accessibility features

### `portal-config.css`
Portal-specific configurations and overrides:
- Portal-specific header styles
- Navigation styles
- Form styles
- Table styles
- Modal styles
- Status indicators
- Loading states
- Responsive utilities
- Print styles

## Usage

### Import in Portal Applications
```css
/* In your portal's main CSS file */
@import '../shared/styles/portal-config.css';
```

### Available Classes

#### Typography
- `.admin-text-heading` - Main headings with responsive clamp sizing
- `.admin-text-subheading` - Page subtitles and descriptions
- `.admin-text-body` - Body text and standard content
- `.admin-text-small` - Small text for secondary info
- `.admin-text-label` - Form labels and data labels

#### Layout
- `.admin-header` - Consistent header for all admin pages
- `.admin-container` - Max-width container with proper padding
- `.admin-stats-card` - Statistics card with hover effects
- `.admin-gradient-icon` - Gradient icon background

#### Spacing
- `.mymoolah-spacing-xs` - gap: 0.25rem
- `.mymoolah-spacing-sm` - gap: 0.5rem
- `.mymoolah-spacing-md` - gap: 1rem
- `.mymoolah-spacing-lg` - gap: 1.5rem
- `.mymoolah-spacing-xl` - gap: 2rem

#### Cards
- `.mymoolah-card` - Standard card with border and shadow
- `.mymoolah-card-elevated` - Elevated card for important content

#### Buttons
- `.mymoolah-btn-primary` - Gradient primary button
- `.mymoolah-btn-secondary` - Outlined secondary button

#### Colors
- `.text-mymoolah-green` - Brand green color
- `.text-mymoolah-blue` - Brand blue color
- `.text-success` - Success green
- `.text-error` - Error red
- `.text-warning` - Warning orange
- `.text-gray` - Secondary gray text

## CSS Custom Properties

### Brand Colors
```css
--mymoolah-green: #86BE41
--mymoolah-blue: #2D8CCA
--mymoolah-green-light: #9AD154
--mymoolah-blue-light: #4A9FD9
--mymoolah-green-dark: #7AB139
--mymoolah-blue-dark: #2680B8
```

### Strategic Colors
```css
--success-color: #16a34a
--error-color: #dc2626
--warning-color: #f59e0b
--info-color: var(--mymoolah-blue)
--gray-text: #6b7280
--gray-light: #f8fafc
--gray-medium: #e2e8f0
```

### Background System
```css
--background-primary: #ffffff
--background-secondary: #f8fafe
--background-tertiary: #f1f5f9
--background-hero: linear-gradient(135deg, var(--mymoolah-green) 0%, var(--mymoolah-blue) 100%)
```

## Migration from Wallet Classes

The system includes temporary bridge classes to ease migration:
- `.wallet-card` → `.mymoolah-card`
- `.wallet-btn-primary` → `.mymoolah-btn-primary`
- `.wallet-form-label` → `.admin-text-label`

## Best Practices

1. **Use CSS classes instead of inline styles**
2. **Follow the standard component structure patterns**
3. **Use mobile-first responsive design**
4. **Leverage CSS custom properties for consistency**
5. **Test with reduced motion preferences**
6. **Ensure proper contrast ratios for accessibility**

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS custom properties support required
- Mobile-first responsive design
- Reduced motion support for accessibility

## Performance

- Font pre-loading for optimal performance
- CSS custom properties for better performance than inline styles
- Utility classes pre-compiled for faster loading
- Mobile-optimized for low-cost Android devices

## Future Plans

This CSS system will eventually be extended to the wallet frontend, but for now it's focused on portal applications only. The system is designed to be easily extensible and maintainable.
