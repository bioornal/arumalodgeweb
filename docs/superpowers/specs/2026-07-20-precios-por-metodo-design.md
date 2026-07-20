# Precios por método de pago (comisión incluida + descuento transferencia) — Diseño

**Fecha:** 2026-07-20 · **Estado:** aprobado por el usuario (conversación; eligió
"descuento por transferencia" e implementación inmediata sobre `/admin/tarifas`).

## Contexto

El dueño configura en `/admin/tarifas` lo que quiere **recibir neto** por noche,
pero los canales de cobro tienen costo: tarjeta MP ~7,7% efectivo (6,29% + IVA,
liberación inmediata) y transferencia ~5% (retención IIBB Misiones). Decisión:

- **Precio de lista = precio con tarjeta** (comisión ya incluida). Nunca se
  muestra "recargo por tarjeta" (la ley 25.065 lo prohíbe); la transferencia se
  presenta como **ahorro en pesos**.
- Matemática correcta: `precio_público = neto ÷ (1 − pct/100)`, redondeado
  **hacia arriba a $100** (proteger el neto). Con neto 130.000: tarjeta 7,7% →
  $140.900; transferencia 5% → $136.900 (ahorro $4.000).

## Decisiones

1. **`RateSettings` gana `cardFeePct` y `transferFeePct`** (defaults 7.7 y 5;
   admiten decimales; validación 0–30). Editables en `/admin/tarifas` con texto
   de ayuda: "el precio por noche que configurás arriba es lo que RECIBÍS; el
   público ve el precio con el costo del canal incluido".
2. **Módulo puro nuevo `lib/reservation/method-pricing.ts`:**
   - `grossUp(net, feePct)` → `Math.ceil(net / (1 - f) / 100) * 100`; 0 si net ≤ 0.
   - `methodRates(settings, "card" | "transfer")` → `{ nightly, cleaningFee }`
     grosseados (la linealidad garantiza que las líneas del desglose suman el
     total, salvo el redondeo por línea, que siempre suma A FAVOR del neto).
   - `methodTotal(settings, method, slug, nights)` = computeTotal con esas rates.
   - `transferSavings(settings, slug, nights)` = totalCard − totalTransfer (≥ 0).
3. **Consumidores (todo precio visible u operado):**
   - `/tarifas` (`rates.server.ts` + `UnitRateCard`): muestra rates de TARJETA
     como precio de lista + línea "Pagando por transferencia: $T · ahorrás $S".
   - Checkout: `OrderSummary` y `StepPago` (tarjeta) muestran el total de lista;
     `StepTransferencia` muestra SU total (transferencia) + el ahorro.
   - `Confirmacion`: total del método efectivamente usado (la verdad post-cobro
     es el total persistido en la reserva).
   - `/departamentos` (`StickyBookingCard`/`UnitDetail`) y cualquier "desde $":
     rates de tarjeta.
   - **`/api/payments` cobra `methodTotal(card)`** y
     **`/api/reservations/transfer` registra `methodTotal(transfer)`** —
     server-side, el cliente no manda montos.
4. **DB:** columnas `card_fee_pct numeric(5,2) default 7.7` y
   `transfer_fee_pct numeric(5,2) default 5` en `rate_settings` (bloque `alter
   table … add column if not exists` agregado a `supabase/setup.sql`; el usuario
   debe correrlo en el SQL Editor). **Fail-safe doble:** `rowToSettings` usa los
   defaults si las columnas faltan (evita NaN si el ALTER no se corrió); si el
   save falla por columna inexistente, el admin ve el error y el sitio sigue.
5. **i18n:** claves nuevas es/en/pt para "Pagando por transferencia" / "ahorrás".
6. **Sin cambios:** modo WhatsApp (CTAs), emails y `/mi-reserva` (muestran el
   total persistido), panel admin de reservas (ídem).

## Testing

- `tests/reservation/method-pricing.test.ts`: grossUp (exacto, redondeo ↑ $100,
  net 0, pct 0 = identidad), methodRates linealidad, methodTotal, savings ≥ 0.
- `rate-settings`: parse de los pct (decimales, límites 0–30), rowToSettings con
  columnas ausentes → defaults.
- Routes: `/api/payments` cobra el total de tarjeta grosseado;
  `/api/reservations/transfer` registra el de transferencia.
- Componentes: `UnitRateCard` muestra lista + ahorro; `StepTransferencia`
  muestra su total.
- Suite completa + tsc + build.

## Pasos del dueño tras el deploy

1. Correr el bloque nuevo de `supabase/setup.sql` en el SQL Editor (si no corrió
   el de rate_settings, correr todo el bloque de tarifas).
2. En `/admin/tarifas`: revisar los % (defaults 7,7 y 5) y guardar.
3. Ver `/tarifas` como huésped: precios de lista + ahorro por transferencia.
4. Si cambia el plazo de liberación en MP (comisión menor), bajar `card_fee_pct`.
