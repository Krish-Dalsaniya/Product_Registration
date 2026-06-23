import React from 'react';
import DataTable from '../../components/shared/DataTable';

const CustomerTable = ({ data, loading, onView, onEdit, onDelete }) => {
  const columns = [
    { key: 'customer_code', label: 'Code' },
    { key: 'customer_name', label: 'Customer Name' },
    { key: 'company_name', label: 'Company' },
    { key: 'company_type', label: 'Type' },
    { key: 'product', label: 'Product', render: (row) => row.product || 'N/A' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${row.status === 'Active'
          ? 'bg-emerald-500/10 text-emerald-500'
          : 'bg-rose-500/10 text-rose-500'
          }`}>
          {row.status}
        </span>
      )
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      rowKey="customer_id"
    />
  );
};

export default CustomerTable;
