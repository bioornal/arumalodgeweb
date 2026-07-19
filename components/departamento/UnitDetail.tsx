import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Reveal } from "@/components/motion/Reveal";
import { Link } from "@/lib/i18n/navigation";
import { StickyBookingCard } from "./StickyBookingCard";
import { UNITS } from "@/lib/units";
import type { Unit, UnitSlug } from "@/lib/units";

// Per-unit fixed characteristics that can't be derived purely from numbers
const UNIT_FEAT: Record<
  UnitSlug,
  { bedroom: string; bath: string; view: string; exterior: string }
> = {
  yvyra: {
    bedroom: "3 habitaciones: 2 camas matrimoniales + 3 individuales",
    bath: "3 completos",
    view: "Jardín y piscina",
    exterior: "Piscina con jacuzzi hidromasaje",
  },
  mberu: {
    bedroom: "2 dormitorios",
    bath: "1 completo",
    view: "Jardín y pileta",
    exterior: "Balcón con vista a la pileta",
  },
  tatu: {
    bedroom: "1 matrimonial + 3 individuales",
    bath: "1 completo",
    view: "Jardín y pileta",
    exterior: "Acceso a la piscina",
  },
};

// Same map translated for EN / PT (static, no i18n key needed for these values)
const UNIT_FEAT_EN: Record<
  UnitSlug,
  { bedroom: string; bath: string; view: string; exterior: string }
> = {
  yvyra: { bedroom: "3 bedrooms: 2 double beds + 3 single beds", bath: "3 full", view: "Garden & pool", exterior: "Pool with hydromassage jacuzzi" },
  mberu: { bedroom: "2 bedrooms", bath: "1 full", view: "Garden & pool", exterior: "Balcony overlooking the pool" },
  tatu: { bedroom: "1 double + 3 single beds", bath: "1 full", view: "Garden & pool", exterior: "Pool access" },
};

const UNIT_FEAT_PT: Record<
  UnitSlug,
  { bedroom: string; bath: string; view: string; exterior: string }
> = {
  yvyra: { bedroom: "3 quartos: 2 camas de casal + 3 camas de solteiro", bath: "3 completos", view: "Jardim e piscina", exterior: "Piscina com jacuzzi hidromassagem" },
  mberu: { bedroom: "2 quartos", bath: "1 completo", view: "Jardim e piscina", exterior: "Sacada com vista para a piscina" },
  tatu: { bedroom: "1 casal + 3 individuais", bath: "1 completo", view: "Jardim e piscina", exterior: "Acesso à piscina" },
};

// Per-unit extra services appended to the shared services list, per locale.
const UNIT_EXTRAS: Record<string, Record<UnitSlug, string[]>> = {
  es: {
    yvyra: ["Dúplex con dormitorios en planta alta", "Sala de estar con sofá", "Sala comedor", "Balcón con vista a la calle", "Estacionamiento gratuito en el predio"],
    mberu: [],
    tatu: ["DirectTV", "Lavadero con lavarropas", "Acceso a la piscina", "Estacionamiento gratuito en el mismo predio"],
  },
  en: {
    yvyra: ["Duplex with upstairs bedrooms", "Living room with sofa", "Dining room", "Balcony with street view", "Free on-site parking"],
    mberu: [],
    tatu: ["DirectTV", "Laundry with washer", "Pool access", "Free on-site parking"],
  },
  pt: {
    yvyra: ["Duplex com quartos no andar superior", "Sala de estar com sofá", "Sala de jantar", "Sacada com vista para a rua", "Estacionamento gratuito no local"],
    mberu: [],
    tatu: ["DirectTV", "Lavanderia com máquina de lavar", "Acesso à piscina", "Estacionamento gratuito no mesmo local"],
  },
};

// Galerías editoriales — todas las fotos reales del alojamiento en una
// cuadrícula asimétrica. `span` marca el tamaño: hero 2x2, wide 2x1, tall 1x2.
type GalleryPhoto = { photo: string; alt: string; span?: "hero" | "wide" | "tall" };

