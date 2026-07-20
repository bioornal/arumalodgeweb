# Pago de prueba ($1.000) en el panel admin — Diseño

**Fecha:** 2026-07-20 · **Estado:** pedido por el usuario (conversación); implementado
para que esté listo al cargar las credenciales productivas en Netlify.

## Contexto

Para lanzar el cobro online hay que validar la ÚNICA capa que el sandbox de MP no
pudo cubrir (diagnóstico 2026-07-10): la tokenización client-side del Payment Brick
con la public key productiva + el cobro con el access token productivo. La noche
más barata cuesta ~$130.000; el usuario quiere probar con ~$1.000 y reembolsar.

## Decisiones

1. **Página `/admin/pago-prueba`** dentro del panel existente (login Supabase +
   allowlist `ADMIN_EMAILS`; el middleware ya protege `/admin/*` y `/api/admin/*`).
2. **Monto fijo en el SERVIDOR:** `TEST_AMOUNT = 1000` vive solo en el endpoint.
   El body del cliente lleva únicamente los datos de la tarjeta tokenizada
   (token, paymentMethodId, issuerId, installments, deviceId, payerEmail).
   Nadie puede usar esta ruta para pagar menos por una estadía: no crea reservas.
3. **Mismo Brick real** que `StepPago` (misma `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`,
   mismo `security.js` para `device_id`), `maxInstallments: 1`.
4. **Endpoint `/api/admin/test-payment`:** re-verifica `getAdminUser()` (defensa en
   profundidad, patrón de `/api/admin/reservations/[id]`), llama `createCardPayment`
   con `amount: 1000`, `code: TEST-<timestamp>`, `description: "Prueba de
   integración Aruma Lodge"`, `statementDescriptor: "ARUMALODGE"`, `metadata:
   { test_payment: true }` (SIN `unit_id`), `notificationUrl` al webhook real.
5. **El webhook queda no-op para estos pagos:** verifica la firma y consulta el
   pago (ambas cosas se prueban ✓) pero al no haber `unit_id` válido en metadata
   corta con `{ok:true}` (rama existente "metadata incompleta"). NO toca
   calendario/Supabase/email.
6. **Modo WhatsApp no bloquea:** el guard 503 vive en `/api/payments`; este
   endpoint es independiente → se puede probar ANTES de abrir el checkout.
7. **Reembolso manual:** la página muestra el `payment id` + link a la actividad
   de MP (https://www.mercadopago.com.ar/activities) para reembolsar el $1.000.
   Sin botón de reembolso en V1 (YAGNI).
8. **PAYMENTS_MOCK no aplica acá:** el endpoint SIEMPRE cobra de verdad (es su
   razón de ser). La página avisa el monto y que el cobro es real.

## Componentes

- `app/admin/pago-prueba/page.tsx` — server component, guard `getAdminUser()` →
  redirect a `/admin/login` si no hay sesión (mismo patrón que `/admin/reservas`).
- `app/admin/pago-prueba/TestPaymentBrick.tsx` — client: init MP + security.js +
  `<Payment initialization={{amount: 1000, payer:{email: adminEmail}}}
  customization={{paymentMethods:{creditCard:"all",debitCard:"all",
  maxInstallments:1}}}>`; POST al endpoint; muestra resultado/instrucción de
  reembolso.
- `app/api/admin/test-payment/route.ts` — POST admin-only; valida shape de
  tarjeta (mismo type-guard que `/api/payments`); `createCardPayment` monto 1000;
  responde `{status, paymentId, statusDetail?, code}`.
- Link discreto "Pago de prueba" desde el header de `/admin/reservas`.

## Testing

- `tests/admin/test-payment-route.test.ts` (`@vitest-environment node`, patrón de
  los tests de rutas): 401 sin admin; 400 body inválido; con admin mockeado y
  `createCardPayment` mockeado → cobra EXACTAMENTE 1000 con metadata
  `{test_payment: true}` sin `unit_id` y code con prefijo `TEST-`; propaga
  status/paymentId.
- Suite completa + tsc + build antes del deploy.

## Uso (cuando Netlify tenga las credenciales APP_USR-)

1. Login en `/admin/login` → ir a `/admin/pago-prueba`.
2. Pagar $1.000 con una tarjeta real propia.
3. Verificar: approved en pantalla + cargo "ARUMALODGE" en la tarjeta + webhook
   200 en el panel de MP.
4. Reembolsar desde la actividad de MP.
5. Recién entonces: quitar `NEXT_PUBLIC_BOOKING_MODE`, redeploy, y probar una
   reserva real completa (esa sí con calendario; también reembolsable).
