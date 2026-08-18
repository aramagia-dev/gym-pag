export interface AuthFormValues {
  email: string;
  password: string;
}

export function validateAuthForm(values: AuthFormValues): string | null {
  if (!values.email.trim()) return "Ingrese su correo electrónico.";
  if (!values.email.includes("@")) return "Ingrese un correo electrónico válido.";
  if (!values.password) return "Ingrese su contraseña.";
  if (values.password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
  return null;
}

export function authErrorMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "El correo o la contraseña no son correctos.";
  if (normalized.includes("user already registered")) return "Ese correo ya está registrado. Inicie sesión.";
  if (normalized.includes("email not confirmed")) return "Confirme su correo electrónico antes de ingresar.";
  return "No se pudo completar la operación. Intente nuevamente.";
}