// Suite Yvyrá — carpeta Dpto2 del bucket.
const YVYRA_PHOTOS: GalleryPhoto[] = [
  { photo: "Dpto2/4.jpg", alt: "Living con sofá esquinero y rack de TV", span: "hero" },
  { photo: "Dpto2/11.jpg", alt: "Dormitorio principal con cama king" },
  { photo: "Dpto2/3.jpg", alt: "Escalera de doble altura", span: "tall" },
  { photo: "Dpto2/2.jpg", alt: "Comedor para ocho" },
  { photo: "Dpto2/5.jpg", alt: "Living con cuadro de rosa", span: "wide" },
  { photo: "Dpto2/8.jpg", alt: "Baño con espejo redondo", span: "tall" },
  { photo: "Dpto2/13.jpg", alt: "Dormitorio principal con aire acondicionado" },
  { photo: "Dpto2/15.jpg", alt: "Segundo dormitorio con camas individuales" },
  { photo: "Dpto2/1.jpg", alt: "Cocina equipada", span: "wide" },
  { photo: "Dpto2/14.jpg", alt: "Balcón con vista a la calle", span: "tall" },
  { photo: "Dpto2/16.jpg", alt: "Segundo dormitorio con placard" },
  { photo: "Dpto2/17.jpg", alt: "Dormitorio principal con baño en suite" },
  { photo: "Dpto2/18.jpg", alt: "Vista a la pileta desde la ventana", span: "tall" },
  { photo: "Dpto2/12.jpg", alt: "Dormitorio principal con cómoda", span: "wide" },
  { photo: "Dpto2/7.jpg", alt: "Toilette con bidet" },
  { photo: "Dpto2/9.jpg", alt: "Bacha del baño" },
  { photo: "Dpto2/6.jpg", alt: "Ducha tipo lluvia", span: "tall" },
  { photo: "Dpto2/1a.jpg", alt: "Ventana de la cocina al jardín" },
  { photo: "Dpto2/2a.jpg", alt: "Toilette junto al comedor" },
  { photo: "Dpto2/10.jpg", alt: "Baño completo con pared de mármol" },
  { photo: "Dpto2/19 (1).jpg", alt: "Escalera desde la planta alta" },
];

// Departamento Mberú — carpeta Dpto1 del bucket (21 fotos: 1-9, 11-22).
const MBERU_PHOTOS: GalleryPhoto[] = [
  { photo: "Dpto1/20.jpg", alt: "Living con sofá y Smart TV", span: "hero" },
  { photo: "Dpto1/9.jpg", alt: "Dormitorio principal con cama matrimonial", span: "wide" },
  { photo: "Dpto1/1.jpg", alt: "Escalera de acceso a la planta alta", span: "tall" },
  { photo: "Dpto1/7.jpg", alt: "Dormitorio con cama matrimonial y cómoda", span: "wide" },
  { photo: "Dpto1/11.jpg", alt: "Baño con espejo redondo y bacha", span: "tall" },
  { photo: "Dpto1/6.jpg", alt: "Dormitorio con dos camas individuales", span: "wide" },
  { photo: "Dpto1/5.jpg", alt: "Dormitorio con espejo de cuerpo entero", span: "tall" },
  { photo: "Dpto1/21.jpg", alt: "Living con sofá y cuadro" },
  { photo: "Dpto1/14.jpg", alt: "Cocina equipada con mesada de granito", span: "tall" },
  { photo: "Dpto1/15.jpg", alt: "Comedor integrado a la cocina" },
  { photo: "Dpto1/19.jpg", alt: "Comedor para seis", span: "tall" },
  { photo: "Dpto1/4.jpg", alt: "Escritorio junto a la ventana" },
  { photo: "Dpto1/8.jpg", alt: "Dormitorio visto desde el pasillo" },
  { photo: "Dpto1/12.jpg", alt: "Ducha con mampara de vidrio", span: "tall" },
  { photo: "Dpto1/2.jpg", alt: "Ingreso con vista al comedor" },
  { photo: "Dpto1/17.jpg", alt: "Ducha tipo lluvia", span: "tall" },
  { photo: "Dpto1/16.jpg", alt: "Baño completo con inodoro y bidet" },
  { photo: "Dpto1/18.jpg", alt: "Toilette con espejo redondo" },
  { photo: "Dpto1/13.jpg", alt: "Inodoro y bidet" },
  { photo: "Dpto1/3.jpg", alt: "Puerta de acceso y comedor", span: "tall" },
  { photo: "Dpto1/22.jpg", alt: "Balcón con vista a la pileta", span: "tall" },
];

