import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/landing", "/ecommerce/catalogo"],
        disallow: ["/api/", "/login", "/dashboard", "/admin", "/orders", "/inventory", "/production", "/crm", "/routes"],
      },
    ],
    sitemap: "https://pastrychef.com.co/sitemap.xml",
  }
}
