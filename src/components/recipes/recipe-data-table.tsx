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
import { useRouter } from "@/app/i18n/routing";

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
  Trash2,
  Utensils,
  Loader2,
} from "lucide-react";
import { useRecipes } from "@/contexts/recipe-context";
import { recipeService } from "@/lib/recipe-service";
import { toast } from "sonner";
import { useTranslations } from 'next-intl';
import { useRecipeTranslations } from '@/messages';
import { CuisineType, DietType, CookingMethodType, DishType, ProteinType, OccasionType, CharacteristicType } from "@/types/recipe";

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
  const { removeRecipes, markRecipesAsEaten } = useRecipes();
  const t = useTranslations('toast');
  const tTable = useTranslations('recipeTable');
  const tCategories = useTranslations('categories');
  const tSeasons = useTranslations('seasons');
  const { translateTag } = useRecipeTranslations();
  
  const getColumnDisplayName = (columnId: string): string => {
    switch (columnId) {
      case 'title': return tTable('title');
      case 'category': return tTable('category');
      case 'season': return tTable('season');
      case 'tags': return tTable('tags');
      case 'last_eaten': return tTable('lastEaten');
      case 'created_at': return tTable('created');
      case 'actions': return tTable('actions');
      default: return columnId;
    }
  };
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [bulkOperationLoading, setBulkOperationLoading] = React.useState(false);

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
    enableColumnResizing: false,
    globalFilterFn: (row, _columnId, filterValue) => {
      const searchValue = filterValue.toLowerCase();
      const recipe = row.original as Recipe;

      // Search in title
      const title = row.getValue("title") as string;
      if (title?.toLowerCase().includes(searchValue)) return true;

      // Search in category
      const category = row.getValue("category") as string;
      if (category?.toLowerCase().includes(searchValue)) return true;

      // Search in season
      const season = row.getValue("season") as string;
      if (season?.toLowerCase().includes(searchValue)) return true;

      // Search in categorized tags (both raw and translated values)
      const allTags = [
        ...(recipe.cuisine ? [recipe.cuisine] : []),
        ...(recipe.diet_types || []),
        ...(recipe.cooking_methods || []),
        ...(recipe.dish_types || []),
        ...(recipe.proteins || []),
        ...(recipe.occasions || []),
        ...(recipe.characteristics || [])
      ];
      
      // Check raw tag values
      if (allTags?.some((tag) => tag.toLowerCase().includes(searchValue)))
        return true;
        
      // Check translated tag values
      const translatedTags: string[] = [];
      if (recipe.cuisine) {
        translatedTags.push(translateTag('cuisine', recipe.cuisine as CuisineType));
      }
      if (recipe.diet_types) {
        recipe.diet_types.forEach(dietType => {
          translatedTags.push(translateTag('dietType', dietType as DietType));
        });
      }
      if (recipe.cooking_methods) {
        recipe.cooking_methods.forEach(method => {
          translatedTags.push(translateTag('cookingMethod', method as CookingMethodType));
        });
      }
      if (recipe.dish_types) {
        recipe.dish_types.forEach(dishType => {
          translatedTags.push(translateTag('dishType', dishType as DishType));
        });
      }
      if (recipe.proteins) {
        recipe.proteins.forEach(protein => {
          translatedTags.push(translateTag('protein', protein as ProteinType));
        });
      }
      if (recipe.occasions) {
        recipe.occasions.forEach(occasion => {
          translatedTags.push(translateTag('occasion', occasion as OccasionType));
        });
      }
      if (recipe.characteristics) {
        recipe.characteristics.forEach(characteristic => {
          translatedTags.push(translateTag('characteristic', characteristic as CharacteristicType));
        });
      }
      
      if (translatedTags?.some((tag) => tag.toLowerCase().includes(searchValue)))
        return true;

      // Search in description (if available in row data)
      if (recipe?.description?.toLowerCase().includes(searchValue))
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

  const [clickedRecipeId, setClickedRecipeId] = React.useState<string | null>(null);

  const handleRowClick = (recipe: Recipe) => {
    setClickedRecipeId(recipe.id);
    router.push(`/recipes/${recipe.id}`);
  };

  const handleRowMouseEnter = (recipeId: string) => {
    router.prefetch(`/recipes/${recipeId}`);
  };

  const handleDeleteSelected = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedIds = selectedRows.map(row => (row.original as Recipe).id);
    
    if (selectedIds.length === 0) return;

    const confirmDelete = window.confirm(
      tTable('confirmDelete', { 
        count: selectedIds.length, 
        plural: selectedIds.length > 1 ? 's' : '' 
      })
    );

    if (!confirmDelete) return;

    setBulkOperationLoading(true);
    try {
      const result = await recipeService.deleteRecipes(selectedIds);
      removeRecipes(result.deletedIds);
      setRowSelection({});
      const message = result.deletedCount === 1 
        ? t('recipeDeleted', { count: result.deletedCount })
        : t('recipesDeleted', { count: result.deletedCount });
      toast.success(message);
    } catch (error) {
      console.error('Error deleting recipes:', error);
      toast.error(t('deleteRecipeError'));
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleMarkAsEaten = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedIds = selectedRows.map(row => (row.original as Recipe).id);
    
    if (selectedIds.length === 0) return;

    setBulkOperationLoading(true);
    try {
      const result = await recipeService.markRecipesAsEaten(selectedIds);
      markRecipesAsEaten(result.updatedIds);
      setRowSelection({});
      const message = result.updatedCount === 1
        ? t('recipeMarkedEaten', { count: result.updatedCount })
        : t('recipesMarkedEaten', { count: result.updatedCount });
      toast.success(message);
    } catch (error) {
      console.error('Error marking recipes as eaten:', error);
      toast.error(t('markEatenError'));
    } finally {
      setBulkOperationLoading(false);
    }
  };

  React.useEffect(() => {
    return () => {
      setClickedRecipeId(null);
    };
  }, []);

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tTable('searchPlaceholder')}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 flex-wrap">
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
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={tTable('categoryPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tTable('allCategories')}</SelectItem>
              {RECIPE_CATEGORIES.map((category) => (
                <SelectItem
                  key={category}
                  value={category}
                  className="capitalize"
                >
                  {tCategories(category)}
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
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={tTable('seasonPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tTable('allSeasons')}</SelectItem>
              {RECIPE_SEASONS.map((season) => (
                <SelectItem key={season} value={season} className="capitalize">
                  {tSeasons(season)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters} className="h-10 px-3">
              <X className="mr-2 h-4 w-4" />
              {tTable('clear')}
            </Button>
          )}

          {/* Column Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 w-10 p-0">
                <Settings className="h-4 w-4" />
                <span className="sr-only">{tTable('viewOptions')}</span>
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
                      {getColumnDisplayName(column.id)}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Selection Info */}
      {selectedRowCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {tTable('rowsSelected', { 
              count: selectedRowCount, 
              total: table.getFilteredRowModel().rows.length 
            })}
          </Badge>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDeleteSelected}
            disabled={bulkOperationLoading}
          >
            {bulkOperationLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            {tTable('deleteSelected')}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleMarkAsEaten}
            disabled={bulkOperationLoading}
          >
            {bulkOperationLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Utensils className="mr-2 h-4 w-4" />
            )}
            {tTable('markAsEatenBulk')}
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border text-sm sm:text-base">
        <Table 
          style={{ 
            width: '100%',
            tableLayout: 'fixed' 
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
                  className={`cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors ${
                    clickedRecipeId === (row.original as Recipe).id ? 'bg-muted animate-pulse' : ''
                  }`}
                  onMouseEnter={() => handleRowMouseEnter((row.original as Recipe).id)}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('button') || 
                      target.closest('[role="checkbox"]') ||
                      target.closest('[data-radix-popper-content-wrapper]') ||
                      target.closest('[data-dropdown-trigger]') ||
                      target.closest('[role="menuitem"]') ||
                      target.closest('a[href]')
                    ) {
                      return;
                    }
                    handleRowClick(row.original as Recipe);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                    >
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
                  {tTable('noRecipesFound')}
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
              {tTable('rowsSelected', { 
                count: selectedRowCount, 
                total: table.getFilteredRowModel().rows.length 
              })}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">{tTable('rowsPerPage')}</p>
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
            {tTable('page', { 
              current: table.getState().pagination.pageIndex + 1, 
              total: table.getPageCount() 
            })}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">{tTable('goToFirstPage')}</span>
              <ChevronFirst className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">{tTable('goToPreviousPage')}</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">{tTable('goToNextPage')}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">{tTable('goToLastPage')}</span>
              <ChevronLast className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
