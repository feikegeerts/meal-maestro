'use client';

import { useState, useEffect } from 'react';
import { X, Home, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { useTranslations } from 'next-intl';

const BANNER_DISMISSED_KEY = 'pwa-banner-dismissed';
const BANNER_DELAY_MS = 30000; // 30 seconds

export function PWAInstallBanner() {
  const { canShowBanner, isIOS, isAndroid, installPWA } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const t = useTranslations('pwa');

  useEffect(() => {
    if (!canShowBanner) return;

    // Check if user has already dismissed the banner
    const isDismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === 'true';
    if (isDismissed) return;

    // Show banner after delay
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, BANNER_DELAY_MS);

    return () => clearTimeout(timer);
  }, [canShowBanner]);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else if (isAndroid) {
      const success = await installPWA();
      if (success) {
        setShowBanner(false);
        localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
      }
    }
  };

  if (!showBanner || !canShowBanner) {
    return null;
  }

  return (
    <>
      {/* Install Banner */}
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm">
        <div className="rounded-lg border bg-card p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Home className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-card-foreground">
                {t('installBanner.title')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('installBanner.description')}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={t('installBanner.dismiss')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3">
            <Button
              onClick={handleInstallClick}
              className="w-full"
              size="sm"
            >
              {isIOS ? t('installBanner.showHowButton') : t('installBanner.installButton')}
            </Button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              {t('installInstructions.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {t('installInstructions.description')}
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  1
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {t('installInstructions.step1.title')}
                    <Share className="h-4 w-4" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('installInstructions.step1.description')}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  2
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {t('installInstructions.step2.title')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('installInstructions.step2.description')}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  3
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {t('installInstructions.step3.title')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('installInstructions.step3.description')}
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                setShowIOSInstructions(false);
                setShowBanner(false);
                localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
              }}
              className="w-full"
              variant="outline"
            >
              {t('installBanner.gotIt')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}