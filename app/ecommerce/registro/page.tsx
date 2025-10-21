import { SignUpForm } from '@/components/ecommerce/auth/SignUpForm'

export const metadata = {
  title: 'Crear Cuenta - Panadería Industrial',
}

export default function SignUpPage() {
  return (
    <div className="py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-2 text-center">Crea tu Cuenta</h1>
      <p className="text-gray-600 text-center mb-12">
        Regístrate para acceder a ofertas especiales y realizar pedidos
      </p>
      <SignUpForm />
    </div>
  )
}
