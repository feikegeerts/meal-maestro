"use client";

import { Link, usePathname, useRouter } from "@/app/i18n/routing";
import { useState, useEffect } from "react";
import { BookOpen, Menu, LogOut, User, Shield, Globe, Info, Settings, ShoppingCart } from "lucide-react";
import { ChefHatIcon } from "@/components/ui/chef-hat-icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from 'next-intl';
import { useShoppingListCount } from "@/lib/hooks/use-shopping-list-query";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeMenu } from "@/components/theme-menu";

const languages = [
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { user, profile, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [, setAdminCheckLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userSheetOpen, setUserSheetOpen] = useState(false);
  const t = useTranslations('navigation');
  const tA11y = useTranslations('accessibility');
  const shoppingListCount = useShoppingListCount();

  const baseNavigationItems = [
    {
      name: t('recipes'),
      href: "/recipes",
      icon: BookOpen,
    },
    {
      name: "Shopping List",
      href: "/shopping-list",
      icon: ShoppingCart,
    },
    {
      name: "Account",
      href: "/account",
      icon: Settings,
    },
    {
      name: t('about'),
      href: "/about",
      icon: Info,
    },
  ];

  const adminNavigationItem = {
    name: t('admin'),
    href: "/admin",
    icon: Shield,
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
    router.push("/login");
  };

  const handleLanguageChange = (newLocale: string) => {
    router.push(pathname, { locale: newLocale });
  };

  const handleUserMenuOpenChange = (open: boolean) => {
    setUserMenuOpen(open);
  };

  const handleUserSheetOpenChange = (open: boolean) => {
    setUserSheetOpen(open);
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

  // Prevent hydration mismatch by deferring auth-dependent rendering to client
  useEffect(() => { setMounted(true); }, []);

  // Close mobile sheet when route changes
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  // Dynamic navigation items based on admin status
  const navigationItems = [
    ...baseNavigationItems,
    ...(isAdmin ? [adminNavigationItem] : [])
  ];

  // Show navigation for both authenticated and unauthenticated users
  const publicNavigationItems = [
    {
      name: t('about'),
      href: "/about",
      icon: Info,
    },
  ];

  // Gate auth-dependent rendering on mount to prevent hydration mismatch
  const isAuthenticated = mounted && !!user;

  // Show different navigation items based on auth state
  const displayedItems = isAuthenticated ? navigationItems : publicNavigationItems;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center space-x-2">
            <ChefHatIcon className="h-8 w-8 text-primary" width={32} height={32} />
            <span className="text-xl font-bold">Meal Maestro</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <NavigationMenu>
              <NavigationMenuList>
                {displayedItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  const isShoppingList = item.href === "/shopping-list";
                  const badgeCount = isShoppingList && shoppingListCount && shoppingListCount > 0
                    ? shoppingListCount
                    : null;

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
                          {badgeCount !== null && (
                            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground">
                              {badgeCount}
                            </span>
                          )}
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>

            {/* User Area - Authenticated or Login Button */}
            {isAuthenticated ? (
              /* Authenticated User Dropdown */
              <DropdownMenu open={userMenuOpen} onOpenChange={handleUserMenuOpenChange}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full hover:bg-accent hover:ring-2 hover:ring-ring hover:ring-offset-2 focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all cursor-pointer"
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
                <DropdownMenuContent className="w-56 sm:w-64 max-w-[calc(100vw-2rem)]" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.display_name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Language Selection Submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center gap-3">
                      <Globe className="h-4 w-4" />
                      <span>{t('language')}</span>
                      <span className="ml-2 text-sm">
                        {languages.find(lang => lang.code === locale)?.flag}
                      </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {languages.map((language) => (
                        <DropdownMenuItem
                          key={language.code}
                          onClick={() => handleLanguageChange(language.code)}
                          className={cn(
                            "flex items-center gap-3",
                            locale === language.code && "bg-accent text-accent-foreground"
                          )}
                        >
                          <span className="text-sm">{language.flag}</span>
                          <span className="text-sm">{language.name}</span>
                          {locale === language.code && (
                            <div className="ml-auto h-2 w-2 bg-primary rounded-full" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  
                  {/* Theme Selection Submenu */}
                  <ThemeMenu variant="dropdown" />
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* Login Button for Unauthenticated Users */
              <Link href="/login">
                <Button variant="default" size="sm">
                  <User className="mr-2 h-4 w-4" />
                  {t('signIn')}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile User Area */}
            {isAuthenticated ? (
              /* Mobile User Avatar - Sheet for authenticated users */
              <Sheet open={userSheetOpen} onOpenChange={handleUserSheetOpenChange}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full hover:bg-accent hover:ring-2 hover:ring-ring hover:ring-offset-2 focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all cursor-pointer"
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
                </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>{t('settings')}</span>
                  </SheetTitle>
                </SheetHeader>
                
                <div className="mt-6 space-y-6">
                  {/* User Info Section */}
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.display_name || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>

                  {/* Language Selection */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {t('language')}
                    </h3>
                    <div className="space-y-2">
                      {languages.map((language) => (
                        <Button
                          key={language.code}
                          variant={locale === language.code ? "secondary" : "ghost"}
                          onClick={() => handleLanguageChange(language.code)}
                          className="w-full justify-start gap-3"
                        >
                          <span className="text-sm">{language.flag}</span>
                          <span className="text-sm">{language.name}</span>
                          {locale === language.code && (
                            <div className="ml-auto h-2 w-2 bg-primary rounded-full" />
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Theme Selection */}
                  <ThemeMenu variant="buttons" />

                  {/* Logout Button */}
                  <div className="pt-4 border-t space-y-2">
                    <Button
                      variant="ghost"
                      onClick={handleSignOut}
                      className="w-full justify-start gap-3"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{t('logout')}</span>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            ) : (
              /* Login Button for Mobile Unauthenticated Users */
              <Link href="/login">
                <Button variant="default" size="sm">
                  <User className="mr-2 h-4 w-4" />
                  {t('signIn')}
                </Button>
              </Link>
            )}

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
                    <ChefHatIcon className="h-6 w-6 text-primary" width={24} height={24} />
                    <span>{t('navigation')}</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-3">
                  {displayedItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    const isShoppingList = item.href === "/shopping-list";
                    const badgeCount = isShoppingList && shoppingListCount && shoppingListCount > 0
                      ? shoppingListCount
                      : null;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors w-full",
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span className="flex-1">{item.name}</span>
                        {badgeCount !== null && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium leading-none text-primary-foreground">
                            {badgeCount}
                          </span>
                        )}
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
