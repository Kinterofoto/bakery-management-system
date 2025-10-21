import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext'
import { EcommerceHeader } from '@/components/ecommerce/layout/EcommerceHeader'
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
      <div className="min-h-screen bg-white flex flex-col">
        <EcommerceHeader />
        <main className="flex-1">{children}</main>
        <FooterSaren />
      </div>
    </CustomerAuthProvider>
  )
}
