# Figma AI Agent Instructions: Digital Vouchers Overlay Page

## Project Context
**Project:** MyMoolah Treasury Platform  
**Version:** 2.2.0 - Supplier Pricing Framework  
**Date:** August 29, 2025  
**Target:** Create a new overlay page for Digital Vouchers management

## Page Requirements

### 1. Page Information
- **Page Name:** DigitalVouchersOverlay.tsx
- **Route:** `/digital-vouchers`
- **Location:** `/mymoolah-wallet-frontend/components/overlays/digital-vouchers/DigitalVouchersOverlay.tsx`
- **Navigation:** Accessible from TransactPage "Vouchers & Digital Services" section

### 2. Design Requirements

#### Layout Structure
- **Header Section:**
  - Back arrow (left-aligned) - navigates to TransactPage
  - "Digital Vouchers" title (center)
  - Search icon (right-aligned) - opens search functionality

- **Search & Filter Section:**
  - Search bar with placeholder "Search vouchers..."
  - Filter chips: "All", "Gaming", "Entertainment", "Transport", "Shopping"
  - Clear filters option

- **Featured Vouchers Grid:**
  - 12 featured voucher cards in a responsive grid (3 columns on desktop, 2 on tablet, 1 on mobile)
  - Each card shows: Brand logo, Brand name, Price range, "Buy Now" button
  - Featured vouchers (in order):
    1. MMVoucher (MyMoolah's own voucher)
    2. 1Voucher
    3. OTT
    4. Betway
    5. HollywoodBets
    6. YesPlay
    7. DStv
    8. Netflix
    9. Fifa Mobile
    10. Intercape
    11. Tenacity
    12. Google Play

- **View All Section:**
  - "View All Vouchers" button (full width)
  - Opens expanded catalog with search and pagination

#### Voucher Card Design
- **Card Size:** Consistent with existing overlay cards
- **Content:**
  - Brand logo/icon (top)
  - Brand name (prominent)
  - Price range (e.g., "R10 - R500")
  - "Buy Now" button (primary action)
  - Subtle hover effects

#### Product Detail Modal
- **Trigger:** Clicking "Buy Now" on any voucher card
- **Content:**
  - Brand logo and name
  - Denomination selection (radio buttons or dropdown)
  - Recipient section (optional):
    - Email input field
    - SMS input field
    - "Send to myself" checkbox
  - Summary section:
    - Selected denomination
    - Total amount
    - Terms & conditions link
  - Action buttons:
    - "Cancel" (secondary)
    - "Purchase" (primary)

### 3. Technical Requirements

#### Component Structure
```typescript
// Main overlay component
DigitalVouchersOverlay.tsx

// Sub-components (create as needed)
- VoucherCard.tsx
- VoucherSearch.tsx
- VoucherFilters.tsx
- ProductDetailModal.tsx
- DenominationSelector.tsx
- RecipientForm.tsx
```

#### State Management
- Search query state
- Active filters state
- Selected voucher state
- Modal open/close state
- Loading states for API calls

#### API Integration Points
- **Catalog API:** `/api/v1/voucher-catalog` (GET)
- **Search API:** `/api/v1/voucher-catalog/search` (GET)
- **Purchase API:** `/api/v1/vouchers/purchase` (POST)

#### Responsive Design
- **Mobile:** Single column layout, full-width cards
- **Tablet:** Two-column grid
- **Desktop:** Three-column grid
- **Breakpoints:** Follow existing overlay patterns

### 4. Design System Compliance

#### Colors
- Use existing MyMoolah color palette
- Primary: Blue (#3B82F6)
- Secondary: Gray (#6B7280)
- Success: Green (#10B981)
- Error: Red (#EF4444)
- Background: White (#FFFFFF)
- Card background: Light gray (#F9FAFB)

#### Typography
- Headers: Inter, semi-bold
- Body text: Inter, regular
- Button text: Inter, medium

#### Spacing
- Follow 8px grid system
- Card padding: 16px
- Section margins: 24px
- Button padding: 12px 24px

#### Icons
- Use Lucide React icons
- Search: `Search`
- Back: `ArrowLeft`
- Filter: `Filter`
- Close: `X`

### 5. Accessibility Requirements
- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader compatibility
- Focus management for modals
- Color contrast compliance (WCAG AA)

### 6. Animation & Interactions
- Smooth transitions for modal open/close
- Hover effects on cards
- Loading states with skeletons
- Error states with retry options
- Success feedback for purchases

### 7. Error Handling
- Network error states
- Empty search results
- Purchase failure handling
- Validation error display

### 8. Integration Notes
- This overlay will be integrated with the existing TransactPage
- Bottom navigation should remain visible
- Back navigation should return to TransactPage
- All API calls should use existing authentication patterns

### 9. File Structure
```
/mymoolah-wallet-frontend/components/overlays/digital-vouchers/
├── DigitalVouchersOverlay.tsx
├── VoucherCard.tsx
├── VoucherSearch.tsx
├── VoucherFilters.tsx
├── ProductDetailModal.tsx
├── DenominationSelector.tsx
├── RecipientForm.tsx
└── index.ts
```

### 10. Testing Considerations
- Search functionality
- Filter application
- Modal interactions
- Purchase flow
- Responsive behavior
- Accessibility compliance

## Implementation Priority
1. Create the main overlay structure
2. Implement the featured vouchers grid
3. Add search and filter functionality
4. Create the product detail modal
5. Integrate with backend APIs
6. Add error handling and loading states
7. Ensure responsive design
8. Test accessibility compliance

## Notes for Figma AI Agent
- Follow the existing overlay patterns from AirtimeDataOverlay, ElectricityOverlay, etc.
- Maintain consistency with MyMoolah's design language
- Ensure the page feels like a natural part of the existing platform
- Focus on user experience and ease of use
- Consider the mobile-first approach
- Implement proper loading and error states
- Ensure all interactive elements are properly accessible

## Success Criteria
- Users can easily browse featured vouchers
- Search and filter functionality works intuitively
- Purchase flow is clear and straightforward
- Page integrates seamlessly with existing platform
- Responsive design works across all devices
- Accessibility standards are met
- Performance is optimized for smooth interactions
