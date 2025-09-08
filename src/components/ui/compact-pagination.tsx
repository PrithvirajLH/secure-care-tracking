import React from 'react';
import { Button } from './button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showInfo?: boolean;
  totalItems?: number;
  itemsPerPage?: number;
  showFirstLast?: boolean;
  maxVisible?: number;
}

export function CompactPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showInfo = true,
  totalItems,
  itemsPerPage,
  showFirstLast = true,
  maxVisible = 7
}: CompactPaginationProps) {
  if (totalPages <= 1) return null;

  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 4) {
        // Near the beginning: [1, 2, 3, 4, 5, ..., totalPages]
        for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
          pages.push(i);
        }
        if (totalPages > 5) {
          pages.push('...');
        }
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Near the end: [1, ..., totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages]
        pages.push('...');
        for (let i = Math.max(2, totalPages - 4); i <= totalPages - 1; i++) {
          pages.push(i);
        }
        pages.push(totalPages);
      } else {
        // In the middle: [1, ..., currentPage-1, currentPage, currentPage+1, ..., totalPages]
        pages.push('...');
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(currentPage + 1, totalPages - 1); i++) {
          pages.push(i);
        }
        if (currentPage + 1 < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = generatePageNumbers();

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const startItem = totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : undefined;
  const endItem = totalItems && itemsPerPage ? Math.min(currentPage * itemsPerPage, totalItems) : undefined;

  return (
    <nav className={cn("flex flex-col sm:flex-row items-center justify-between gap-4", className)} aria-label="Pagination navigation">
      {/* Page Info */}
      {showInfo && totalItems && itemsPerPage && (
        <div className="text-sm text-gray-600">
          Showing {startItem} to {endItem} of {totalItems} employees
        </div>
      )}
      
      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        {showFirstLast && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="px-2 py-1 h-8 w-8"
            aria-label="Go to first page"
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}
        
        {/* Previous Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2 py-1 h-8 w-8"
          aria-label="Go to previous page"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {/* Page Numbers */}
        {pageNumbers.map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="px-2 py-1 text-gray-500 select-none" aria-hidden="true">...</span>
            ) : (
              <Button
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page as number)}
                className="px-3 py-1 h-8 min-w-[32px]"
                aria-label={`Go to page ${page}`}
                aria-current={currentPage === page ? "page" : undefined}
                title={`Page ${page}`}
              >
                {page}
              </Button>
            )}
          </React.Fragment>
        ))}
        
        {/* Next Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2 py-1 h-8 w-8"
          aria-label="Go to next page"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {/* Last Page */}
        {showFirstLast && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 h-8 w-8"
            aria-label="Go to last page"
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </nav>
  );
}
