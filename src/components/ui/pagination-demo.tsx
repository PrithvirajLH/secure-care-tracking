import React, { useState } from 'react';
import { CompactPagination } from './compact-pagination';
import { Card, CardContent, CardHeader, CardTitle } from './card';

export function PaginationDemo() {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPage2, setCurrentPage2] = useState(52);
  const [currentPage3, setCurrentPage3] = useState(150);

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">Compact Pagination Component Demo</h2>
      
      {/* Small pagination (7 pages or less) */}
      <Card>
        <CardHeader>
          <CardTitle>Small Pagination (7 pages)</CardTitle>
        </CardHeader>
        <CardContent>
          <CompactPagination
            currentPage={currentPage}
            totalPages={7}
            onPageChange={setCurrentPage}
            totalItems={700}
            itemsPerPage={100}
          />
        </CardContent>
      </Card>

      {/* Medium pagination (near beginning) */}
      <Card>
        <CardHeader>
          <CardTitle>Medium Pagination - Near Beginning (Page 1 of 150)</CardTitle>
        </CardHeader>
        <CardContent>
          <CompactPagination
            currentPage={1}
            totalPages={150}
            onPageChange={setCurrentPage}
            totalItems={15000}
            itemsPerPage={100}
          />
        </CardContent>
      </Card>

      {/* Medium pagination (middle) */}
      <Card>
        <CardHeader>
          <CardTitle>Medium Pagination - Middle (Page 52 of 150)</CardTitle>
        </CardHeader>
        <CardContent>
          <CompactPagination
            currentPage={currentPage2}
            totalPages={150}
            onPageChange={setCurrentPage2}
            totalItems={15000}
            itemsPerPage={100}
          />
        </CardContent>
      </Card>

      {/* Medium pagination (near end) */}
      <Card>
        <CardHeader>
          <CardTitle>Medium Pagination - Near End (Page 150 of 150)</CardTitle>
        </CardHeader>
        <CardContent>
          <CompactPagination
            currentPage={currentPage3}
            totalPages={150}
            onPageChange={setCurrentPage3}
            totalItems={15000}
            itemsPerPage={100}
          />
        </CardContent>
      </Card>

      {/* Without First/Last buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Without First/Last Buttons</CardTitle>
        </CardHeader>
        <CardContent>
          <CompactPagination
            currentPage={52}
            totalPages={150}
            onPageChange={setCurrentPage2}
            totalItems={15000}
            itemsPerPage={100}
            showFirstLast={false}
          />
        </CardContent>
      </Card>

      {/* Without info text */}
      <Card>
        <CardHeader>
          <CardTitle>Without Info Text</CardTitle>
        </CardHeader>
        <CardContent>
          <CompactPagination
            currentPage={52}
            totalPages={150}
            onPageChange={setCurrentPage2}
            totalItems={15000}
            itemsPerPage={100}
            showInfo={false}
          />
        </CardContent>
      </Card>

      {/* Custom max visible */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Max Visible (5 pages)</CardTitle>
        </CardHeader>
        <CardContent>
          <CompactPagination
            currentPage={52}
            totalPages={150}
            onPageChange={setCurrentPage2}
            totalItems={15000}
            itemsPerPage={100}
            maxVisible={5}
          />
        </CardContent>
      </Card>
    </div>
  );
}
