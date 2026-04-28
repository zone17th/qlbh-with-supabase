import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable } from "./DataTable";

type Row = {
  id: number;
  name: string;
  total: number;
};

const columns = [
  { key: "name", header: "Tên", cell: (row: Row) => row.name },
  { key: "total", header: "Tổng", cell: (row: Row) => row.total.toString() },
];

describe("DataTable", () => {
  it("renders a loading state", () => {
    render(<DataTable<Row> columns={columns} rows={[]} loading />);

    expect(screen.getByText("Đang tải...")).toBeInTheDocument();
  });

  it("renders an empty state", () => {
    render(<DataTable<Row> columns={columns} rows={[]} emptyText="Chưa có dòng nào" />);

    expect(screen.getByText("Chưa có dòng nào")).toBeInTheDocument();
  });

  it("renders rows with column headers", () => {
    render(
      <DataTable<Row>
        columns={columns}
        rows={[{ id: 1, name: "Đơn hàng A", total: 120000 }]}
        getRowKey={(row) => row.id}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Tên" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tổng" })).toBeInTheDocument();
    expect(screen.getByText("Đơn hàng A")).toBeInTheDocument();
    expect(screen.getByText("120000")).toBeInTheDocument();
  });
});
