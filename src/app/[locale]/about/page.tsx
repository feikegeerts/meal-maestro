"use client";

import { useTranslations } from 'next-intl';
import { ChefHat, Heart, Shield, Users, Zap, Globe, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAppVersion, formatVersion } from '@/lib/version';
import { toast } from 'sonner';

export default function AboutPage() {
  const t = useTranslations('about');
  const { version } = getAppVersion();

  const values = [
    {
      icon: Shield,
      key: 'respectsPrivacy' as const,
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
    },
    {
      icon: Zap,
      key: 'adFree' as const,
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
    },
    {
      icon: Globe,
      key: 'noSubscriptions' as const,
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
    },
    {
      icon: Users,
      key: 'simpleToUse' as const,
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'
    }
  ];

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Meal Maestro',
          text: 'Check out Meal Maestro - an AI-powered recipe management app that respects your privacy!',
          url: window.location.origin,
        });
        // Native sharing succeeded, no toast needed
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          // Fallback to clipboard if native sharing failed (but not if user cancelled)
          try {
            await navigator.clipboard.writeText(window.location.origin);
            toast.success(t('shareSuccess'));
          } catch (_clipboardErr) {
            toast.error(t('shareError'));
          }
        }
      }
    } else {
      // Desktop fallback - copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.origin);
        toast.success(t('shareSuccess'));
      } catch (_err) {
        toast.error(t('shareError'));
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <ChefHat className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold">{t('title')}</h1>
        </div>
        
        {/* Values Badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {values.map(({ icon: Icon, key, color }) => (
            <Badge key={key} variant="secondary" className={color}>
              <Icon className="h-4 w-4 mr-1" />
              {t(`values.${key}`)}
            </Badge>
          ))}
        </div>

        {/* Version */}
        <div className="text-sm text-muted-foreground mb-2">
          {t('version.current')}: {formatVersion(version)}
        </div>
        <div className="text-sm text-muted-foreground">
          {t('version.buildWith')}
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-8">
        {/* Philosophy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {t('philosophy.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t('philosophy.description')}
            </p>
          </CardContent>
        </Card>

        {/* Story */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              {t('story.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t('story.description')}
            </p>
          </CardContent>
        </Card>

        {/* Two-column layout for bottom sections */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Sustainability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                {t('sustainability.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {t('sustainability.description')}
              </p>
              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  onClick={() => window.open('https://paypal.me/feikegeerts', '_blank')}
                >
                  <Heart className="h-4 w-4 mr-2" />
                  {t('sustainability.tipJar')}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
                
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t('sustainability.bankTransfer')}
                  </p>
                  
                  {/* Desktop: Show QR code */}
                  <div className="hidden sm:block">
                    <div className="flex justify-center">
                      <img 
                        src="/sepa-qr-code.png" 
                        alt="SEPA QR Code for bank transfer"
                        className="w-32 h-32"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('sustainability.qrInstructions')}
                    </p>
                  </div>
                  
                  {/* Mobile: Show clickable bank details */}
                  <div className="sm:hidden">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: 'Bank Transfer Details',
                            text: 'IBAN: NL07 ASNB 8851 7276 94\nReference: Meal Maestro Donation'
                          });
                        } else {
                          navigator.clipboard?.writeText('NL07ASNB8851727694');
                        }
                      }}
                    >
                      💳 {t('sustainability.copyIban')}
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    NL07 ASNB 8851 7276 94
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Community */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t('community.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {t('community.description')}
              </p>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleShare}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  {t('community.shareButton')}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled
                  title="Coming soon!"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('community.feedbackButton')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}