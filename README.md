# 🥊 GymBoxing Kaly Jr · Sistema de gestión

Aplicación web para administrar el gimnasio:

- **Socios:** alta, edición y baja, con datos de contacto, nivel, peso, contacto de emergencia y notas.
- **Pagos:** cobro por plan (visita $100, semana $300, mensualidad $1,000). El vencimiento se calcula solo y, si el socio renueva antes de tiempo, no pierde días. Incluye totales del mes por método de pago.
- **Vencimientos:** socios por vencer (7 días), vencidos y sin pago, con botón para **recordar por WhatsApp** y cobrar.
- **Asistencias:** registro de entrada con buscador rápido; avisa si la membresía está vencida.
- **Rin · Sparring:** agenda diaria del rin con reservas por horario. **No permite reservas encimadas** y avisa si hay diferencia de peso, de nivel o membresía vencida.
- **Panel:** resumen del día (asistencias, rin, ingresos del mes, alertas).

Tecnología: React + TypeScript + Vite, con base de datos y usuarios en **Supabase**. Moneda MXN y horario de la Ciudad de México.

---

## 1. Crear la base de datos en Supabase

1. Entra a tu proyecto en [supabase.com](https://supabase.com/dashboard).
2. Ve a **SQL Editor → New query**, pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y presiona **Run**.
   Se crean las tablas, la seguridad (solo usuarios con sesión pueden ver o editar datos) y 3 planes iniciales: Visita $100 (1 día), Semana $300 (7 días) y Mensualidad $1,000 (30 días).
3. Ve a **Authentication → Sign In / Providers** y **desactiva "Allow new users to sign up"**, para que nadie de fuera pueda crear una cuenta.
4. Ve a **Authentication → Users → Add user → Create new user** y crea el correo y la contraseña de cada persona del staff (marca "Auto Confirm User").

## 2. Configurar la app

En **Project Settings → API** copia la *Project URL* y la *anon / publishable key* (nunca la `service_role`).

```bash
cp .env.example .env
# edita .env con tus valores
npm install
npm run dev
```

Abre http://localhost:5173 e inicia sesión con un usuario del paso 1.

## 3. Publicar en internet (Vercel)

1. En [vercel.com](https://vercel.com), elige **Add New → Project** e importa este repositorio.
2. En **Environment Variables** agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Presiona **Deploy**. El archivo `vercel.json` ya incluye la configuración para que funcionen las rutas.

## Estructura

```
supabase/schema.sql      Tablas, vista de estado de membresía y seguridad (RLS)
src/pages/               Pantallas: Panel, Socios, Pagos, Vencimientos, Asistencias, Rin, Planes
src/components/          Formularios y componentes compartidos
src/lib/                 Conexión a Supabase, tipos y formatos (fechas, MXN, WhatsApp)
```
