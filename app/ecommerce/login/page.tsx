import { LoginForm } from '@/components/ecommerce/auth/LoginForm'

export const metadata = {
  title: 'Inicia Sesión - Panadería Industrial',
}

export default function LoginPage() {
  return (
    <div className="py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-2 text-center">Inicia Sesión</h1>
      <p className="text-gray-600 text-center mb-12">
        Accede a tu cuenta para navegar catálogos especiales y realizar pedidos
      </p>
      <LoginForm />
    </div>
  )
}
