# HANDOFF — Bloqueo pago de prueba MercadoPago (2026-07-10)

## Estado general (lo que SÍ funciona)
- **Deploy Netlify OK** → sitio live en **https://aruma-lodge.netlify.app** con credenciales de **PRUEBA** de MP.
  - Deploy vía CLI (no git): `pnpm --package=netlify-cli dlx netlify deploy --prod`.
  - Build local en Windows resuelto con `pnpm-workspace.yaml`: `nodeLinker: hoisted` + `verifyDepsBeforeRun: false`,
    y `netlify.toml` build command = `node ./node_modules/next/dist/bin/next build` (esquiva el wrapper de pnpm).
  - 21 env vars cargadas en Netlify (verificado con `netlify env:list`), incluida `MERCADOPAGO_ACCESS_TOKEN` (TEST).
- **Webhook** configurado en MP (app `2702313037734073`) → callback prod `.../api/webhooks/mercadopago`, topic `payment`.
  - ⚠️ La **URL de PRUEBA** del panel (pestaña "Modo de prueba") apuntaba a un Supabase viejo — cambiarla a la de Netlify.
- **Mejoras de calidad** implementadas en el código (NO commiteadas): `payer.first_name/last_name`,
  `additional_info.items`, `statement_descriptor:"ARUMALODGE"`, `device_id` (security.js + header `X-meli-session-id`).
  - 158 tests verdes, tsc 0.

## 🔴 EL BLOQUEO
`POST /api/payments` devuelve **502 `{"error":"payment"}`** → `createCardPayment` tira excepción.
(Validación y re-chequeo de calendario pasan OK — el 502 es específicamente del cobro.)

### Diagnóstico ya hecho
Reproduje el flujo EXACTO por curl directo contra `api.mercadopago.com`:
1. Creé un `card_token` con la **Public Key de test** (`TEST-93de0c80-...`) → OK, devuelve id.
2. Cobré con el **Access Token de test** (`TEST-2702...-e571eb...`) incluyendo mis campos nuevos.
3. MP responde **HTTP 400 → `"Card Token not found"` (cause code 2006)**, INCLUSO creando token+pago atómicamente.

### Conclusión
- **NO es por los campos agregados** (items/`category_id:"travels"`/statement_descriptor/device). El error es del **token**.
- Código 2006 "Card Token not found" = típicamente **la Public Key del token y el Access Token del cobro no se corresponden**,
  aunque ambos salen del mismo app vía `get_credentials` (reconfirmados, no rotados).

## Hipótesis a investigar (próxima sesión)
1. **Test users (lo más probable):** Checkout API en sandbox suele requerir **usuarios de prueba**.
   Usar MCP `create_test_user` para crear vendedor + comprador. El card_token debe crearse con la **public key del
   test-user vendedor** y cobrarse con **SU access token**, no con las credenciales de la app.
   (Las "Credenciales de prueba" de la app podrían no servir para el flujo de card_token de Checkout API.)
2. **Doc oficial error 2006:** quedó guardada la búsqueda `search_documentation "card token not found 2006"`
   en `tool-results` de la sesión (199KB) — leer por chunks o con subagente.
3. **Public key inlineada:** confirmar que `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` efectivamente compilada en el build
   (es build-time) sea la TEST y del MISMO app que el access token del server.

## Datos para retomar
- App MP: **AppID `2702313037734073`**, Owner `2719355745`.
- MCP MP conectado. Tools útiles: `create_test_user`, `add_money_test_user`, `search_documentation`,
  `notifications_history`, `quality_evaluation`, `get_credentials`, `save_webhook`.
- Tarjeta de test usada: Mastercard `5031 7557 3453 0604`, `11/30`, CVV `123`, titular `APRO`, DNI `12345678`.
- Archivos tocados (sin commitear): `lib/reservation/payments.server.ts`, `app/api/payments/route.ts`,
  `components/reservas/StepPago.tsx`, `lib/reservation/payments.ts`, `netlify.toml`, `.npmrc`,
  `pnpm-workspace.yaml`, `package.json`, `.env.local`.

## Para PRODUCCIÓN (cuando el test funcione)
- Env → credenciales `APP_USR-` reales, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` prod.
- `MERCADOPAGO_WEBHOOK_SECRET` → el de la pestaña **"Modo productivo"** del webhook (es distinto al de prueba).
- `PAYMENTS_MOCK` ya está en 0.
