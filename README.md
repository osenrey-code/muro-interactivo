# Muro Interactivo

Proyecto final de Programación Web hecho con JavaScript (ES6), React y Firebase.

## Funcionalidades

- Cualquier visitante puede ver todas las publicaciones en tiempo real.
- Registro con usuario, clave, nombre y apellido.
- Inicio y cierre de sesión.
- Solo usuarios autenticados pueden crear publicaciones.
- Validación de formularios y reglas de seguridad para Firestore.

## Preparación de Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Agrega una aplicación web y copia su configuración.
3. Activa **Authentication > Sign-in method > Email/Password**.
4. Crea la base de datos en **Firestore Database**.
5. Copia `.env.example` como `.env.local` y completa sus valores con la configuración de tu aplicación Firebase.
6. En Firestore, abre **Rules**, reemplaza el contenido con `firestore.rules` y publica las reglas.

El campo **usuario** se transforma internamente en `usuario@muro-interactivo.local` para usar Firebase Authentication, sin pedir correo al estudiante.

## Ejecutar localmente

```powershell
npm install
npm run dev
```

Abre la dirección que muestre Vite, usualmente `http://localhost:5173`.

## Crear versión de producción

```powershell
npm run build
```