// Cabaña Tatú — carpeta Casa del bucket (11 fotos: 1-5, 7, 8, 13, 15, 18, 22).
// Dormitorios y baño van arriba y en formato grande (tall/wide) para darles
// protagonismo; la cuadrícula cierra pareja (4×5 desktop, 2×10 mobile).
const TATU_PHOTOS: GalleryPhoto[] = [
  { photo: "Casa/1.jpg", alt: "Comedor con vista al estar y la TV", span: "hero" },
  { photo: "Casa/8.jpg", alt: "Segundo dormitorio con cucheta", span: "tall" },
  { photo: "Casa/13.jpg", alt: "Baño completo con espejo y luz de tocador", span: "tall" },
  { photo: "Casa/15.jpg", alt: "Dormitorio principal con cama matrimonial", span: "wide" },
  { photo: "Casa/4.jpg", alt: "Living con sillones, TV y aire acondicionado", span: "tall" },
  { photo: "Casa/7.jpg", alt: "Cocina equipada con heladera y mesada completa", span: "wide" },
  { photo: "Casa/2.jpg", alt: "Comedor junto a la ventana con vista a la pileta", span: "tall" },
  { photo: "Casa/3.jpg", alt: "Comedor con vajillero de madera" },
  { photo: "Casa/5.jpg", alt: "Estar con sillones de madera" },
  { photo: "Casa/22.jpg", alt: "Pileta con la cabaña de fondo" },
  { photo: "Casa/18.jpg", alt: "Lateral de la cabaña con jardín" },
];

const UNIT_GALLERY: Partial<Record<UnitSlug, GalleryPhoto[]>> = {
  yvyra: YVYRA_PHOTOS,
  mberu: MBERU_PHOTOS,
  tatu: TATU_PHOTOS,
};

const SPAN_CLS: Record<NonNullable<GalleryPhoto["span"]>, string> = {
  hero: "col-span-2 row-span-2",
  wide: "col-span-2",
  tall: "row-span-2",
};

function useFeatValues(slug: UnitSlug, locale: string) {
  if (locale === "en") return UNIT_FEAT_EN[slug];
  if (locale === "pt") return UNIT_FEAT_PT[slug];
  return UNIT_FEAT[slug];
}

