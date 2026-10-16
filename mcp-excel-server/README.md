# MCP Excel Server

Servidor MCP (Model Context Protocol) para operaciones con archivos Excel (.xlsx) en REBT Calculator.

## Herramientas disponibles

### `read_excel`
Lee datos de un archivo Excel y los devuelve como JSON estructurado.

```json
{
  "path": "/ruta/al/archivo.xlsx",
  "sheetName": "Hoja1",      // opcional: leer solo una hoja
  "maxRows": 500              // opcional: límite de filas
}
```

### `write_excel`
Escribe datos estructurados en un archivo Excel con formato profesional.

```json
{
  "path": "/ruta/salida/proyecto.xlsx",
  "options": {
    "title": "Mi Proyecto REBT",
    "creator": "REBT-Calculator",
    "sheets": [
      {
        "name": "Resumen",
        "headers": ["Concepto", "Valor", "Unidad"],
        "columnWidths": [30, 20, 15],
        "rows": [
          { "cells": ["Viviendas", 12345, "W"], "bold": false },
          { "cells": ["Total", { "value": 67890, "bold": true }, "W"] }
        ]
      }
    ]
  }
}
```

### `list_projects`
Lista archivos `.xlsx` en un directorio.

```json
{ "directory": "/ruta/a/proyectos" }
```

---

## Instalación

```bash
cd mcp-excel-server
pnpm install
pnpm build
```

## Configuración en Pi

Agregar en `~/.pi/mcp.json` o en la configuración de MCP del proyecto:

```json
{
  "mcpServers": {
    "excel": {
      "command": "node",
      "args": ["/ruta/absoluta/a/mcp-excel-server/dist/index.js"],
      "env": {
        "EXCEL_PROJECTS_DIR": "./projects"
      }
    }
  }
}
```

## Uso directo desde terminal

```bash
# Listar herramientas
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js

# Listar proyectos en un directorio
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_projects","arguments":{"directory":"/ruta/a/proyectos"}}}' | node dist/index.js

# Leer archivo Excel
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"read_excel","arguments":{"path":"/ruta/archivo.xlsx","maxRows":100}}}' | node dist/index.js
```

## Dependencias

- `@modelcontextprotocol/sdk` — Protocolo MCP stdio
- `exceljs` — Lectura/escritura de archivos .xlsx
