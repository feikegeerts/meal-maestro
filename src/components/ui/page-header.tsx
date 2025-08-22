"use client";

import { useRouter, usePathname } from "@/app/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { generateBreadcrumbs, getPageTitle, type BreadcrumbItem as BreadcrumbItemType } from "@/lib/breadcrumb-utils";
import { Recipe } from "@/types/recipe";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from 'next-intl';
import { Link } from "@/app/i18n/routing";

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  recipes?: Recipe[];
  recipe?: Recipe;
  showBackButton?: boolean;
  backButtonText?: string;
  onBackClick?: () => void;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  recipes,
  recipe,
  showBackButton = true,
  backButtonText,
  onBackClick,
  className,
}: PageHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('navigation');
  
  const breadcrumbItems = generateBreadcrumbs(pathname, { recipes, recipe, t });
  const defaultTitle = title || getPageTitle(pathname, { recipe, t });

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.back();
    }
  };

  const renderBreadcrumbItems = () => {
    const items: React.ReactNode[] = [];
    
    breadcrumbItems.forEach((item: BreadcrumbItemType, index) => {
      const Icon = item.icon;
      const isLast = index === breadcrumbItems.length - 1;
      
      // Add the breadcrumb item
      items.push(
        <BreadcrumbItem key={`item-${index}`}>
          {item.isCurrentPage ? (
            <BreadcrumbPage className="flex items-center gap-1">
              {Icon && <Icon className="h-4 w-4" />}
              {item.label && <span>{item.label}</span>}
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href={item.href!} className="flex items-center gap-1">
                {Icon && <Icon className="h-4 w-4" />}
                {item.label && <span>{item.label}</span>}
              </Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
      );
      
      // Add separator after each item except the last
      if (!isLast) {
        items.push(<BreadcrumbSeparator key={`separator-${index}`} />);
      }
    });
    
    return items;
  };

  return (
    <div className={cn("space-y-3 sm:space-y-4", className)}>
      {/* Mobile: Back Button */}
      <div className="md:hidden">
        <div className="flex items-center justify-between">
          {showBackButton && (
            <Button
              variant="ghost"
              onClick={handleBackClick}
              className="flex items-center p-2 -ml-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backButtonText || t('back')}
            </Button>
          )}
          
          {/* Actions for recipe pages on mobile */}
          {recipe && actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Desktop: Breadcrumb Navigation */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              {renderBreadcrumbItems()}
            </BreadcrumbList>
          </Breadcrumb>
          
          {/* Actions for recipe pages */}
          {recipe && actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Page Title Section - Skip for recipe detail pages */}
      {!recipe && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {defaultTitle}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}