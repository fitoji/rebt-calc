# Electro-cálculos · Previsión de cargas (ITC-BT-10)

Calculadora web **open source** para calcular la **previsión de cargas eléctricas** de un edificio en **baja tensión**, conforme a las tablas y criterios de la **ITC-BT-10 del REBT** (Reglamento Electrotécnico de Baja Tensión, España).

Diseñada para instaladores, ingenieros y proyectistas: cargas los datos del proyecto y obtienes el desglose de potencia al instante, sin hojas de cálculo frágiles y sin enviar tus datos a ningún servidor.

---

## Quick path

1. Clona e instala las dependencias:

   ```bash
   git clone https://github.com/fitoji/rebt-calc.git
   cd rebt-calc
   pnpm install
   ```

2. Levanta el servidor de desarrollo:

   ```bash
   pnpm dev
   ```

3. Abre [http://localhost:3000](http://localhost:3000). Verás la calculadora **Electro-cálculos** cargada con un ejemplo de edificio; edita cualquier campo y el resultado se recalcula en tiempo real.

---

## Qué calcula

La herramienta desglosa la potencia prevista en cinco bloques (códigos **P1**–**P5**) y suma el total del suministro:

| Código | Concepto        | Criterio de cálculo                                                                 |
|:------:|-----------------|-------------------------------------------------------------------------------------|
| **P1** | Viviendas       | Potencia media por vivienda × **coeficiente de simultaneidad** (según nº de viviendas). |
| **P2** | Servicios generales | Ascensores, motores y otras cargas, con coeficientes propios (×1,3 · ×1,25 · ×1,8).   |
| **P3** | Locales y oficinas | Se toma el **mayor** entre previsión real, W/m² o mínimo por abonado.                |
| **P4** | Garajes         | Potencia por superficie según ventilación (**forzada** o **natural**), con mínimo por suministro. |
| **P5** | IRVE            | Recarga de vehículos eléctricos: todas las plazas (con o sin simultaneidad) o mínimo 10 %. |
| —      | **TOTAL**       | `P1 + P2 + P3 + P4 + P5`                                                            |

Valores por defecto de referencia (todos editables desde *Parámetros de cálculo*):

- Electrificación **básica**: 5.750 W · Electrificación **elevada**: 9.200 W
- Locales: mínimo **3.450 W** por abonado
- Garaje ventilación **forzada**: 20 W/m² · **natural**: 10 W/m²
- IRVE: **3.680 W** por plaza
- Conversión CV → W: **735,5 W/CV**

---

## Funcionalidades

- **Cinco secciones de entrada**: viviendas, servicios generales (ascensores, motores, otras cargas), locales/oficinas, garajes e IRVE. Añade y elimina filas libremente.
- **Parámetros editables**: ajusta potencias, superficiales y coeficientes a tu proyecto. Se guardan en el navegador (`localStorage`).
- **Resultado en vivo**: panel lateral con el total y el desglose P1–P5 mientras escribes.
- **Memoria técnica en PDF**: genera un informe A4 con cabecera de empresa, logo, tablas de detalle y paginación (vía `jsPDF`).
- **Exportar / importar JSON**: descarga los datos del proyecto y los cálculos para retomarlos después.
- **Datos de proyecto**: empresa, contacto, dirección de obra y logo, persistidos localmente.
- **100 % en el navegador**: sin backend, sin base de datos, sin envío de datos a terceros. Ideal para obra con acceso limitado.

---

## Stack tecnológico

| Capa      | Tecnología                                              |
|-----------|---------------------------------------------------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) + React 19 |
| Lenguaje  | TypeScript                                              |
| Estilos   | Tailwind CSS v4 + shadcn/ui                             |
| Iconos    | lucide-react                                            |
| PDF       | jsPDF + jspdf-autotable                                 |
| Analytics | Vercel Analytics (solo producción)                      |

---

## Estructura del proyecto

