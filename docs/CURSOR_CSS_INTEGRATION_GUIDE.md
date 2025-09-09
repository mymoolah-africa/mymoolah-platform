# MyMoolah Admin Portal - Cursor CSS Integration Guide

## Overview
This guide provides Cursor AI with the centralized CSS system for consistent styling across all MyMoolah admin overlay components. All components now use CSS custom properties and utility classes instead of inline styles.

---

## **Centralized CSS Classes Available**

### **Loading States**
```css
.admin-loading              /* Full screen loading container */
.admin-loading-content      /* Centered loading content */
.admin-loading-icon         /* Animated gradient loading icon */
```

### **Layout Components**
```css
.admin-header               /* Consistent header for all admin pages */
.admin-container            /* Max-width container with proper padding */
.admin-stats-card           /* Statistics card with hover effects */
.admin-gradient-icon        /* Gradient icon background */
```

### **Typography Classes**
```css
.admin-text-heading         /* Main headings - responsive clamp sizing */
.admin-text-subheading      /* Page subtitles and descriptions */
.admin-text-body            /* Body text and standard content */
.admin-text-small           /* Small text for secondary info */
.admin-text-label           /* Form labels and data labels */
```

### **Spacing Utilities**
```css
.mymoolah-spacing-xs        /* gap: 0.25rem */
.mymoolah-spacing-sm        /* gap: 0.5rem */
.mymoolah-spacing-md        /* gap: 1rem */
.mymoolah-spacing-lg        /* gap: 1.5rem */
.mymoolah-spacing-xl        /* gap: 2rem */
```

### **Card System**
```css
.mymoolah-card              /* Standard card with border and shadow */
.mymoolah-card-elevated     /* Elevated card for important content */
```

### **Button System**
```css
.mymoolah-btn-primary       /* Gradient primary button */
.mymoolah-btn-secondary     /* Outlined secondary button */
```

### **Background Utilities**
```css
.bg-mymoolah-primary        /* White background */
.bg-mymoolah-secondary      /* Light secondary background */
.bg-mymoolah-tertiary       /* Input background */
.bg-mymoolah-gradient       /* Brand gradient background */
```

### **Text Color Utilities**
```css
.text-mymoolah-green        /* Brand green color */
.text-mymoolah-blue         /* Brand blue color */
.text-success               /* Success green */
.text-error                 /* Error red */
.text-warning               /* Warning orange */
.text-gray                  /* Secondary gray text */
```

---

## **Standard Admin Component Structure**

### **1. Loading State Pattern**
```tsx
if (isLoading) {
  return (
    <div className="admin-loading">
      <div className="admin-loading-content">
        <div className="admin-loading-icon">
          <IconComponent className="w-6 h-6 animate-pulse text-white" />
        </div>
        <p className="admin-text-body">
          Loading [component name]...
        </p>
      </div>
    </div>
  );
}
```

### **2. Header Pattern**
```tsx
<header className="admin-header">
  <div className="admin-container flex items-center justify-between">
    <div className="flex items-center mymoolah-spacing-md">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/admin/dashboard')}
        className="flex items-center gap-2"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="admin-text-body">
          Back to Dashboard
        </span>
      </Button>
      
      <div className="admin-gradient-icon w-10 h-10">
        <IconComponent className="w-6 h-6 text-white" />
      </div>
      <div>
        <h1 className="admin-text-heading">
          Page Title
        </h1>
        <p className="admin-text-subheading">
          Page description
        </p>
      </div>
    </div>

    <div className="flex items-center mymoolah-spacing-md">
      <Button className="mymoolah-btn-primary">
        <Plus className="w-4 h-4 mr-2" />
        Primary Action
      </Button>
    </div>
  </div>
</header>
```

### **3. Main Content Pattern**
```tsx
<main className="admin-container">
  {/* Stats Cards */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mymoolah-spacing-lg mb-8">
    <div className="admin-stats-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="admin-text-label mb-1">
            Metric Label
          </p>
          <p className="admin-text-heading">
            Metric Value
          </p>
        </div>
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <IconComponent className="w-6 h-6 text-mymoolah-blue" />
        </div>
      </div>
    </div>
  </div>

  {/* Filters Card */}
  <div className="mymoolah-card mb-6">
    <div className="mobile-padding">
      <div className="flex flex-col lg:flex-row mymoolah-spacing-md">
        {/* Filter content */}
      </div>
    </div>
  </div>

  {/* Data Table */}
  <div className="mymoolah-card">
    <div className="mobile-padding border-b border-gray-medium">
      <div className="flex items-center justify-between">
        <h2 className="admin-text-heading text-lg">
          Table Title
        </h2>
        <div className="flex items-center mymoolah-spacing-sm">
          {/* Action buttons */}
        </div>
      </div>
    </div>
    <div className="mobile-padding">
      {/* Table content */}
    </div>
  </div>
</main>
```

### **4. Typography in Tables**
```tsx
<TableHeader>
  <TableRow>
    <TableHead className="admin-text-body">Column Name</TableHead>
  </TableRow>
</TableHeader>
<TableBody>
  <TableRow>
    <TableCell>
      <p className="admin-text-body font-medium">
        Primary text
      </p>
      <p className="admin-text-small">
        Secondary text
      </p>
    </TableCell>
  </TableRow>
</TableBody>
```

