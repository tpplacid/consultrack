import { NextResponse } from 'next/server'

// TEMPORARY debug route — remove after fixing login issue
export async function GET() {
  const pw = process.env.SUPERADMIN_PASSWORD
  return NextResponse.json({
    set: !!pw,
    length: pw?.length ?? 0,
    first2: pw ? pw.slice(0, 2) : null,
    last2:  pw ? pw.slice(-2)   : null,
  })
}
