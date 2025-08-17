import createMiddleware from 'next-intl/middleware';
import { routing } from './app/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames, excluding auth and api routes
  matcher: ['/((?!auth|api|_next|_vercel|.*\\..*).*)', '/', '/(nl|en)/:path*']
};