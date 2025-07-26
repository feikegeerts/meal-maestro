"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Recipe } from "@/types/recipe";
import { useRouter } from "next/navigation";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RECIPE_CATEGORIES, RECIPE_SEASONS } from "@/types/recipe";
import {
  Search,
  Settings,
  X,
  ChevronFirst,
  ChevronLeft,
  ChevronRight,
  ChevronLast,
} from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
}

export function RecipeDataTable<TData, TValue>({
  columns,
  data,
  loading = false,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");

  // Debounce the search input
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setGlobalFilter(searchInput);
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 30,
      },
    },
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const searchValue = filterValue.toLowerCase();

      // Search in title
      const title = row.getValue("title") as string;
      if (title?.toLowerCase().includes(searchValue)) return true;

      // Search in category
      const category = row.getValue("category") as string;
      if (category?.toLowerCase().includes(searchValue)) return true;

      // Search in season
      const season = row.getValue("season") as string;
      if (season?.toLowerCase().includes(searchValue)) return true;

      // Search in tags
      const tags = row.getValue("tags") as string[];
      if (tags?.some((tag) => tag.toLowerCase().includes(searchValue)))
        return true;

      // Search in description (if available in row data)
      const original = row.original as Recipe;
      if (original?.description?.toLowerCase().includes(searchValue))
        return true;

      return false;
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length;

  const clearFilters = () => {
    setGlobalFilter("");
    setSearchInput("");
    setColumnFilters([]);
  };

  const hasFilters = globalFilter || columnFilters.length > 0;

  const handleRowClick = (recipe: Recipe) => {
    router.push(`/recipe/${recipe.id}`);
  };

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <Select
          value={
            (table.getColumn("category")?.getFilterValue() as string[])?.join(
              ","
            ) || ""
          }
          onValueChange={(value) => {
            const column = table.getColumn("category");
            if (value && value !== "all") {
              column?.setFilterValue([value]);
            } else {
              column?.setFilterValue(undefined);
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {RECIPE_CATEGORIES.map((category) => (
              <SelectItem
                key={category}
                value={category}
                className="capitalize"
              >
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Season Filter */}
        <Select
          value={
            (table.getColumn("season")?.getFilterValue() as string[])?.join(
              ","
            ) || ""
          }
          onValueChange={(value) => {
            const column = table.getColumn("season");
            if (value && value !== "all") {
              column?.setFilterValue([value]);
            } else {
              column?.setFilterValue(undefined);
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Season" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            {RECIPE_SEASONS.map((season) => (
              <SelectItem key={season} value={season} className="capitalize">
                {season}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="h-10 px-3">
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}

        {/* Column Visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10">
              <Settings className="mr-2 h-4 w-4" />
              View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Selection Info */}
      {selectedRowCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {selectedRowCount} of {table.getFilteredRowModel().rows.length}{" "}
            row(s) selected
          </Badge>
          <Button variant="outline" size="sm">
            Delete Selected
          </Button>
          <Button variant="outline" size="sm">
            Mark as Eaten
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
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
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => {
                    // Don't trigger row click if clicking on interactive elements
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('button') || 
                      target.closest('[role="checkbox"]') ||
                      target.closest('.dropdown-menu') ||
                      target.closest('[data-dropdown-trigger]')
                    ) {
                      return;
                    }
                    handleRowClick(row.original as Recipe);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No recipes found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex-1 text-sm text-muted-foreground">
          {selectedRowCount > 0 && (
            <span>
              {selectedRowCount} of {table.getFilteredRowModel().rows.length}{" "}
              row(s) selected.
            </span>
          )}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronFirst className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronLast className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
