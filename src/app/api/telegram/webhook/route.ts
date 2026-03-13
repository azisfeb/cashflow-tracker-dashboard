import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'Belum diimplementasi',
      hint: 'Webhook Telegram akan diaktifkan di fase berikutnya. Schema database sudah siap.',
    },
    { status: 501 }
  )
}
