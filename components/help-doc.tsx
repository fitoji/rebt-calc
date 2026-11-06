import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { BOE_ITC_BT_52, BOE_REBT, GUIA_BT_52 } from '@/components/source-note'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { HELP_GROUPS } from '@/lib/help-sections.mjs'
import { HELP_SHOTS } from '@/lib/help-shots.mjs'

/** Prose styles shared by every section, so the text keeps one rhythm. */
const PROSE = 'mt-4 space-y-4 text-[15px] leading-7 text-ink-subtle [&_code]:rounded-md [&_code]:bg-surface-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:text-ink [&_strong]:font-semibold [&_strong]:text-ink'

const LINK = 'font-medium text-brand underline underline-offset-4'

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-8 border-t border-line pt-10 first:border-t-0 first:pt-0">
      <h2 id={`${id}-title`} className="text-2xl font-bold tracking-tight text-ink">{title}</h2>
      <div className={PROSE}>{children}</div>
    </section>
  )
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">{children}</h3>
}

/**
 * One real screenshot of the app, cropped by `scripts/capture-help-shots.mjs`.
 *
 * `id` is typed against the generated manifest, so a section can never point at
 * an image that does not exist, and the intrinsic size always matches the file.
 */
function Shot({ id, alt, caption }: { id: keyof typeof HELP_SHOTS; alt: string; caption: ReactNode }) {
  const shot = HELP_SHOTS[id]

  return (
    <figure className="pt-2">
      <div className="overflow-hidden rounded-card border border-line bg-paper shadow-card">
        <Image
          src={shot.src}
          alt={alt}
          width={shot.width}
          height={shot.height}
          sizes="(min-width: 1024px) 768px, 100vw"
          className="block h-auto w-full"
        />
      </div>
      <figcaption className="mt-2 text-xs leading-5 text-ink-faint">{caption}</figcaption>
    </figure>
  )
}

function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="rounded-card border border-line bg-surface-muted/60 p-4 text-sm leading-6">
      <p className="mb-1 font-semibold text-ink">{title}</p>
      <div className="space-y-2 text-ink-subtle">{children}</div>
    </aside>
  )
}

function Steps({ items }: { items: { title: string; body: ReactNode }[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={item.title} className="flex gap-3">
          <span aria-hidden="true" className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">{index + 1}</span>
          <span>
            <strong className="font-semibold text-ink">{item.title}.</strong>{' '}{item.body}
          </span>
        </li>
      ))}
    </ol>
  )
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-ink-faint">
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
  )
}

function DataTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-surface-muted/70">
            {head.map(cell => (
              <th key={cell} scope="col" className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-line align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 text-ink-subtle">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Toc() {
  return (
    <ul className="space-y-4">
      {HELP_GROUPS.map(group => (
        <li key={group.title}>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">{group.title}</p>
          <ul className="space-y-1">
            {group.sections.map(section => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="block rounded-md py-0.5 text-sm text-ink-subtle transition-colors hover:text-brand">{section.title}</a>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}

export function HelpDoc() {
  return (
    <>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-paper focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-lg">Saltar al contenido</a>
      <SiteHeader>
        <Link href="/" className="group inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-mark hover:text-brand">
          <ArrowLeft aria-hidden="true" className="size-4 transition-transform motion-safe:group-hover:-translate-x-0.5" />
          Volver a la calculadora
        </Link>
      </SiteHeader>

      <main id="contenido" className="min-h-screen bg-surface-page text-ink">
        <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8 lg:py-14">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-brand">Guía de uso</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Cómo usar Electro-cálculos</h1>
            <p className="mt-4 text-base leading-7 text-ink-subtle">
              Esta guía recorre la app de principio a fin: qué calcula, cómo se rellena cada bloque de la previsión de cargas, cómo se dimensionan la LGA y las derivaciones individuales, y qué hace cada control de la cabecera.
            </p>
            <p className="mt-3 text-sm leading-6 text-ink-faint">
              Todas las imágenes son capturas de la propia aplicación, tomadas del edificio de ejemplo. Nada de lo que ves está dibujado a mano.
            </p>
          </div>

          <details className="mt-8 rounded-card border border-line bg-paper p-4 lg:hidden">
            <summary className="cursor-pointer text-sm font-semibold text-ink">Índice de la guía</summary>
            <nav aria-label="Índice de la guía" className="mt-4"><Toc /></nav>
          </details>

          <div className="mt-10 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-12">
            <nav aria-label="Índice de la guía" className="sticky top-8 hidden lg:block">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">En esta guía</p>
              <Toc />
            </nav>

            <div className="max-w-3xl space-y-12">
              <Section id="que-es" title="Qué calcula la app">
                <p>
                  Electro-cálculos es una calculadora de previsión de cargas para edificios de viviendas según el Reglamento Electrotécnico de Baja Tensión (RD 842/2002). Trabaja en tres pasos encadenados: primero suma la potencia prevista del edificio, después dimensiona la línea general y por último cada derivación individual.
                </p>
                <SubHeading>Lo que sí hace</SubHeading>
                <Bullets items={[
                  <>Previsión del edificio con los bloques P1 a P5 de la ITC-BT-10, cada uno con sus propios coeficientes.</>,
                  <>Línea General de Alimentación (ITC-BT-14): sección, protección, caída de tensión y elementos de la instalación.</>,
                  <>Una derivación individual (ITC-BT-15) por vivienda, local, garaje y servicios generales.</>,
                  <>Memoria en PDF, JSON, Markdown y texto simple, con los mismos números que ves en pantalla.</>,
                ]} />
                <SubHeading>Lo que no hace</SubHeading>
                <Bullets items={[
                  <>No firma el proyecto ni sustituye al técnico competente: el resultado es una propuesta de cálculo que hay que revisar y validar.</>,
                  <>No calcula cortocircuito, selectividad, protecciones diferenciales ni puesta a tierra.</>,
                  <>No corrige la intensidad admisible por temperatura ambiente o del terreno. Está explicado en <a href="#limites" className={LINK}>Límites y criterios de uso</a>.</>,
                ]} />
              </Section>

              <Section id="empezar" title="Empezar en cinco pasos">
                <p>El recorrido completo, de la pantalla en blanco a la memoria descargada:</p>
                <Steps items={[
                  { title: 'Revisa los parámetros', body: <>El botón <code>Parámetros de cálculo</code> fija la potencia de una vivienda básica y elevada, las densidades de locales y garajes, el alumbrado común y las leyendas de normativa. Si no tocas nada, se usan los valores del REBT.</> },
                  { title: 'Rellena la previsión', body: <>En la pestaña de previsión, añade viviendas, servicios generales, locales, garajes y plazas de recarga. El total del edificio se recalcula con cada cambio.</> },
                  { title: 'Elige el supuesto de enlace', body: <>Centralizado, parcial o de único usuario. Ese ajuste fija la caída máxima admisible de la LGA y de la DI.</> },
                  { title: 'Dimensiona las líneas', body: <>Las pestañas <code>LGA</code> y <code>DI</code> proponen la sección normalizada y la protección de cada línea. Puedes fijar la protección a mano si el proyecto ya la tiene decidida.</> },
                  { title: 'Exporta la memoria', body: <><code>Descargar memoria</code> genera el PDF paginado o los formatos de datos. Ver <a href="#exportar" className={LINK}>Exportar la memoria</a>.</> },
                ]} />
                <Shot
                  id="masthead"
                  alt="Cabecera de la aplicación con el nombre del producto, la referencia normativa de la pestaña activa, el conmutador Cálculo/Didáctico, el botón de tema y el botón de ayuda"
                  caption="La cabecera: referencia normativa de la pestaña activa, conmutador Cálculo/Didáctico, tema claro-oscuro y el botón de esta ayuda (el círculo con la interrogación)."
                />
                <Note title="Atajo para probar">
                  <p>El botón <code>Cargar ejemplo</code> rellena un edificio completo —viviendas, servicios generales, locales, garajes y plazas de recarga— para que puedas recorrer la app sin teclear nada. Todas las capturas de esta guía están hechas con ese ejemplo.</p>
                </Note>
              </Section>

              <Section id="prevision" title="La previsión del edificio">
                <p>
                  La previsión es la suma de cinco bloques independientes. Cada bloque se calcula con su criterio y sin reducciones cruzadas: la única simultaneidad que se aplica es la interna de cada uno.
                </p>
                <DataTable
                  head={['Bloque', 'Qué incluye', 'Simultaneidad']}
                  rows={[
                    ['P1 · Viviendas', 'Una fila por tipo de vivienda, con su grado de electrificación y la superficie por vivienda (informativa)', 'Coeficiente según el número de viviendas (ITC-BT-10 §2.2)'],
                    ['P2 · Servicios generales', 'Ascensores, motores, otras cargas y alumbrado de zonas comunes', '1, más el 25 % del motor más grande'],
                    ['P3 · Locales, oficinas e industrias', 'Superficie, previsión real declarada o mínimo por abonado', '1'],
                    ['P4 · Garajes', 'Superficie, tipo de ventilación y plazas (informativas)', '1'],
                    ['P5 · Recarga de vehículos', 'Plazas de aparcamiento y escenario de previsión', '1 sin SPL, 0,3 con SPL'],
                  ]}
                />
                <p>
                  El coeficiente de simultaneidad de las viviendas sale de la tabla de la ITC-BT-10: 1 vivienda vale 1, 5 viviendas valen 3,8, 11 viviendas valen 9,2 y 21 viviendas valen 15,3. A partir de ahí crece 0,5 por vivienda adicional. La app lo muestra junto a la potencia media y lo aplica de golpe: <strong>P1 = potencia media × coeficiente</strong>.
                </p>
              </Section>

              <Section id="p1" title="P1 · Viviendas">
                <p>
                  La tabla de viviendas es la base de todo el edificio. Cada fila tiene cinco campos: la descripción, el grado de electrificación, la potencia, la superficie de cada vivienda y el número de viviendas de ese tipo.
                </p>
                <Bullets items={[
                  <><strong>Grado de electrificación y potencia.</strong> La potencia se elige de la tabla A de la ITC-BT-25: <code>Básica</code> admite 5.750 W (25 A) o 7.360 W (32 A), y <code>Elevada</code> 9.200 W (40 A), 11.500 W (50 A) o 14.490 W (63 A).</>,
                  <><strong>Superficie (m²/viv.).</strong> Los metros cuadrados de una vivienda de ese tipo. Es un dato informativo: no entra en P1, y la tarjeta de superficie construida multiplica por el número de viviendas.</>,
                  <><strong>Viviendas (uds.).</strong> Cuántas viviendas son de ese tipo. El subtotal de la fila es potencia × unidades.</>,
                  <><strong>Coeficiente de simultaneidad.</strong> Se calcula solo, a partir del total de viviendas, y tiene su propia tabla en el botón de la derecha.</>,
                ]} />
                <Shot
                  id="viviendas"
                  alt="Tabla de viviendas con once filas, el grado de electrificación de cada una, su potencia en vatios, la superficie por vivienda, las unidades, el subtotal y las tarjetas de total de viviendas, potencia media, superficie construida y coeficiente de simultaneidad"
                  caption="P1 con el edificio de ejemplo: 11 viviendas, potencia media de 6.691 W y coeficiente 9,2, que dan 61.556 W."
                />
              </Section>

              <Section id="p2" title="P2 · Servicios generales">
                <p>
                  Los servicios generales son la parte del edificio que no es de nadie y es de todos: ascensores, motores, otras cargas y el alumbrado de portal y escalera.
                </p>
                <DataTable
                  head={['Concepto', 'Cómo se calcula']}
                  rows={[
                    ['Ascensores', '1,3 × la potencia nominal del motor del ascensor (ITC-BT-10)'],
                    ['Motores', 'Potencia nominal, y al mayor de todos se le suma un 25 % de su propia potencia (ITC-BT-47)'],
                    ['Otras cargas', 'Potencia declarada, sin reducción'],
                    ['Alumbrado de zonas comunes', 'Superficie × densidad en W/m² según portal o escalera y tipo de lámpara; las lámparas de descarga llevan además un factor de 1,8'],
                  ]}
                />
                <p>
                  Para los ascensores puedes elegir el tipo ITA de la tabla de la instrucción en lugar de teclear la potencia: el botón de tablas abre la referencia con la potencia de motor, la carga y las personas de cada tipo.
                </p>
                <Shot
                  id="servicios"
                  alt="Bloque de servicios generales con el ascensor, la lista de motores, las otras cargas y el alumbrado de zonas comunes, cada uno con su potencia y el total de P2"
                  caption="P2 con el edificio de ejemplo: ascensor con su coeficiente, motores, otras cargas y alumbrado común."
                />
              </Section>

              <Section id="p3" title="P3 · Locales, oficinas e industrias">
                <p>
                  Cada local es una fila con su tipo, su superficie y, si la tienes, la previsión real que ha declarado el futuro titular. La app se queda con el mayor de los tres valores: la previsión real, lo que sale de la superficie o el mínimo por abonado.
                </p>
                <DataTable
                  head={['Tipo', 'Densidad', 'Mínimo por abonado']}
                  rows={[
                    ['Comercial/oficina', '100 W/m²', '3.450 W'],
                    ['Industria', '125 W/m²', '10.350 W'],
                  ]}
                />
                <Shot
                  id="locales"
                  alt="Bloque de locales, oficinas e industrias con la descripción, el tipo, la superficie, la previsión real y la potencia prevista de cada local"
                  caption="P3: el tipo decide la densidad y el mínimo; la última columna muestra la potencia que entra en el cálculo."
                />
              </Section>

              <Section id="p4" title="P4 · Garajes">
                <p>
                  Los garajes se prevén por superficie y por cómo se ventilan, porque la ventilación es lo que determina la carga de los extractores.
                </p>
                <p>
                  Cada garaje lleva además el número de plazas. Es un dato informativo: no cambia la potencia de P4, que sale de la superficie, y sirve para el recuento de plazas construidas que la Guía-BT-52 (Anexo 2) usa en el mínimo del 10 % de recarga.
                </p>
                <DataTable
                  head={['Ventilación', 'Densidad', 'Mínimo']}
                  rows={[
                    ['Forzada', '20 W/m²', '3.450 W'],
                    ['Natural', '10 W/m²', '3.450 W'],
                  ]}
                />
                <Shot
                  id="garajes"
                  alt="Bloque de garajes con la descripción, el tipo de ventilación, el número de plazas, la superficie y la potencia prevista de cada garaje"
                  caption="P4: la columna de potencia ya aplica la densidad de la ventilación elegida y el mínimo por garaje."
                />
              </Section>

              <Section id="p5" title="P5 · Recarga de vehículos">
                <p>
                  La recarga del vehículo eléctrico entra en la previsión con la ITC-BT-52 (añadida por el RD 1053/2014): <strong>3.680 W por cada plaza</strong> de las que hay que prever. Cuántas plazas se consideran depende del escenario que elijas; el mínimo del 10 % lo fija el Anexo 2 de la Guía-BT-52.
                </p>
                <DataTable
                  head={['Escenario', 'Plazas consideradas', 'Simultaneidad']}
                  rows={[
                    ['Todas las plazas · sin SPL', 'Todas las del aparcamiento', '1'],
                    ['Todas las plazas · con SPL', 'Todas las del aparcamiento', '0,3'],
                    ['Mínimo 10 % de plazas', 'El 10 % de las plazas construidas', '1'],
                  ]}
                />
                <p>
                  El 10 % es el mínimo reglamentario de previsión de potencia: lo fija el Anexo 2 de la Guía-BT-52 para vivienda nueva con garaje en régimen de condominio, no un apartado de la ITC-BT-10. La preinstalación de conductos es otra obligación: el CTE (DB-HE 6) la lleva al 100 % de las plazas en residencial privado. Las dos opciones de «todas las plazas» son una previsión ampliada: tienen sentido cuando el promotor ya sabe que va a electrificar el aparcamiento completo y quiere dimensionar la LGA para ello. El SPL (sistema de protección de la línea) permite aplicar el 0,3 de la ITC-BT-52.
                </p>
                <Shot
                  id="irve"
                  alt="Bloque de recarga de vehículos eléctricos con las plazas de aparcamiento, las tres opciones de cálculo con su factor de simultaneidad y el total de P5"
                  caption="P5: el escenario elegido decide el número de plazas y el factor de simultaneidad. Aquí, 30 plazas sin SPL dan 110.400 W."
                />
              </Section>

              <Section id="parametros" title="Parámetros de cálculo">
                <p>
                  El diálogo de parámetros reúne todos los valores que la app usa por defecto. Cambiarlos afecta a toda la previsión de golpe y se guarda en este navegador.
                </p>
                <Bullets items={[
                  <><strong>Unidades de potencia.</strong> Vatios o kilovatios: cambia cómo se escriben y se ven las potencias, no el cálculo. El proyecto guardado y el JSON exportado siguen en vatios.</>,
                  <><strong>Viviendas y suministros.</strong> Potencia de una vivienda básica y de una elevada.</>,
                  <><strong>Locales, oficinas e industrias.</strong> Densidad por superficie y mínimo por abonado de cada tipo.</>,
                  <><strong>Garajes.</strong> Densidad con ventilación forzada y con ventilación natural.</>,
                  <><strong>Alumbrado de zonas comunes.</strong> Densidad de portal y escalera para incandescencia y para fluorescencia/LED, más el coeficiente de las lámparas de descarga.</>,
                  <><strong>Leyendas de normativa.</strong> Muestra u oculta el pie de fuente de cada tarjeta.</>,
                ]} />
                <p>
                  <code>Restaurar valores predeterminados</code> devuelve todos los parámetros a los del REBT sin tocar los datos del proyecto.
                </p>
                <Shot
                  id="parametros"
                  alt="Diálogo de parámetros de cálculo con los bloques de viviendas y suministros, locales y oficinas, garajes, alumbrado de zonas comunes y leyendas de normativa"
                  caption="Parámetros de cálculo: cada bloque agrupa los valores de una parte de la previsión."
                />
              </Section>

              <Section id="supuestos" title="Supuesto de instalación">
                <p>
                  Antes de dimensionar hay que decir cómo está resuelta la instalación, porque de eso dependen las caídas máximas admisibles. El supuesto no se elige suelto: se deriva de la card de <strong>formas de contadores</strong> (ITC-BT-16) que está al principio de la pestaña de la LGA. Ahí se dice si la medida es individual, concentrada en un lugar o en más de un lugar; de ahí salen el supuesto y el reparto de caídas.
                </p>
                <DataTable
                  head={['Supuesto de enlace', 'Caída en la LGA', 'Caída en la DI']}
                  rows={[
                    ['Contadores totalmente centralizados', '0,5 %', '1 %'],
                    ['Centralizaciones parciales (más de un lugar)', '1 %', '0,5 %'],
                    ['Único usuario sin LGA', 'No hay LGA', '1,5 %'],
                  ]}
                />
                <Note title="Tres detalles que ahorran dudas">
                  <p>La LGA se calcula siempre trifásica: es la línea que alimenta el edificio desde la caja general de protección.</p>
                  <p>En el supuesto de único usuario la pestaña <code>LGA</code> se desactiva, porque esa línea no existe: se pasa de la caja general a la derivación individual.</p>
                  <p>Cada derivación usa el sistema que le corresponde: las viviendas y los garajes, monofásicos; los servicios generales, trifásicos; los locales e industrias, según su tipo.</p>
                </Note>
              </Section>

              <Section id="contadores" title="Formas de contadores">
                <p>
                  Entre la LGA y las derivaciones individuales está la centralización de contadores. La card de la pestaña <code>LGA</code> recoge las formas de contadores de la ITC-BT-16 y avisa cuando la combinación no cumple: forma de colocación (individual, concentrada en un lugar o concentrada en más de un lugar), conjunto de medida (caja de protección y medida, local, armario, módulos o paneles), tipo de armario, número de contadores, concentraciones, planta y unidades funcionales. Debajo lista los requisitos del cuarto que la instrucción exige para el conjunto elegido.
                </p>
                <DataTable
                  head={['Regla', 'Límite']}
                  rows={[
                    ['Armario de contadores', 'Hasta 16 contadores por concentración'],
                    ['Más de 16 contadores', 'Local obligatorio'],
                    ['Edificios de más de 12 plantas', 'Se admite concentrar en plantas intermedias, 6 o más plantas por concentración'],
                    ['Interruptor general de maniobra', 'Obligatorio con más de dos usuarios: 160 A hasta 90 kW, 250 A hasta 150 kW'],
                    ['Montaje', '0,25 m del suelo y 1,80 m como máximo al cuadrante de lectura'],
                  ]}
                />
                <Note title="El número de contadores">
                  <p>La app lo propone desde la previsión: una unidad por vivienda, una por local, una para los servicios generales y otra para la infraestructura de recarga si hay plazas. Se puede fijar a mano y volver a la propuesta cuando quieras.</p>
                </Note>
              </Section>

              <Section id="lga" title="Línea General de Alimentación">
                <p>
                  La LGA es la línea que va de la caja general de protección al principio de las derivaciones individuales. La app calcula su sección y su protección con dos criterios a la vez: la caída de tensión al final de la línea y la intensidad admisible del conductor.
                </p>
                <SubHeading>Qué le tienes que decir</SubHeading>
                <DataTable
                  head={['Campo', 'Para qué sirve']}
                  rows={[
                    ['Potencia prevista (P)', 'La toma de la previsión del edificio, o la que escribas si pulsas «Editar manual»'],
                    ['Tensión entre fases', '400 V en trifásica'],
                    ['Factor de potencia (cos φ)', 'Entra en la intensidad de línea'],
                    ['Longitud de la línea', 'Del cuadro general al punto donde empiezan las derivaciones'],
                    ['Caída máxima admisible', 'La fija el supuesto de enlace'],
                    ['Conductividad (γ)', 'La fija el aislamiento: 48 m/(Ω·mm²) en PVC (cobre a 70 °C) y 44 en XLPE/EPR (cobre a 90 °C). No es editable'],
                    ['Tipo de instalación', 'Tabla A (al aire) o la fila de tubos enterrados de la misma tabla'],
                    ['Disposición de los circuitos', 'Tabla E (empotrados) o G (al aire)'],
                    ['Método de instalación', 'Columna de la tabla: A, B1, B2, C, E o F'],
                    ['Aislamiento', 'Fijo en XLPE: la ITC-BT-14 sólo admite RZ1-K o DZ1-K de 0,6/1 kV'],
                    ['Circuitos agrupados, capas y tubos', 'Factores de reducción de las tablas E, F, G, H e I'],
                    ['Protección de la línea (In)', '0 deja que la app elija; otro valor fija el interruptor que verifica Ib ≤ In ≤ Iz. No es el IGA.'],
                  ]}
                />
                <SubHeading>Qué te devuelve</SubHeading>
                <p>
                  Con la potencia P, la longitud L y la caída admisible ΔU, la sección por caída sale de <code>S = P · L / (γ · U · ΔU)</code> en trifásica y de <code>S = 2 · P · L / (γ · U · ΔU)</code> en monofásica. La app toma como sección la menor normalizada que cumple a la vez esa caída y la intensidad admisible corregida por el agrupamiento, así que el resultado nunca esconde un criterio incumplido detrás del escalón siguiente. En la tarjeta de resultados puedes fijar una sección mayor: el motor recalcula con ella la intensidad admisible, la caída, el neutro y el PE, y deja la sección automática a la vista como referencia.
                </p>
                <Bullets items={[
                  <><strong>Intensidad de cálculo (Ib) e intensidad admisible corregida (Iz).</strong> La corriente que la línea debe transportar y la que admite la sección elegida después de aplicar el agrupamiento, enfrentadas en la cabecera de la tarjeta.</>,
                  <><strong>Sección de fase.</strong> La que propone el cálculo o la que fijes a mano; al cambiarla se recalculan todos los conductores.</>,
                  <><strong>Conductores y caída de tensión.</strong> La sección de fase que pide la caída, la caída resultante frente al límite y el detalle de fase, neutro, protección y tubo.</>,
                  <><strong>Protección de la línea (In).</strong> El interruptor automático de la serie normalizada que protege esa sección, con la verificación Ib ≤ In ≤ Iz. No es el IGA ni el ICP: es el dispositivo que garantiza que el conductor no se sobrecargue.</>,
                ]} />
                <Shot
                  id="lga"
                  alt="Pestaña de la Línea General de Alimentación con todos sus campos a la izquierda y la tarjeta de resultado a la derecha, encabezada por la intensidad nominal, la máxima admisible y la sección de fase editable"
                  caption="LGA con el edificio del ejemplo: 70 mm² de fase, neutro de 35 mm² según la tabla 1, protección de 160 A y una caída del 0,48 % frente al 0,5 % permitido."
                />
                <p>
                  Cada campo que depende de una tabla lleva su botón con la referencia: <code>BT14-A·BT14-B</code> en el tipo de instalación, <code>E·G</code> en la disposición de circuitos y <code>G·H·I</code> en los tubos en contacto. El botón <code>Tablas</code> de la cabecera de la tarjeta abre las tablas de la ITC-BT-14, de la ITC-BT-15 y las de agrupamiento de la ITC-BT-19.
                </p>
                <Shot
                  id="tablas"
                  alt="Diálogo de tablas de referencia con la tabla A de la ITC-BT-14 de intensidades admisibles por sección y tipo de instalación"
                  caption="Tablas de referencia: la tabla A de la ITC-BT-14 para la LGA, las tablas C, D y E de la ITC-BT-15 para la derivación individual y las de agrupamiento de la ITC-BT-19."
                />
              </Section>

              <Section id="di" title="Derivaciones individuales">
                <p>
                  La app genera una derivación por cada suministro del proyecto: una por vivienda, una por local, una por garaje y una para los servicios generales. La lista de la izquierda es la del edificio; al elegir una, el panel de la derecha muestra sus campos y su resultado.
                </p>
                <Bullets items={[
                  <><strong>Potencia y cos φ.</strong> Salen de la previsión del suministro; puedes ajustarlos si el proyecto lo pide.</>,
                  <><strong>Longitud y caída máxima.</strong> La caída se toma del supuesto de enlace.</>,
                  <><strong>Aislamiento.</strong> PVC (70 °C) o XLPE/EPR (90 °C). Fija la temperatura máxima de servicio y, con ella, la conductividad del cálculo: 48 o 44 m/(Ω·mm²).</>,
                  <><strong>Neutro y conductor de protección.</strong> Sección del neutro y del PE que acompañan a la fase.</>,
                  <><strong>Hilo de mando.</strong> El conductor de mando para la discriminación horaria, con su sección.</>,
                  <><strong>Diámetro del tubo protector.</strong> El tubo por el que discurre la derivación; en la LGA el mínimo sale de la tabla 1 de la ITC-BT-14 y por debajo se avisa.</>,
                  <><strong>IGA de la vivienda.</strong> En las derivaciones de vivienda, el escalón de potencia fija el IGA (de 25 a 63 A) y con él la potencia máxima admisible, <code>230 × IGA</code>. El IGA no es el ICP: es el límite de diseño, no la potencia contratada.</>,
                ]} />
                <p>
                  El criterio de cálculo es el mismo que en la LGA, con los límites de la ITC-BT-15: sección mínima de 6 mm² tanto en monofásica como en trifásica, y la protección del cuadro de mando del abonado.
                </p>
                <Shot
                  id="di"
                  alt="Pestaña de derivaciones individuales con la lista de suministros del edificio a la izquierda y el panel de la derivación seleccionada a la derecha con su resultado"
                  caption="DI de una vivienda del ejemplo: la lista de suministros sale del proyecto y cada uno tiene su propia línea."
                />
              </Section>

              <Section id="interiores" title="Cuadros e instalación interior">
                <p>
                  La pestaña <code>Cuadros</code> tiene dos bloques. El primero muestra el cuadro de mando y protección (DGMP) de cada vivienda: el IGA que fija su escalón de potencia, el ICP que depende de la potencia contratada y los diferenciales que exige la ITC-BT-25. El segundo resuelve el cuadro interior de un local o de los servicios generales, que no tienen lista fija de circuitos: se cargan las cargas reales y cada una se dimensiona con la ITC-BT-19 (3 % en alumbrado, 5 % en los demás usos; 4,5 % y 6,5 % en industria alimentada en alta tensión con transformador propio), con la protección de la ITC-BT-22 y el diferencial de 30 mA de la ITC-BT-24. Arriba se muestran la potencia prevista del suministro y el IGA que le corresponde, y abajo el interruptor general que pide el conjunto de circuitos.
                </p>
                <DataTable
                  head={['Elemento', 'Criterio']}
                  rows={[
                    ['IGA', 'Tabla A de la ITC-BT-25 según el escalón; potencia máxima 230 × IGA'],
                    ['ICP', 'Envolvente precintable; su calibre lo fija la potencia contratada (ITC-BT-17)'],
                    ['Diferenciales', '30 mA, intensidad asignada ≥ IGA, uno por cada 5 circuitos'],
                    ['Sobretensiones', 'Solo cuando la ITC-BT-23 lo exige'],
                  ]}
                />
                <p>
                  Los únicos datos que se cargan a mano son la potencia contratada, el número de circuitos instalados y si lleva protección contra sobretensiones. El número de circuitos arranca en el valor del grado (5 en básica, 10 en elevada) y se puede cambiar. Debajo, la tabla de circuitos de la ITC-BT-25 muestra el nombre, el PIA, la sección mínima, el tubo, el máximo de puntos y la potencia por toma de cada circuito del grado; C13 aparece si el proyecto prevé recarga de vehículos. Cada fila admite la longitud del circuito: con ella se calcula la caída al 3 % a la intensidad del PIA y, si la sección de tabla no alcanza, se adopta la superior; si no hay sección en la serie, la caída se marca en rojo con el máximo permitido. Más abajo se cargan las estancias de la vivienda (salón, cocina, baños, dormitorios, pasillos, terrazas, garaje) con su superficie y longitud: la tabla 2 de la ITC-BT-25 calcula los puntos mínimos de luz y de tomas por circuito, y los circuitos que exige cada acumulado. La superficie de la vivienda sale de la previsión de cargas (m² por vivienda) y la card avisa si la suma de estancias la supera. El IGA y la potencia máxima salen del escalón de la vivienda; el ICP se muestra como la intensidad que implica la potencia contratada, no como un calibre inventado.
                </p>
              </Section>

              <Section id="esquema" title="Esquema unifilar">
                <p>
                  La pestaña <code>Esquema</code> dibuja el unifilar del edificio con los mismos resultados que ya
                  calcularon las pestañas anteriores: no vuelve a dimensionar nada. A la izquierda está la acometida
                  —la LGA con su protección y su cable—, de ella sale el embarrado general y de él cuelga una columna
                  por derivación individual. Cada columna muestra el contador, la protección de la línea, el
                  diferencial del cuadro del abonado y el receptor con su potencia.
                </p>
                <DataTable
                  head={['Rótulo', 'Qué es']}
                  rows={[
                    ['In', 'Protección de la línea (Ib ≤ In ≤ Iz), no el IGA de la vivienda'],
                    ['IGA', 'Escalón de potencia de la vivienda; solo se rotula si difiere de In'],
                    ['IΔn · 30 mA', 'Sensibilidad del diferencial del cuadro del abonado (ITC-BT-24)'],
                    ['ΔU', 'Caída de tensión de la línea, frente al límite de su supuesto'],
                    ['Conforme / Revisar', 'Si el dimensionado de esa línea cumple todos sus criterios'],
                  ]}
                />
                <p>
                  El color identifica el tipo de suministro —vivienda, local, servicios generales, garaje, recarga de
                  vehículos o derivación manual— y la leyenda bajo la lámina lo repite. Los símbolos siguen la norma
                  UNE-EN 60617. Si el proyecto todavía no tiene derivaciones, la pestaña ofrece generarlas desde la
                  previsión. En el suministro de único usuario no hay LGA y la lámina lo refleja: de la caja general
                  se pasa a la medida individual y al embarrado, sin inventar una línea que el proyecto no tiene. La
                  lámina crece a lo ancho y se desplaza en horizontal, así que en un edificio con muchas viviendas hay
                  que arrastrarla para ver el final.
                </p>
              </Section>

              <Section id="seccion" title="Cómo se elige la sección">
                <p>
                  La sección de una línea no sale de una sola fórmula: tiene que cumplir tres cosas a la vez, y la app adopta la primera sección comercial que las cumple todas. Si ninguna las cumple, no devuelve la mayor de la tabla: avisa de qué criterio falla.
                </p>
                <DataTable
                  head={['Criterio', 'De dónde sale', 'Qué significa']}
                  rows={[
                    ['Sección mínima', 'ITC-BT-14 §3 para la LGA; ITC-BT-15 §3 para la derivación', 'Un suelo normativo que no depende de la carga'],
                    ['Caída de tensión', 'La fórmula de la pestaña, con γ y la longitud', 'Que la tensión al final de la línea quede dentro del límite del supuesto de enlace'],
                    ['Intensidad admisible', 'La tabla de la propia instrucción de la línea', 'Que el conductor no se caliente por encima de lo que admite su aislamiento'],
                  ]}
                />
                <p>
                  La tarjeta, la memoria y el JSON muestran el momento eléctrico <code>M = P(kW) · L</code> y el <code>γ</code> con el que se calculó: son las dos columnas con las que el ELEC-3 justifica la sección. Y cuando fijas la protección en el formulario, la caída se comprueba además con la intensidad del dispositivo (<code>In</code>) y no sólo con la de la carga, que es como la Guía-BT-25 escribe el momento de un circuito (<code>M = 230 · In · L</code>) y como están hechas sus tablas de longitudes máximas. La tarjeta muestra las dos caídas y dice cuál decidió la sección; con la protección en automático, la de <code>In</code> se informa pero no cambia el resultado.
                </p>
                <SubHeading>El mínimo no depende de si hay una o tres fases</SubHeading>
                <p>
                  La ITC-BT-14 dice, textualmente, que «la sección mínima será de 10 mm² en cobre o 16 mm² en aluminio», y la ITC-BT-15 que «la sección mínima será de 6 mm² para los cables polares, neutro y protección y de 1,5 mm² para el hilo de mando». Son mínimos de la línea, no del sistema: una LGA monofásica sigue necesitando 10 mm² de cobre y una derivación trifásica se conforma con 6.
                </p>
                <SubHeading>Qué tabla se lee en cada caso</SubHeading>
                <p>
                  Las guías de la ITC-BT-14 y de la ITC-BT-15 no remiten sólo a la tabla general: publican sus propias intensidades para los cables que esas líneas pueden usar. La LGA se lee en la tabla A (cobre) o B (aluminio) de la ITC-BT-14, y la derivación en la tabla C si el cable es ES07Z1-K, en la tabla D si es RZ1-K unipolar y en la tabla E cuando va enterrada, que es el cable multiconductor que la instrucción pide en ese caso. Cuando la combinación no está publicada —un método distinto del B, una LGA monofásica, una sección fuera del rango— la app cae en la tabla A de la ITC-BT-19. El botón <code>Tablas</code> muestra unas y otras con el documento del que sale cada una.
                </p>
                <Note title="La conductividad sale del aislamiento, no de una preferencia">
                  El anexo 2 de la Guía Técnica de Aplicación del REBT pide calcular con la conductividad de la temperatura más desfavorable, es decir, la máxima de servicio del conductor: 48 m/(Ω·mm²) para el cobre con aislamiento termoplástico (PVC, 70 °C) y 44 para el termoestable (XLPE/EPR, 90 °C). La ITC-BT-07 fija esas dos temperaturas máximas. La app aplica la que corresponde al aislamiento elegido y muestra el valor en el panel, sin campo editable: usar la de 20 °C (56) pediría una sección menor de la que el conductor soporta en servicio, y la de 90 °C sobre un cable de PVC lo haría trabajar por encima de su límite. La LGA va siempre a 44 porque la ITC-BT-14 sólo admite cable XLPE.
                </Note>
                <SubHeading>Neutro y conductor de protección</SubHeading>
                <p>
                  En la LGA el neutro no se escribe a mano: sale de la tabla 1 de la ITC-BT-14, que lo fija en torno al 50 % de la fase con mínimos por escalón (10→10, 16→10, 25→16, 50→25, 120→70, 240→120). En la derivación individual el neutro tiene la misma sección que la fase, salvo que se justifique la ausencia de desequilibrios y armónicos. El conductor de protección, en ambos casos, sale de la tabla 2 de la ITC-BT-18: igual a la fase hasta 16 mm², 16 mm² hasta 35 mm² y la mitad de la fase por encima. La instrucción añade que, si esa mitad no cae en una sección normalizada, se toma la superior más próxima, así que una fase de 95 mm² lleva PE de 50 mm² y una de 150 mm² lleva 95 mm²: pedir 48 o 75 sería pedir un cable que no existe.
                </p>
                <Note title="Lo que la app todavía no distingue">
                  El cálculo no separa cable unipolar de multiconductor fuera del caso enterrado, y no aplica la corrección por temperatura ambiente de la tabla B de la ITC-BT-19, cuya guía no está entre los documentos de referencia del proyecto. Si el proyecto necesita esa corrección, conviene comprobarla a mano antes de firmar la memoria.
                </Note>
              </Section>

              <Section id="explicacion" title="Modo cálculo y modo didáctico">
                <p>
                  El conmutador <code>Cálculo</code> / <code>Didáctico</code> de la cabecera decide cuánto detalle enseña la app. En modo cálculo ves los resultados; en modo didáctico aparece además, debajo de cada bloque, el desarrollo del cálculo.
                </p>
                <p>
                  Ese desarrollo tiene tres partes: la fórmula que se aplica, los valores sustituidos y el criterio que ha decidido el resultado. Sirve para justificar un número en la memoria, para revisar un cálculo ajeno o para estudiar cómo se llega a la sección que propone la app.
                </p>
                <p>
                  En las líneas recorre los mismos pasos que pide el ELEC-3: el momento eléctrico, la sección por caída con su parcial y su total, la tabla de candidatas con la razón por la que cada una se descarta, los conductores con su designación y el diámetro del tubo, la protección y la caída con <code>In</code> —que es la que decide la sección cuando la protección está fijada—. En las derivaciones de vivienda añade el IGA del escalón de potencia y la potencia máxima admisible.
                </p>
                <p>
                  En <strong>formas de contadores</strong> desarrolla la colocación elegida, el conjunto de medida, el supuesto de enlace que se deriva con sus caídas, las comprobaciones de la ITC-BT-16 y los requisitos del cuarto. Es el mismo texto que sale en la página 6.1 del PDF.
                </p>
                <Shot
                  id="didactico"
                  alt="Desarrollo del cálculo en modo didáctico, con la fórmula aplicada, los valores sustituidos y el criterio que decide el resultado"
                  caption="Modo didáctico: el mismo cálculo, explicado paso a paso. Los números no cambian, solo el detalle."
                />
                <Note title="Se recuerda entre sesiones">
                  <p>El modo se guarda en este navegador, igual que el tema: si lo dejas en didáctico, la próxima vez que abras la app seguirá en didáctico.</p>
                </Note>
              </Section>

              <Section id="apariencia" title="Tema claro y oscuro">
                <p>
                  El botón de la luna y el sol de la cabecera alterna entre tema claro y oscuro. La elección se guarda en el navegador y se aplica antes de pintar la página, así que no hay destello blanco al recargar.
                </p>
                <p>
                  Los dos temas usan la misma paleta de tokens y mantienen el contraste de texto y controles por encima del mínimo de las WCAG. Ningún cálculo depende del tema.
                </p>
              </Section>

              <Section id="exportar" title="Exportar la memoria">
                <p>
                  <code>Descargar datos</code> abre las cuatro salidas. Todas llevan los mismos números que ves en pantalla; cambia el formato, no el contenido.
                </p>
                <DataTable
                  head={['Formato', 'Para qué sirve']}
                  rows={[
                    ['PDF', 'Memoria técnica paginada: previsión P1 a P5, parámetros y desarrollo de las líneas. Incluye el membrete si rellenaste los datos del proyecto.'],
                    ['JSON', 'Datos crudos del proyecto y de los cálculos. Es el único formato que se puede volver a cargar en la app.'],
                    ['Markdown', 'Texto estructurado con tablas, para pegar en un issue, un README o el repositorio del proyecto.'],
                    ['Texto simple', 'Notas de obra sin formato, para abrir en cualquier editor.'],
                  ]}
                />
                <p>
                  <code>Cargar proyecto</code>, debajo de <code>Limpiar</code>, abre el selector de archivos y acepta ese JSON: restaura los datos del proyecto, la previsión, la LGA, la DI y las derivaciones. Reemplaza el proyecto en curso y no tiene deshacer, así que descarga antes el JSON del que tengas abierto. Si el archivo no es válido no se carga nada y el motivo aparece bajo el botón. Los parámetros de cálculo no se tocan: son tuyos, no del archivo.
                </p>
                <p>
                  El membrete del PDF se configura en <code>Datos de la memoria técnica → Editar datos del proyecto</code>: nombre de la empresa, logo y datos del proyecto. Ese botón también contiene la opción de limpiar los datos del proyecto.
                </p>
              </Section>

              <Section id="datos" title="Dónde se guardan los datos">
                <p>
                  Todo se guarda en tu navegador, en el almacenamiento local del propio equipo. No hay servidor, no hay cuenta y nada de lo que escribes se sube a ninguna parte.
                </p>
                <Bullets items={[
                  <><strong>Cálculos.</strong> En la clave <code>electrocalc-inputs:v1</code>, en cada cambio.</>,
                  <><strong>Datos del proyecto y membrete.</strong> En <code>electrocalc-project-info</code>.</>,
                  <><strong>Preferencias.</strong> El tema en <code>electrocalc-theme</code> y el modo en <code>electrocalc-explanation-mode</code>.</>,
                ]} />
                <p>
                  La consecuencia práctica es que el proyecto vive en ese navegador y en ese perfil: si cambias de equipo o borras los datos del navegador, se va con ellos. Para conservarlo, descarga el JSON o el PDF.
                </p>
              </Section>

              <Section id="limites" title="Límites y criterios de uso">
                <p>
                  Preferimos decirlo antes de que te lo encuentres: hay dos cosas que la app no corrige y conviene tener presentes al firmar un cálculo.
                </p>
                <SubHeading>Corrección por temperatura</SubHeading>
                <p>
                  Las intensidades admisibles de la tabla A suponen 40 °C de temperatura ambiente y las de la tabla D suponen un terreno a 25 °C, con 1,5 K·m/W de resistividad térmica y 70 cm de profundidad. La UNE 20460-5-523 corrige esos valores con las tablas A.52-14 (aire) y A.52-16 (suelo), que la Guía-BT-19 no reproduce; por eso la app no las aplica. En un tendido a más temperatura de la supuesta, la intensidad real es menor que la de tabla y la sección hay que corregirla a mano.
                </p>
                <SubHeading>Aluminio enterrado</SubHeading>
                <p>
                  La tabla A es solo de cobre. El aluminio aparece únicamente en la tabla D, para conductores enterrados bajo tubo con aislamiento XLPE.
                </p>
                <SubHeading>Lo que queda fuera del alcance</SubHeading>
                <Bullets items={[
                  'Cortocircuito y poder de corte de las protecciones.',
                  'Selectividad entre la protección general y las de cada derivación.',
                  'Puesta a tierra, diferenciales y protección contra contactos indirectos.',
                  'Cualquier comprobación que dependa de la empresa distribuidora: la app calcula, no tramita.',
                ]} />
                <Note title="El resultado es una propuesta">
                  <p>Los números son un punto de partida técnicamente fundado, no un proyecto. La validación final es del técnico competente que firma la memoria y, en su caso, de la empresa distribuidora.</p>
                </Note>
              </Section>

              <Section id="fuentes" title="Normativa y fuentes">
                <p>Las reglas que aplica la app salen de estos textos:</p>
                <Bullets items={[
                  <><a href={BOE_REBT} target="_blank" rel="noopener noreferrer" className={LINK}>RD 842/2002 · Reglamento Electrotécnico de Baja Tensión<span className="sr-only"> (se abre en una pestaña nueva)</span></a>, con sus instrucciones técnicas complementarias ITC-BT-10 (previsión de cargas), ITC-BT-14 (LGA), ITC-BT-15 (derivaciones individuales), ITC-BT-16 (centralización de contadores), ITC-BT-19 (intensidades admisibles) y ITC-BT-47 (motores).</>,
                  <><a href={BOE_ITC_BT_52} target="_blank" rel="noopener noreferrer" className={LINK}>RD 1053/2014<span className="sr-only"> (se abre en una pestaña nueva)</span></a>, que añadió al REBT la infraestructura para la recarga del vehículo eléctrico (ITC-BT-52).</>,
                  <><a href={GUIA_BT_52} target="_blank" rel="noopener noreferrer" className={LINK}>Guía-BT-52, Anexo 2<span className="sr-only"> (se abre en una pestaña nueva)</span></a>, que fija en el 10 % de las plazas construidas la previsión de potencia mínima para la recarga en vivienda nueva.</>,
                  <>Guía-BT-19 del Ministerio de Industria, Turismo y Comercio (febrero de 2009, revisión 2), que reproduce las tablas de la UNE 20460-5-523:2004 que la instrucción aplica.</>,
                ]} />
                <p className="pt-2 text-sm text-ink-faint">
                  ¿Falta algo en esta guía o hay un número que no cuadra? Es el momento de decirlo: la guía se versiona con la app y las capturas se regeneran desde la aplicación real con <code>scripts/capture-help-shots.mjs</code>.
                </p>
              </Section>
            </div>
          </div>

          <div className="mt-14 border-t border-line pt-6">
            <Link href="/" className={`group inline-flex items-center gap-2 ${LINK}`}><ArrowLeft aria-hidden="true" className="size-4 transition-transform motion-safe:group-hover:-translate-x-0.5" />Volver a la calculadora</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