### **5. Dialog Content Pattern**
```tsx
<DialogHeader>
  <DialogTitle className="admin-text-heading">
    Dialog Title
  </DialogTitle>
</DialogHeader>

<CardHeader>
  <CardTitle className="admin-text-heading text-base">
    Section Title
  </CardTitle>
</CardHeader>
<CardContent className="mymoolah-spacing-sm">
  <div>
    <Label className="admin-text-label">
      Field Label
    </Label>
    <p className="admin-text-body font-medium">
      Field Value
    </p>
  </div>
</CardContent>
```

---

## **CSS Custom Properties Available**

### **MyMoolah Brand Colors**
```css
--mymoolah-green: #86BE41
--mymoolah-blue: #2D8CCA
--mymoolah-green-light: #9AD154
--mymoolah-blue-light: #4A9FD9
--mymoolah-green-dark: #7AB139
--mymoolah-blue-dark: #2680B8
```

### **Strategic Colors**
```css
--success-color: #16a34a
--error-color: #dc2626
--warning-color: #f59e0b
--info-color: var(--mymoolah-blue)
--gray-text: #6b7280
--gray-light: #f8fafc
--gray-medium: #e2e8f0
```

### **Background System**
```css
--background-primary: #ffffff      /* Main pages */
--background-secondary: #f8fafe    /* Elevated cards */
--background-tertiary: #f1f5f9     /* Input backgrounds */
--background-hero: linear-gradient(135deg, var(--mymoolah-green) 0%, var(--mymoolah-blue) 100%)
```

### **Mobile-First Tokens**
```css
--mobile-max-width: 375px
--mobile-padding: 1rem
--mobile-font-base: 14px
--mobile-font-small: 12px
--mobile-touch-target: 44px
--mobile-border-radius: 12px
--mobile-shadow: 0 2px 8px rgba(0, 0, 0, 0.1)
```

### **Font Weights**
```css
--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-bold: 700
```

### **Spacing Scale**
```css
--space-xs: 0.25rem
--space-sm: 0.5rem
--space-md: 1rem
--space-lg: 1.5rem
--space-xl: 2rem
```

---

## **Migration Rules for Cursor**

### **❌ REPLACE inline styles:**
```tsx
// OLD - Don't use
style={{
  fontFamily: 'Montserrat, sans-serif',
  fontSize: '24px',
  fontWeight: '700',
  color: '#111827'
}}

// NEW - Use this instead
className="admin-text-heading"
```

### **❌ REPLACE hardcoded colors:**
```tsx
// OLD - Don't use
className="text-[#00BFA5]"
style={{ color: '#86BE41' }}

// NEW - Use this instead
className="text-mymoolah-green"
```

### **❌ REPLACE hardcoded backgrounds:**
```tsx
// OLD - Don't use
className="bg-gradient-to-r from-[#00BFA5] to-[#1976D2]"

// NEW - Use this instead
className="admin-gradient-icon"
```

### **❌ REPLACE manual spacing:**
```tsx
// OLD - Don't use
className="gap-4"

// NEW - Use this instead
className="mymoolah-spacing-md"
```

### **❌ REPLACE card styling:**
```tsx
// OLD - Don't use
<Card className="bg-white border border-gray-200 shadow-md">

// NEW - Use this instead
<div className="mymoolah-card">
```

### **✅ ALWAYS use these patterns:**

1. **Font family override**: All text elements should use the admin typography classes
2. **Color consistency**: Use CSS custom properties and utility classes
3. **Spacing system**: Use the mymoolah-spacing-* classes
4. **Component structure**: Follow the standard patterns above
5. **Mobile-first**: All layouts should be responsive using the mobile tokens

---

## **Icon Color Reference**

### **Portal Type Icons**
```tsx
// Admin Portal
<Settings className="w-4 h-4 text-mymoolah-blue" />

// Supplier Portal  
<Building className="w-4 h-4 text-mymoolah-green" />

// Client Portal
<Users className="w-4 h-4 text-mymoolah-blue" />

// Merchant Portal
<Store className="w-4 h-4" style={{ color: '#7B1FA2' }} />

// Reseller Portal
<Briefcase className="w-4 h-4 text-orange-500" />
```

### **Status Icons**
```tsx
// Success/Active
<CheckCircle className="w-4 h-4 text-success" />

// Warning/Pending
<AlertTriangle className="w-4 h-4 text-warning" />

// Error/Critical
<AlertCircle className="w-4 h-4 text-error" />

// Info/Processing
<Clock className="w-4 h-4 text-mymoolah-blue" />
```

---

## **Performance Notes**

1. **CSS Custom Properties**: Always preferred over inline styles for better performance
2. **Utility Classes**: Pre-compiled Tailwind classes load faster than inline styles
3. **Font Loading**: Montserrat is pre-loaded in globals.css for optimal performance
4. **Responsive Design**: Mobile-first approach with proper scaling for low-cost Android devices
5. **Animation**: Reduced motion support built-in for accessibility

---

## **Implementation Checklist for Cursor**

- [ ] Replace all inline `style` attributes with CSS classes
- [ ] Use `admin-text-*` classes for all typography
- [ ] Use `mymoolah-spacing-*` for consistent gaps
- [ ] Use `admin-gradient-icon` for brand icon backgrounds
- [ ] Use `mymoolah-card` for all card containers
- [ ] Use `admin-container` for page-level content width
- [ ] Use `admin-header` for consistent page headers
- [ ] Use color utility classes instead of hardcoded colors
- [ ] Follow the standard component structure patterns
- [ ] Test responsiveness with mobile-first approach

This system ensures all admin components have consistent styling while being easy for Cursor to implement and maintain.