```
.
├── app/
│   ├── layout.tsx          # Metadatos, iconos y Analytics
│   ├── page.tsx            # Página principal
│   └── globals.css         # Estilos globales y utilidades (field, label…)
├── components/
│   ├── load-calculator.tsx # Toda la lógica de cálculo y la UI
│   └── ui/                 # Componentes base (shadcn/ui)
├── data/
│   └── *.xlsx              # Hoja de cálculo original de referencia
├── lib/utils.ts            # Utilidades (cn, etc.)
└── public/                 # Iconos e imágenes
```

La calculadora vive casi por completo en `components/load-calculator.tsx`. El motor de cálculo es una función pura (`useMemo`) que transforma las entradas en el desglose P1–P5, lo que facilita testearlo y modificarlo.

---

## Desarrollo

```bash
pnpm dev      # Servidor de desarrollo (hot reload)
pnpm build    # Build de producción
pnpm start    # Sirve el build de producción
```

> **Nota**: `next.config.mjs` incluye `typescript.ignoreBuildErrors: true`. Antes de abrir un PR, ejecuta `pnpm build` y comprueba que no aparecen errores reales de tipos.

---

## Contribuciones

Este proyecto es **código abierto** y las contribuciones son bienvenidas. Cualquier mejora de cálculo, corrección normativa, accesibilidad, i18n o de interfaz ayuda a la comunidad de instalación eléctrica.

### Cómo contribuir

1. Haz un **fork** del repositorio.
2. Crea una rama para tu cambio:

   ```bash
   git checkout -b feat/mi-mejora
   ```

3. Implementa el cambio. Si alteras el motor de cálculo, **explica la referencia normativa** en la descripción de la PR.
4. Comprueba que la app compila (`pnpm build`) y que el cálculo sigue siendo coherente con la hoja de cálculo de referencia en `data/`.
5. Abre un **Pull Request** describiendo:
   - qué problema resuelve,
   - la referencia normativa (si aplica),
   - cómo lo has verificado.

### Directrices

- **Precisión normativa ante todo**: cualquier cambio en coeficientes o fórmulas debe citar la ITC-BT-10 (u otra norma aplicable) y justificarse. Ante la duda, abre un *issue* antes de invertir trabajo.
- **Mantén el alcance acotado**: un PR por cambio. Prefiere varias PRs pequeñas a una gigante.
- **Conserva el cálculo como función pura**: si tocas la lógica, evita efectos secundarios dentro del `useMemo` de cálculo.
- **Idioma de los artifacts**: código, nombres de archivo, comentarios y mensajes de commit en **inglés**; la interfaz de usuario permanece en **español**.
- **Commits convencionales**: `feat:`, `fix:`, `docs:`, `refactor:`, etc.

### Reportar errores

¿Has encontrado una discrepancia con la hoja de cálculo o un fallo en la interfaz? Abre un **issue** indicando:

- datos de entrada que has usado,
- resultado esperado (y la referencia normativa),
- resultado que devuelve la app,
- navegador y versión si es relevante.

---

## Aviso legal y responsabilidad

Esta herramienta es un **auxilio de cálculo** basado en los criterios generales de la ITC-BT-10. Los valores por defecto son orientativos y **deben ajustarse a cada proyecto**. La responsabilidad de la correcta aplicación de la normativa y de la instalación recae siempre en el técnico competente. El proyecto se ofrece "tal cual", sin garantías.

---

## Licencia

Código abierto bajo licencia **MIT**. Puedes usar, modificar y distribuir el proyecto libremente conservando el aviso de copyright.

---

## Enlaces

- **Repositorio**: [github.com/fitoji/rebt-calc](https://github.com/fitoji/rebt-calc)
- **Hoja de referencia**: [`data/Prevision_de_cargas_ITC-BT10.xlsx`](data/)
- **Normativa**: [ITC-BT-10 del REBT](https://www.boe.es/buscar/act.php?id=BOE-A-2002-24681) (BOE)
