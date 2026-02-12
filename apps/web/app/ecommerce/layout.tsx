import { EcommerceSidebar } from '@/components/ecommerce/layout/EcommerceSidebar'
import { FooterSaren } from '@/components/ecommerce/layout/FooterSaren'

export const metadata = {
  title: 'Pastry Industrial - E-Commerce',
  description: 'Premium bakery products for professionals',
}

export default function EcommerceSarenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row pb-12 md:pb-0">
      <EcommerceSidebar />
      <main className="flex-1 md:ml-20 flex flex-col">
        {children}
        <FooterSaren />
      </main>
    </div>
  )
}
