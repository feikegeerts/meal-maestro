"use client";

import { Link, usePathname } from "@/app/i18n/routing";
import { useState, useEffect } from "react";
import { ChefHat, BookOpen, Menu, LogOut, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useUserCosts } from "@/lib/hooks/use-user-costs";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { cn } from "@/lib/utils";
import { useTranslations } from 'next-intl';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MainNav() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [, setAdminCheckLoading] = useState(true);
  const { data: costData, loading: costLoading } = useUserCosts();
  const t = useTranslations('navigation');
  const tAdmin = useTranslations('admin');
  const tA11y = useTranslations('accessibility');

  const baseNavigationItems = [
    {
      name: t('recipes'),
      href: "/recipes",
      icon: BookOpen,
    },
  ];

  const adminNavigationItem = {
    name: t('admin'),
    href: "/admin",
    icon: Shield,
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error("Error signing out:", error);
    }
  };

  const formatCost = (cost: number): string => {
    if (cost >= 1) {
      return `$${cost.toFixed(2)}`;
    } else if (cost >= 0.001) {
      return `$${cost.toFixed(4)}`;
    } else {
      return `$${cost.toFixed(6)}`;
    }
  };

  // Check if user is admin based on profile role
  useEffect(() => {
    if (!user || !profile) {
      setIsAdmin(false);
      setAdminCheckLoading(false);
      return;
    }

    // Check admin status from user profile role
    setIsAdmin(profile.role === 'admin');
    setAdminCheckLoading(false);
  }, [user, profile]);

  // Close mobile sheet when route changes
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  // Dynamic navigation items based on admin status
  const navigationItems = [
    ...baseNavigationItems,
    ...(isAdmin ? [adminNavigationItem] : [])
  ];

  if (!user) {
    return null;
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center space-x-2">
            <ChefHat className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Meal Maestro</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <NavigationMenu>
              <NavigationMenuList>
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <NavigationMenuItem key={item.href}>
                      <NavigationMenuLink asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            navigationMenuTriggerStyle(),
                            "flex items-center space-x-2",
                            isActive && "bg-accent text-accent-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={profile?.avatar_url || undefined}
                      alt={profile?.display_name || user?.email || "User"}
                    />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.display_name || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    {costLoading ? (
                      <div className="space-y-1">
                        <div className="h-3 w-20 animate-pulse bg-muted rounded"></div>
                        <div className="h-3 w-16 animate-pulse bg-muted rounded"></div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs leading-none text-muted-foreground">
                          {tAdmin('totalCosts')}: {formatCost(costData?.totalCost || 0)}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {tAdmin('totalCalls')}: {costData?.totalCalls || 0}
                        </p>
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile Language Switcher */}
            <LanguageSwitcher />
            
            {/* Mobile User Avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={profile?.avatar_url || undefined}
                      alt={profile?.display_name || user?.email || "User"}
                    />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.display_name || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    {costLoading ? (
                      <div className="space-y-1">
                        <div className="h-3 w-20 animate-pulse bg-muted rounded"></div>
                        <div className="h-3 w-16 animate-pulse bg-muted rounded"></div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs leading-none text-muted-foreground">
                          {tAdmin('totalCosts')}: {formatCost(costData?.totalCost || 0)}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {tAdmin('totalCalls')}: {costData?.totalCalls || 0}
                        </p>
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={tA11y('toggleMenu')}>
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center space-x-2">
                    <ChefHat className="h-6 w-6 text-primary" />
                    <span>{t('navigation')}</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-2">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
