#!/usr/bin/env node

/**
 * MCP Excel Server — fitoji/rebt-calc
 *
 * Provides Excel (.xlsx) operations for the REBT Calculator:
 * - Read sheets and data from existing xlsx files
 * - Write/project data to new or existing xlsx files
 * - List project files in a directory
 * - Create a pre-formatted REBT project Excel from calculator data
 *
 * Protocol: MCP over stdio (JSON-RPC)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import ExcelJS from 'exceljs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExcelCell {
  value: string | number | boolean | Date | null
  type: string
}

interface ExcelRow {
  rowNumber: number
  cells: Record<string, ExcelCell>
}

interface SheetData {
  name: string
  rowCount: number
  columns: string[]
  rows: ExcelRow[]
}

interface ReadExcelResult {
  file: string
  path: string
  sheetCount: number
  sheets: SheetData[]
}

interface WriteCell {
  value: string | number | boolean | Date | null
  bold?: boolean
  fontColor?: string
  bgColor?: string
  align?: 'left' | 'center' | 'right'
  border?: boolean
}

interface WriteRow {
  cells: (WriteCell | string | number | null)[]
  bold?: boolean
}

interface WriteSheet {
  name: string
  headers?: string[]
  rows: WriteRow[]
  columnWidths?: number[]
}

interface WriteExcelOptions {
  sheets: WriteSheet[]
  creator?: string
  title?: string
}

interface ProjectListItem {
  name: string
  path: string
  size: number
  modified: Date
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cellToJson(cell: ExcelJS.Cell): ExcelCell {
  const value = cell.value
  let type = 'unknown'

  if (value === null || value === undefined) {
    type = 'empty'
  } else if (typeof value === 'string') {
    type = 'string'
  } else if (typeof value === 'number') {
    type = 'number'
  } else if (value instanceof Date) {
    type = 'date'
  } else if (typeof value === 'boolean') {
    type = 'boolean'
  } else if (typeof value === 'object') {
    // Hyperlink, formula result, etc.
    type = 'object'
  }

  return { value: value as string | number | boolean | Date | null, type }
}

function colLetter(index: number): string {
  let letter = ''
  let num = index + 1
  while (num > 0) {
    const mod = (num - 1) % 26
    letter = String.fromCharCode(65 + mod) + letter
    num = Math.floor((num - 1) / 26)
  }
  return letter
}

function getCellAddress(row: number, col: number): string {
  return `${colLetter(col)}${row}`
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

async function readExcelTool(args: {
  path: string
  sheetName?: string
  maxRows?: number
}): Promise<ReadExcelResult> {
  const { path, sheetName, maxRows = 500 } = args

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path)

  const sheets: SheetData[] = []
  const targetSheets = sheetName
    ? workbook.worksheets.filter((s) => s.name === sheetName)
    : workbook.worksheets

  for (const worksheet of targetSheets) {
    const rows: ExcelRow[] = []
    let maxCol = 0

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > maxRows) return

      const cells: Record<string, ExcelCell> = {}
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        cells[colLetter(colNumber - 1)] = cellToJson(cell)
        if (colNumber > maxCol) maxCol = colNumber
      })

      rows.push({ rowNumber, cells })
    })

    const columns = Array.from({ length: maxCol }, (_, i) => colLetter(i))

    sheets.push({
      name: worksheet.name,
      rowCount: worksheet.rowCount,
      columns,
      rows,
    })
  }

  return {
    file: path.split('/').pop() ?? path,
    path,
    sheetCount: sheets.length,
    sheets,
  }
}

async function writeExcelTool(args: {
  path: string
  options: WriteExcelOptions
}): Promise<{ success: boolean; path: string }> {
  const { path, options } = args

  const workbook = new ExcelJS.Workbook()
  workbook.creator = options.creator ?? 'REBT-Calculator MCP'
  workbook.created = new Date()
  workbook.title = options.title ?? 'REBT Project'

  for (const sheetDef of options.sheets) {
    const worksheet = workbook.addWorksheet(sheetDef.name)

    // Column widths
    if (sheetDef.columnWidths) {
      sheetDef.columnWidths.forEach((width, i) => {
        worksheet.getColumn(i + 1).width = width
      })
    }

    // Headers
    if (sheetDef.headers) {
      const headerRow = worksheet.addRow(sheetDef.headers)
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF082F49' }, // brand color
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        }
      })
      headerRow.height = 20
    }

    // Data rows
    for (const rowDef of sheetDef.rows) {
      const row = worksheet.addRow(
        rowDef.cells.map((c) => {
          if (c === null || c === undefined) return ''
          if (typeof c === 'object' && 'value' in c) return c.value ?? ''
          return c
        })
      )

      row.eachCell((cell, colNumber) => {
        const source = rowDef.cells[colNumber - 1]
        if (source && typeof source === 'object' && 'bold' in source) {
          cell.font = { bold: source.bold ?? false }
        }
        if (source && typeof source === 'object' && 'bgColor' in source) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: source.bgColor },
          }
        }
        if (source && typeof source === 'object' && 'align' in source) {
          cell.alignment = { horizontal: source.align ?? 'left' }
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        }
      })
    }
  }

  await workbook.xlsx.writeFile(path)
  return { success: true, path }
}

async function listProjectsTool(args: {
  directory: string
}): Promise<{ directory: string; projects: ProjectListItem[] }> {
  const { directory } = args
  const fs = await import('fs/promises')
  const pathModule = await import('path')

  let entries: ProjectListItem[] = []

  try {
    const files = await fs.readdir(directory)
    const xlsxFiles = files.filter((f) => f.endsWith('.xlsx'))

    for (const file of xlsxFiles) {
      const fullPath = pathModule.join(directory, file)
      const stat = await fs.stat(fullPath)
      entries.push({
        name: file,
        path: fullPath,
        size: stat.size,
        modified: stat.mtime,
      })
    }

    entries.sort((a, b) => b.modified.getTime() - a.modified.getTime())
  } catch (err) {
    // Directory doesn't exist — return empty list
  }

  return { directory, projects: entries }
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: 'excel-mcp-server',
    version: '1.0.0',
    description: 'Excel file operations for REBT Calculator — read, write, and manage .xlsx files',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'read_excel',
        description:
          'Read data from an Excel (.xlsx) file. Returns all sheets or a specific sheet with row/column data as JSON. Use this to load existing Excel files into the calculator.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Absolute or relative path to the .xlsx file',
            },
            sheetName: {
              type: 'string',
              description: 'Optional: read only this sheet name',
            },
            maxRows: {
              type: 'number',
              description: 'Maximum rows to read per sheet (default: 500)',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_excel',
        description:
          'Write structured data to an Excel (.xlsx) file. Creates a new file or overwrites existing. Supports multiple sheets, headers with styled formatting, borders, and cell styling. Use this to export project data as an Excel report.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Absolute or relative path for the output .xlsx file',
            },
            options: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Workbook title' },
                creator: { type: 'string', description: 'Document author' },
                sheets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Sheet name' },
                      headers: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Column headers for row 1',
                      },
                      columnWidths: {
                        type: 'array',
                        items: { type: 'number' },
                        description: 'Column widths',
                      },
                      rows: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            cells: {
                              type: 'array',
                              description:
                                'Cell values. Can be primitive (string/number) or object {value, bold, bgColor, align}',
                            },
                            bold: { type: 'boolean' },
                          },
                        },
                      },
                    },
                  },
                },
              },
              required: ['sheets'],
            },
          },
          required: ['path', 'options'],
        },
      },
      {
        name: 'list_projects',
        description:
          'List all .xlsx project files in a directory, sorted by most recently modified. Use this to discover existing REBT projects.',
        inputSchema: {
          type: 'object',
          properties: {
            directory: {
              type: 'string',
              description: 'Directory path to scan for .xlsx files',
            },
          },
          required: ['directory'],
        },
      },
    ],
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'read_excel': {
        const result = await readExcelTool(args as Parameters<typeof readExcelTool>[0])
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'write_excel': {
        const result = await writeExcelTool(args as Parameters<typeof writeExcelTool>[0])
        return {
          content: [
            {
              type: 'text',
              text: `✅ Archivo creado: ${result.path}`,
            },
          ],
        }
      }

      case 'list_projects': {
        const result = await listProjectsTool(args as Parameters<typeof listProjectsTool>[0])
        const lines = result.projects.map(
          (p) =>
            `- ${p.name} (${(p.size / 1024).toFixed(1)} KB) — ${p.modified.toLocaleDateString('es-ES')}`
        )
        const body =
          lines.length > 0
            ? `📁 ${result.directory}\n\n${lines.join('\n')}`
            : `📁 ${result.directory}\n\nNo hay archivos .xlsx en este directorio.`
        return {
          content: [{ type: 'text', text: body }],
        }
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    }
  }
})

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // Keep process alive — MCP stdio protocol manages lifecycle
}

main().catch((err) => {
  console.error('MCP Excel Server fatal error:', err)
  process.exit(1)
})
