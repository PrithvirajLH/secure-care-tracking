# Compact Pagination Component

A React + TypeScript pagination component that provides a compact, accessible way to navigate through large datasets. Perfect for replacing overwhelming pagination displays that show all page numbers.

## Features

✅ **Compact Design**: Shows at most 7 numbered buttons total  
✅ **Smart Ellipses**: Uses "..." when there are gaps in page numbers  
✅ **Navigation Buttons**: First, Previous, Next, Last buttons  
✅ **Accessible**: Full ARIA support and keyboard navigation  
✅ **Responsive**: Works on mobile and desktop  
✅ **Customizable**: Configurable options for different use cases  
✅ **TypeScript**: Fully typed with TypeScript  

## Examples

### Basic Usage
```tsx
import { CompactPagination } from '@/components/ui/compact-pagination';

<CompactPagination
  currentPage={52}
  totalPages={150}
  onPageChange={setCurrentPage}
  totalItems={15000}
  itemsPerPage={100}
/>
```

### Without Info Text
```tsx
<CompactPagination
  currentPage={52}
  totalPages={150}
  onPageChange={setCurrentPage}
  showInfo={false}
/>
```

### Without First/Last Buttons
```tsx
<CompactPagination
  currentPage={52}
  totalPages={150}
  onPageChange={setCurrentPage}
  showFirstLast={false}
/>
```

### Custom Max Visible Pages
```tsx
<CompactPagination
  currentPage={52}
  totalPages={150}
  onPageChange={setCurrentPage}
  maxVisible={5}
/>
```

## How It Works

The component intelligently displays page numbers based on the current page position:

### Near Beginning (Page 1-4)
```
[1] [2] [3] [4] [5] ... [150]
```

### In Middle (Page 52)
```
[1] ... [51] [52] [53] ... [150]
```

### Near End (Page 147-150)
```
[1] ... [146] [147] [148] [149] [150]
```

### Small Total (≤7 pages)
```
[1] [2] [3] [4] [5] [6] [7]
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentPage` | `number` | - | Current active page (required) |
| `totalPages` | `number` | - | Total number of pages (required) |
| `onPageChange` | `(page: number) => void` | - | Callback when page changes (required) |
| `className` | `string` | - | Additional CSS classes |
| `showInfo` | `boolean` | `true` | Show "Showing X to Y of Z items" text |
| `totalItems` | `number` | - | Total number of items for info text |
| `itemsPerPage` | `number` | - | Items per page for info text |
| `showFirstLast` | `boolean` | `true` | Show First/Last navigation buttons |
| `maxVisible` | `number` | `7` | Maximum number of page buttons to show |

## Accessibility Features

- **ARIA Labels**: Each button has descriptive aria-label
- **Current Page**: Uses `aria-current="page"` for current page
- **Navigation**: Proper nav element with aria-label
- **Tooltips**: Title attributes for additional context
- **Keyboard**: Full keyboard navigation support
- **Screen Readers**: Ellipses are hidden from screen readers

## Implementation in Your App

### 1. Replace Old Pagination
```tsx
// Before (showing all pages)
{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
  <PaginationItem key={page}>
    <PaginationLink onClick={() => setCurrentPage(page)}>
      {page}
    </PaginationLink>
  </PaginationItem>
))}

// After (compact pagination)
<CompactPagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={setCurrentPage}
  totalItems={totalEmployees}
  itemsPerPage={itemsPerPage}
/>
```

### 2. Update Imports
```tsx
// Remove old pagination imports
// import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

// Add new compact pagination import
import { CompactPagination } from "@/components/ui/compact-pagination";
```

## Files Updated

- ✅ `src/components/ui/compact-pagination.tsx` - New component
- ✅ `src/pages/Employees.tsx` - Updated to use compact pagination
- ✅ `src/pages/Training.tsx` - Updated to use compact pagination
- ✅ `src/components/ui/pagination-demo.tsx` - Demo component

## Benefits

1. **Better UX**: No more overwhelming page numbers
2. **Mobile Friendly**: Compact design works on small screens
3. **Performance**: Fewer DOM elements to render
4. **Accessibility**: Better screen reader support
5. **Consistency**: Same pagination across all pages
6. **Maintainable**: Single component to maintain

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Dependencies

- React 18+
- TypeScript 4.5+
- Tailwind CSS
- Lucide React (for icons)
- @/lib/utils (for cn function)

## Future Enhancements

- [ ] Jump to page input field
- [ ] Page size selector
- [ ] Custom themes/styles
- [ ] Animation transitions
- [ ] RTL language support
