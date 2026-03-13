'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import Papa from 'papaparse'
import type { Category, ImportLog } from '@/lib/types'

interface RawRow {
  [key: string]: string
}

interface MappedRow {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category_id?: string
  valid: boolean
  error?: string
}

interface Props {
  categories: Category[]
  importLogs: ImportLog[]
}

const emptyMapping = { date: '', description: '', amount: '', type: '', category: '' }

export function ImporClient({ categories, importLogs: initialLogs }: Props) {
  const [logs, setLogs] = useState(initialLogs)
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<RawRow[]>([])
  const [mapping, setMapping] = useState(emptyMapping)
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([])  // full dataset for import
  const [previewRows, setPreviewRows] = useState<MappedRow[]>([]) // first 100 for display only
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'done'>('upload')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    parseFile(f)
  }

  async function parseFile(f: File) {
    const ext = f.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      Papa.parse<RawRow>(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setHeaders(results.meta.fields ?? [])
          setRows(results.data)
          setStep('mapping')
        },
        error: () => toast.error('Gagal membaca file CSV'),
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      try {
        const ExcelJS = (await import('exceljs')).default
        const workbook = new ExcelJS.Workbook()
        const buffer = await f.arrayBuffer()
        await workbook.xlsx.load(buffer)
        const worksheet = workbook.worksheets[0]
        const jsonRows: RawRow[] = []
        let headerRow: string[] = []

        worksheet.eachRow((row, rowNumber) => {
          const values = (row.values as (string | null | undefined)[]).slice(1).map(v => String(v ?? ''))
          if (rowNumber === 1) {
            headerRow = values
          } else {
            const obj: RawRow = {}
            headerRow.forEach((h, i) => { obj[h] = values[i] ?? '' })
            jsonRows.push(obj)
          }
        })

        setHeaders(headerRow)
        setRows(jsonRows)
        setStep('mapping')
      } catch {
        toast.error('Gagal membaca file Excel')
      }
    } else {
      toast.error('Format file tidak didukung. Gunakan CSV atau XLSX.')
    }
  }

  function buildMappedRows() {
    const mapRow = (row: RawRow): MappedRow => {
      const dateVal = mapping.date ? row[mapping.date] : ''
      const descVal = mapping.description ? row[mapping.description] : ''
      const amountVal = mapping.amount ? row[mapping.amount] : ''
      const typeVal = mapping.type ? row[mapping.type]?.toLowerCase() : ''

      const amount = parseFloat(amountVal?.replace(/[^0-9.-]/g, '') ?? '')

      let type: 'income' | 'expense' = 'expense'
      if (typeVal?.includes('masuk') || typeVal?.includes('income') || typeVal?.includes('pemasukan') || typeVal === 'in') {
        type = 'income'
      } else if (typeVal?.includes('keluar') || typeVal?.includes('expense') || typeVal?.includes('pengeluaran') || typeVal === 'out') {
        type = 'expense'
      }

      const categoryName = mapping.category ? row[mapping.category] : ''
      const matchedCategory = categories.find(c =>
        c.name.toLowerCase() === categoryName?.toLowerCase()
      )

      const isValidDate = dateVal ? !isNaN(new Date(dateVal).getTime()) : false
      const isValidAmount = !isNaN(amount) && amount > 0

      return {
        date: dateVal || new Date().toISOString().split('T')[0],
        description: descVal || '',
        amount: isValidAmount ? Math.abs(amount) : 0,
        type,
        category_id: matchedCategory?.id,
        valid: isValidDate && isValidAmount,
        error: !isValidDate ? 'Tanggal tidak valid' : !isValidAmount ? 'Jumlah tidak valid' : undefined,
      }
    }

    const allMapped = rows.map(mapRow)
    setMappedRows(allMapped)
    setPreviewRows(allMapped.slice(0, 100))
    setStep('preview')
  }

  async function handleImport() {
    const validRows = mappedRows.filter(r => r.valid)
    if (validRows.length === 0) {
      toast.error('Tidak ada baris valid untuk diimpor')
      return
    }

    setImporting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sesi tidak valid'); setImporting(false); return }

    const inserts = validRows.map(r => ({
      user_id: user.id,
      amount: r.amount,
      type: r.type,
      description: r.description,
      date: r.date,
      source: 'import' as const,
      category_id: r.category_id ?? null,
    }))

    const { error: insertError } = await supabase.from('transactions').insert(inserts)

    if (insertError) {
      toast.error('Gagal mengimpor: ' + insertError.message)
      setImporting(false)
      return
    }

    const { data: logData } = await supabase
      .from('import_logs')
      .insert({
        user_id: user.id,
        filename: file?.name ?? 'unknown',
        row_count: validRows.length,
        status: 'done',
      })
      .select()
      .single()

    if (logData) setLogs(l => [logData, ...l])

    toast.success(`${validRows.length} transaksi berhasil diimpor!`)
    setStep('done')
    setImporting(false)
  }

  function reset() {
    setFile(null)
    setHeaders([])
    setRows([])
    setMapping(emptyMapping)
    setMappedRows([])
    setPreviewRows([])
    setStep('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      {/* Upload step */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload File</CardTitle>
            <CardDescription>
              Export Google Sheets kamu sebagai CSV (File → Download → CSV) atau XLSX, lalu upload di sini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Klik untuk memilih file</p>
              <p className="text-sm text-muted-foreground mt-1">Format: CSV atau XLSX</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />
          </CardContent>
        </Card>
      )}

      {/* Column mapping step */}
      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pemetaan Kolom</CardTitle>
            <CardDescription>
              Cocokkan kolom dari file <strong>{file?.name}</strong> ({rows.length} baris) dengan field yang dibutuhkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                ['date', 'Tanggal *'],
                ['amount', 'Jumlah *'],
                ['description', 'Deskripsi'],
                ['type', 'Tipe (income/expense)'],
                ['category', 'Kategori'],
              ] as [keyof typeof mapping, string][]).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-sm font-medium">{label}</label>
                  <Select
                    value={mapping[key] || 'none'}
                    onValueChange={(v) => setMapping(m => ({ ...m, [key]: v === 'none' ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kolom" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tidak dipetakan</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={reset}>Batalkan</Button>
              <Button onClick={buildMappedRows} disabled={!mapping.date || !mapping.amount}>
                Pratinjau Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview step */}
      {step === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pratinjau</CardTitle>
            <CardDescription>
              {mappedRows.filter(r => r.valid).length} dari {mappedRows.length} baris siap diimpor
              {mappedRows.filter(r => !r.valid).length > 0 && (
                <span className="text-destructive"> ({mappedRows.filter(r => !r.valid).length} baris tidak valid akan dilewati)</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto max-h-80 rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i} className={!row.valid ? 'opacity-50' : ''}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-sm">{row.date}</TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">{row.description || '—'}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${row.type === 'income' ? 'text-green-500' : 'text-red-400'}`}>
                          {row.type === 'income' ? 'Masuk' : 'Keluar'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(row.amount)}
                      </TableCell>
                      <TableCell>
                        {row.valid
                          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                          : <div className="flex items-center gap-1.5"><XCircle className="h-4 w-4 text-destructive" /><span className="text-xs text-destructive">{row.error}</span></div>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {mappedRows.length > 100 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                Pratinjau menampilkan 100 baris pertama. Seluruh {mappedRows.length} baris akan diimpor.
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('mapping')}>Kembali</Button>
              <Button onClick={handleImport} disabled={importing || mappedRows.filter(r => r.valid).length === 0}>
                {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengimpor...</> : (
                  <><Upload className="h-4 w-4 mr-2" />Impor {mappedRows.filter(r => r.valid).length} Transaksi</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Done step */}
      {step === 'done' && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="p-4 rounded-full bg-green-500/10">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg">Impor Berhasil!</p>
              <p className="text-sm text-muted-foreground">Data transaksi sudah tersimpan.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>Impor Lagi</Button>
              <Button onClick={() => window.location.href = '/transaksi'}>Lihat Transaksi</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import history */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riwayat Impor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{log.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{log.row_count} baris</span>
                    <Badge variant={log.status === 'done' ? 'default' : 'destructive'}>
                      {log.status === 'done' ? 'Berhasil' : log.status === 'error' ? 'Gagal' : 'Proses'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
