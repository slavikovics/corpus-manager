import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./DataTable";
import { useState } from "react";
type ExampleData = {
  id: number;
  name: string;
  email: string;
  status: string;
};
const columns: ColumnDef<ExampleData>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: "Имя",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "status",
    header: "Статус",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <span className={`px-2 py-1 rounded-full text-xs ${
          status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {status}
        </span>
      );
    },
  },
];
const mockData: ExampleData[] = [
  { id: 1, name: "Иван Петров", email: "ivan@example.com", status: "active" },
  { id: 2, name: "Мария Сидорова", email: "maria@example.com", status: "inactive" },
  { id: 3, name: "Алексей Иванов", email: "alex@example.com", status: "active" },
];
export function DataTableExample() {
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
  });
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };
  const handlePageSizeChange = (size: number) => {
    setPagination({ currentPage: 1, pageSize: size });
  };
  const handleRowClick = (row: ExampleData) => {
    console.log("Клик по строке:", row);
  };
  return (
    <div className="container mx-auto py-10">
      <DataTable
        columns={columns}
        data={mockData}
        totalCount={100} 
        pagination={{
          type: "page",
          currentPage: pagination.currentPage,
          pageSize: pagination.pageSize,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        loading={false}
        error={null}
        onRowClick={handleRowClick}
      />
    </div>
  );
}