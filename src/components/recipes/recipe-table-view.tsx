"use client";

import * as React from "react";
import {
  flexRender,
  Table as TanStackTable,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Recipe } from "@/types/recipe";
import { useTranslations } from "next-intl";

interface RecipeTableViewProps {
  table: TanStackTable<Recipe>;
  columns: ColumnDef<Recipe, unknown>[];
  loading?: boolean;
  clickedRecipeId: string | null;
  onRowMouseEnter: (recipeId: string) => void;
  onRowClick: (recipe: Recipe) => void;
}

export function RecipeTableView({
  table,
  columns,
  loading = false,
  clickedRecipeId,
  onRowMouseEnter,
  onRowClick,
}: RecipeTableViewProps) {
  const tTable = useTranslations("recipeTable");

  return (
    <div className="rounded-md border text-sm sm:text-base">
      <Table
        style={{
          width: "100%",
          tableLayout: "fixed",
        }}
      >
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {columns.map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <div className="h-4 animate-pulse rounded bg-muted" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={`cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted ${
                  clickedRecipeId === (row.original as Recipe).id
                    ? "bg-muted animate-pulse"
                    : ""
                }`}
                onMouseEnter={() => onRowMouseEnter((row.original as Recipe).id)}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (
                    target.closest("button") ||
                    target.closest('[role="checkbox"]') ||
                    target.closest("[data-radix-popper-content-wrapper]") ||
                    target.closest("[data-dropdown-trigger]") ||
                    target.closest('[role="menuitem"]') ||
                    target.closest("a[href]")
                  ) {
                    return;
                  }
                  onRowClick(row.original as Recipe);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                {tTable("noRecipesFound")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
