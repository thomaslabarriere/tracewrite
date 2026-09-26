"use client";

import { useMemo, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { EvidenceSpan, SupportStatus, Verification } from "@/core/types";

interface Props {
  verifications: Verification[];
  onPickEvidence: (evidence: EvidenceSpan) => void;
}

const STATUS_LABEL: Record<SupportStatus, string> = {
  supported: "✓ supported",
  weak: "⚠️ weak",
  unsupported: "✗ no support",
};

const columnHelper = createColumnHelper<Verification>();

export default function VerificationTable({ verifications, onPickEvidence }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | SupportStatus>("all");
  const parentRef = useRef<HTMLDivElement | null>(null);

  const columns = useMemo(
    () => [
      columnHelper.accessor((v) => v.claim.text, {
        id: "claim",
        header: "Claim",
        cell: (info) => <span>{info.getValue()}</span>,
        enableSorting: true,
      }),
      columnHelper.accessor((v) => v.bestSourceId ?? "", {
        id: "source",
        header: "Source",
        size: 90,
        cell: (info) => {
          const v = info.row.original;
          if (!v.evidence) return <span className="trace">n/a</span>;
          return (
            <button
              className="src-link"
              onClick={() => onPickEvidence(v.evidence!)}
              aria-label={`Show evidence for this claim in source ${v.bestSourceId}`}
            >
              {v.bestSourceId}
            </button>
          );
        },
      }),
      columnHelper.accessor((v) => v.evidence?.text ?? "", {
        id: "evidence",
        header: "Evidence",
        cell: (info) => {
          const v = info.row.original;
          if (!v.evidence)
            return <span className="trace">{v.reason}</span>;
          return <span>“{v.evidence.text}”</span>;
        },
        enableSorting: false,
      }),
      columnHelper.accessor((v) => v.status, {
        id: "status",
        header: "Status",
        size: 130,
        cell: (info) => {
          const v = info.row.original;
          return (
            <div>
              <span className={`badge ${v.status}`}>{STATUS_LABEL[v.status]}</span>
              <div className="trace">score {v.score.toFixed(2)}</div>
            </div>
          );
        },
        filterFn: (row, _id, value) =>
          value === "all" ? true : row.original.status === value,
      }),
    ],
    [onPickEvidence],
  );

  const table = useReactTable({
    data: verifications,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Wire the status dropdown into a column filter.
  const statusColumn = table.getColumn("status");
  const rows = table.getRowModel().rows;

  // The Evidence column wraps to a variable height, so a fixed estimate causes
  // rows to overlap. We give an estimate and measure each rendered row so the
  // virtualizer uses the real height.
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 78,
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 12,
  });

  // Padding-row colSpan must match the number of visible columns, not a
  // hardcoded count, so it stays correct if columns change.
  const colCount = table.getVisibleLeafColumns().length;

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  return (
    <div className="table-region">
      <div className="table-controls">
        <label>
          Search claims{" "}
          <input
            type="search"
            aria-label="Search claims"
            placeholder="filter text…"
            onChange={(e) =>
              table.getColumn("claim")?.setFilterValue(e.target.value)
            }
          />
        </label>
        <label>
          Status{" "}
          <select
            aria-label="Filter by support status"
            value={statusFilter}
            onChange={(e) => {
              const val = e.target.value as "all" | SupportStatus;
              setStatusFilter(val);
              statusColumn?.setFilterValue(val === "all" ? undefined : val);
            }}
          >
            <option value="all">all</option>
            <option value="supported">supported</option>
            <option value="weak">weak</option>
            <option value="unsupported">unsupported</option>
          </select>
        </label>
        <span className="trace">{rows.length} rows (virtualized)</span>
      </div>

      {verifications.length === 0 ? (
        <div className="empty">
          No claims yet. Write in the editor (or use “Draft from sources”), then
          click <b>Verify draft</b>.
        </div>
      ) : (
        <div className="tw-table" ref={parentRef} role="region" aria-label="Claim verification table">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead className="tw-thead">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const toggle = header.column.getToggleSortingHandler();
                    const label = (
                      <>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() === "asc"
                          ? " ▲"
                          : header.column.getIsSorted() === "desc"
                            ? " ▼"
                            : ""}
                      </>
                    );
                    return (
                      <th
                        key={header.id}
                        className="tw-th"
                        style={{ width: header.getSize() }}
                        aria-sort={
                          header.column.getIsSorted() === "asc"
                            ? "ascending"
                            : header.column.getIsSorted() === "desc"
                              ? "descending"
                              : "none"
                        }
                      >
                        {canSort ? (
                          <button
                            type="button"
                            className="th-sort"
                            onClick={toggle}
                          >
                            {label}
                          </button>
                        ) : (
                          label
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {paddingTop > 0 && (
                <tr>
                  <td colSpan={colCount} style={{ height: paddingTop }} />
                </tr>
              )}
              {virtualRows.map((vr) => {
                const row = rows[vr.index];
                return (
                  <tr
                    key={row.id}
                    className="tw-row"
                    data-testid="claim-row"
                    data-index={vr.index}
                    ref={rowVirtualizer.measureElement}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="tw-td">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td colSpan={colCount} style={{ height: paddingBottom }} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