export function UnitDetail({ unit, locale }: { unit: Unit; locale: string }) {
  const t = useTranslations("departamento");
  const tn = useTranslations("nav");
  const feat = useFeatValues(unit.slug as UnitSlug, locale);

  // The other 2 units (excluding current)
  const others = UNITS.filter((u) => u.slug !== unit.slug);

  const services = t.raw("services") as string[];
  const extras = (UNIT_EXTRAS[locale] ?? UNIT_EXTRAS.es)[unit.slug as UnitSlug];
  const allServices = [...services, ...extras];
  const gallery = UNIT_GALLERY[unit.slug as UnitSlug];

  return (
    <div className="bg-marfil text-carbon">
      {/* ===== HEADER ===== */}
      <header className="mx-auto max-w-[1320px] px-5 pt-[120px] md:px-12 md:pt-[138px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-[10px] text-[12px] uppercase tracking-[.08em] text-bronce">
          <Link
            href="/#departamentos"
            className="text-bronce no-underline transition-colors duration-[250ms] hover:text-terracota"
          >
            {t("breadcrumb")}
          </Link>
          <span className="opacity-50">/</span>
          <span className="text-[#6b665d]">{unit.name}</span>
        </div>

        {/* H1 + subtitle + specs row */}
        <div className="mt-[22px] flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1
              className="font-display m-0 font-normal leading-[1.0] tracking-[-0.015em] text-carbon"
              style={{ fontSize: "clamp(40px,6vw,76px)" }}
            >
              {unit.name}
            </h1>
            <p
              className="font-display m-0 mt-[14px] font-light italic text-[#6b665d]"
              style={{ fontSize: "clamp(17px,2vw,23px)" }}
            >
              {t("subtitle")}
            </p>
          </div>

          {/* Specs */}
          <div className="flex items-end gap-7 md:gap-9">
            <div>
              <div className="text-[11px] uppercase tracking-[.18em] text-bronce">{t("specGuests")}</div>
              <div className="font-display mt-1 text-[26px]">{unit.specs.guests}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[.18em] text-bronce">{t("specBedroom")}</div>
              <div className="font-display mt-1 text-[26px]">{unit.specs.bedrooms}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[.18em] text-bronce">{t("specArea")}</div>
              <div className="font-display mt-1 text-[26px]">{unit.specs.area} m²</div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== GALERÍA EDITORIAL ===== */}
      {gallery ? (
        /* Cuadrícula asimétrica con todas las fotos reales */
        <Reveal>
          <section className="mx-auto max-w-[1320px] px-5 pt-8 md:px-12 md:pt-[42px]">
            <div className="grid grid-flow-dense grid-cols-2 auto-rows-[130px] gap-3 md:grid-cols-4 md:auto-rows-[210px] md:gap-4">
              {gallery.map(({ photo, alt, span }, i) => (
                <div
                  key={photo}
                  className={`overflow-hidden rounded-[4px] ${span ? SPAN_CLS[span] : ""}`}
                >
                  <ImageSlot label={alt} photo={photo} className="h-full w-full" priority={i === 0} />
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      ) : (
      <Reveal>
        <section className="mx-auto max-w-[1320px] px-5 pt-8 md:px-12 md:pt-[42px]">
          {/* Top row: 2fr / 1fr */}
          <div className="grid grid-cols-1 gap-3 md:h-[560px] md:grid-cols-[2fr_1fr] md:gap-4">
            <div className="h-[280px] overflow-hidden rounded-[4px] md:h-full">
              <ImageSlot label={`${unit.name} — interior`} className="h-full w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:grid-rows-2 md:gap-4">
              <div className="h-[150px] overflow-hidden rounded-[4px] md:h-full">
                <ImageSlot label={`${unit.name} — dormitorio`} className="h-full w-full" />
              </div>
              <div className="h-[150px] overflow-hidden rounded-[4px] md:h-full">
                <ImageSlot label={`${unit.name} — baño`} className="h-full w-full" />
              </div>
            </div>
          </div>

          {/* Bottom row: 3 equal */}
          <div className="mt-3 grid h-[110px] grid-cols-3 gap-3 md:mt-4 md:h-[240px] md:gap-4">
            <div className="overflow-hidden rounded-[4px]">
              <ImageSlot label={`${unit.name} — terraza`} className="h-full w-full" />
            </div>
            <div className="overflow-hidden rounded-[4px]">
              <ImageSlot label={`${unit.name} — piscina`} className="h-full w-full" />
            </div>
            <div className="overflow-hidden rounded-[4px]">
              <ImageSlot label={`${unit.name} — amenities`} className="h-full w-full" />
            </div>
          </div>

          {/* Second row: 2 equal (living + cocina) */}
          <div className="mt-3 grid h-[110px] grid-cols-2 gap-3 md:mt-4 md:h-[240px] md:gap-4">
            <div className="overflow-hidden rounded-[4px]">
              <ImageSlot label={`${unit.name} — living`} className="h-full w-full" />
            </div>
            <div className="overflow-hidden rounded-[4px]">
              <ImageSlot label={`${unit.name} — cocina`} className="h-full w-full" />
            </div>
          </div>

          {/* Second dormitorio full-width para recorte sutil */}
          <div className="mt-3 grid h-[180px] grid-cols-1 gap-3 md:mt-4 md:h-[300px] md:gap-4">
            <div className="overflow-hidden rounded-[4px]">
              <ImageSlot label={`${unit.name} — segundo dormitorio`} className="h-full w-full" />
            </div>
          </div>

          {/* Third row: 1fr / 2fr */}
          <div className="mt-3 grid grid-cols-1 gap-3 md:mt-4 md:h-[420px] md:grid-cols-[1fr_2fr] md:gap-4">
            <div className="h-[280px] overflow-hidden rounded-[4px] md:h-full">
              <ImageSlot label={`${unit.name} — comedor`} className="h-full w-full" />
            </div>
            <div className="h-[280px] overflow-hidden rounded-[4px] md:h-full">
              <ImageSlot label={`${unit.name} — estar`} className="h-full w-full" />
            </div>
          </div>
        </section>
      </Reveal>
      )}

      {/* ===== CONTENIDO + RESERVA ===== */}
      <section className="mx-auto max-w-[1320px] px-5 pb-16 pt-14 md:px-12 md:pb-[110px] md:pt-24">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1.55fr_1fr] lg:gap-[72px]">

          {/* LEFT — editorial + características + servicios */}
          <div>
            {/* El espacio */}
            <Reveal>
              <Kicker>{t("spaceTitle")}</Kicker>
              <p
                className="font-display m-0 mt-[22px] font-light leading-[1.45] text-[#3a3429]"
                style={{ fontSize: "clamp(22px,2.5vw,30px)" }}
              >
                {t(`spaceBody.${unit.slug}`)}
              </p>
            </Reveal>

            {/* Características */}
            <Reveal delay={0.08}>
              <div className="mt-16">
                <Kicker className="mb-7 block">{t("featuresTitle")}</Kicker>
                <div
                  className="grid grid-cols-1 gap-[1px] overflow-hidden rounded-[4px] border border-borde-claro sm:grid-cols-2"
                  style={{ background: "#E2DACE" }}
                >
                  {[
                    { label: t("featCapacity"), value: `${unit.specs.guests} ${t("specGuests").toLowerCase()}` },
                    { label: t("featBedroom"), value: feat.bedroom },
                    { label: t("featBath"), value: feat.bath },
                    { label: t("featView"), value: feat.view },
                    { label: t("featArea"), value: `${unit.specs.area} m²` },
                    { label: t("featExterior"), value: feat.exterior },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-marfil px-6 py-[22px]">
                      <div className="text-[12px] tracking-[.04em] text-bronce">{label}</div>
                      <div className="font-display mt-[6px] text-[22px] text-carbon">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Servicios */}
            <Reveal delay={0.12}>
              <div className="mt-16">
                <Kicker className="mb-7 block">{t("servicesTitle")}</Kicker>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-12">
                  {allServices.map((s: string) => (
                    <div
                      key={s}
                      className="flex items-center gap-[13px] border-b border-[#E7E0D4] pb-[15px]"
                    >
                      <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-terracota" />
                      <span className="text-[15px] text-[#3a3429]">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          {/* RIGHT — sticky booking card */}
          <StickyBookingCard unit={unit} />
        </div>
      </section>

      {/* ===== OTROS ALOJAMIENTOS ===== */}
      <section className="bg-arena-clara py-16 md:py-[110px]">
        <div className="mx-auto max-w-[1320px] px-5 md:px-12">
          <Reveal>
            <div className="mb-[52px] flex flex-wrap items-end justify-between gap-5">
              <h2
                className="font-display m-0 font-normal tracking-[-0.01em] text-carbon"
                style={{ fontSize: "clamp(28px,3.6vw,46px)" }}
              >
                {t("otherTitle")}
              </h2>
              <Link
                href="/#departamentos"
                className="inline-flex items-center gap-[9px] border-b border-[#c9bfae] pb-[5px] text-[13px] uppercase tracking-[.08em] text-carbon no-underline transition-[gap] duration-300 hover:gap-[16px]"
              >
                {tn("apartments")} →
              </Link>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-[30px]">
            {others.map((other, i) => (
              <Reveal key={other.slug} delay={i * 0.1}>
                <Link
                  href={`/departamentos/${other.slug}`}
                  className="block text-inherit no-underline transition-transform duration-500 ease-[cubic-bezier(.16,.84,.44,1)] hover:-translate-y-2"
                >
                  <div className="overflow-hidden rounded-[3px] bg-slot">
                    <ImageSlot label={other.name} className="h-[240px] w-full md:h-[360px]" />
                  </div>
                  <div className="mt-[18px] flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-display m-0 font-medium text-[26px] text-carbon">
                      {other.name}
                    </h3>
                    <span className="text-[13px] text-bronce">
                      ${new Intl.NumberFormat("es-AR").format(other.price)} {t("perNight")}
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
