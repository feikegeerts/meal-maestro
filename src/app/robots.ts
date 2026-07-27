import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://meal-maestro.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/login", "/terms", "/privacy"],
        disallow: ["/recipes", "/account", "/admin", "/auth/callback"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
