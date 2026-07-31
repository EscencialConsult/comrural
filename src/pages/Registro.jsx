import AuthPage from './AuthPage'

// Entrada directa en modo registro (ej. un link externo "Registrate acá").
// El toggle interno de AuthPage no navega — ver AuthPage.jsx.
export default function Registro() {
  return <AuthPage modoInicial="registro" />
}
