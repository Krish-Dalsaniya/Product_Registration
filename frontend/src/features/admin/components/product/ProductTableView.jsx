import React from 'react';
import DataTable from '../../../../components/shared/DataTable';

const ProductTableView = ({ 
  products, 
  loading, 
  pagination, 
  onView, 
  onEdit,
  onDelete,
  onBulkDelete
}) => {
  const columns = [
    // { key: 'product_id', label: 'ID', render: (row) => row.product_id ? String(row.product_id).substring(0, 8) + '...' : '' },
    { key: 'category', label: 'Category' },
    { key: 'product_name', label: 'Product Name' },
    { key: 'stock_quantity', label: 'Stock Units', render: (row) => `${row.stock_quantity || 0} Units` },
    { key: 'created_at', label: 'Registration Date', render: (row) => new Date(row.created_at).toLocaleDateString() }
  ];

  return (
    <DataTable 
      columns={columns} 
      data={products} 
      loading={loading} 
      totalCount={pagination.total} 
      filteredCount={products.length} 
      currentPage={pagination.page} 
      totalPages={Math.ceil(pagination.total / pagination.limit) || 1} 
      onView={onView} 
      onEdit={onEdit} 
      onDelete={onDelete}
      rowKey="product_id"
      enableBulkSelection={true}
      onBulkDelete={onBulkDelete}
    />
  );
};

export default ProductTableView;
