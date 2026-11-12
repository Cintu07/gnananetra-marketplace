"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { ScrollArea } from "@/components/admin/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table";
import { cn } from "@/lib/cn";

export type Column<T> = {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  cell: (row: T) => ReactNode;
  className?: string;
};

const ALIGN = {
  left: "justify-start text-left",
  right: "justify-end text-right tabular-nums",
  center: "justify-center text-center",
} as const;

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  activeKey?: string | null;
  loading?: boolean;
  emptyLabel?: string;
  footer?: ReactNode;
  /** Set false when the table sits directly under a tab strip that already has a divider. */
  topBorder?: boolean;
};

function hasHeader(column: Column<any>) {
  return column.header !== "" && column.header !== null && column.header !== undefined;
}

// Dense data grid. From the `sm` breakpoint up it is a real table: columns size to
// their content and spread across the width, rows share the header's tracks via CSS
// subgrid. On phones the same columns become a stack of cards (first column is the
// title, the rest are label/value pairs, header-less columns such as action buttons
// sit at the bottom), so nothing is hidden behind a sideways scroll.
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  activeKey,
  loading,
  emptyLabel = "Nothing here yet.",
  footer,
  topBorder = true,
}: DataTableProps<T>) {
  const rowClass = "col-span-full grid grid-cols-subgrid";
  const cellBase = "flex items-center";
  const emptyText = loading ? "Loading…" : emptyLabel;

  function onKey(event: KeyboardEvent, row: T) {
    if (!onRowClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick(row);
    }
  }

  const [first, ...rest] = columns;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", topBorder && "border-t border-border")}>
      {/* phones: cards */}
      <ScrollArea className="min-h-0 flex-1 sm:hidden">
        {rows.length === 0 ? (
          <p className="caption-style flex h-[140px] items-center justify-center text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="flex flex-col gap-2 p-3">
            {rows.map((row) => {
              const key = rowKey(row);
              const active = activeKey === key;
              return (
                <li key={key}>
                  <div
                    role={onRowClick ? "button" : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={(event) => onKey(event, row)}
                    data-active={active}
                    className={cn(
                      "rounded-lg border border-border bg-card/60 p-3.5 outline-none transition-colors duration-150 ease-power3-out",
                      onRowClick && "cursor-pointer active:bg-card focus-visible:bg-card",
                      "data-[active=true]:border-line-strong data-[active=true]:bg-card",
                    )}
                  >
                    <div className="min-w-0 break-words text-[14px] font-medium leading-snug">{first.cell(row)}</div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                      {rest.map((column) =>
                        hasHeader(column) ? (
                          <div key={column.key} className="min-w-0">
                            <dt className="caption-style text-subtle">{column.header}</dt>
                            <dd className="mt-1.5 min-w-0 break-words text-[14px] leading-snug">{column.cell(row)}</dd>
                          </div>
                        ) : (
                          <div key={column.key} className="col-span-2 flex justify-end">
                            {column.cell(row)}
                          </div>
                        ),
                      )}
                    </dl>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>

      {/* tablets and up: the grid table */}
      <ScrollArea orientation="both" className="hidden min-h-0 flex-1 sm:block">
        <Table
          role="table"
          className="grid w-full min-w-max justify-between"
          style={{ gridTemplateColumns: `repeat(${columns.length}, max-content)` }}
        >
          <TableHeader role="rowgroup" className="contents">
            <TableRow role="row" className={rowClass}>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  role="columnheader"
                  className={cn(cellBase, ALIGN[column.align ?? "left"], column.className)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody role="rowgroup" className="contents">
            {rows.map((row) => {
              const key = rowKey(row);
              const active = activeKey === key;
              return (
                <TableRow
                  key={key}
                  role="row"
                  tabIndex={onRowClick ? 0 : undefined}
                  data-active={active}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={(event) => onKey(event, row)}
                  className={cn(
                    rowClass,
                    onRowClick && "cursor-pointer outline-none focus-visible:bg-card/60",
                    "hover:bg-card/60 data-[active=true]:border-card data-[active=true]:bg-card",
                  )}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      role="cell"
                      className={cn(cellBase, ALIGN[column.align ?? "left"], column.className)}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow role="row" className={rowClass}>
                <td
                  role="cell"
                  className="caption-style col-span-full flex h-[140px] items-center justify-center text-muted-foreground"
                >
                  {emptyText}
                </td>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
      {footer}
    </div>
  );
}

// The "calculation bar" under a table: a count plus a few live totals.
export function TableFooter({ items }: { items: { label: string; value?: ReactNode }[] }) {
  return (
    <div
      className="caption-style grid shrink-0 grid-cols-2 gap-px border-b border-border bg-background p-px sm:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]"
      style={{ ["--n" as string]: items.length }}
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 p-3 outline outline-1 outline-border">
          {item.value !== undefined && <span className="tabular-nums text-foreground">{item.value}</span>}
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
