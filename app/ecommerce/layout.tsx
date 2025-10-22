import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext'
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
    <CustomerAuthProvider>
      <div className="min-h-screen bg-white flex flex-col md:flex-row">
        <EcommerceSidebar />
        <main className="flex-1 md:ml-20 mb-16 md:mb-0 flex flex-col md:pt-8">
          {children}
          <FooterSaren />
        </main>
      </div>
    </CustomerAuthProvider>
  )
}
