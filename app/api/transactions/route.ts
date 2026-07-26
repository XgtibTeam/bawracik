import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getMembers, saveMembers, getBranches, getStoreProfile, getVouchers, saveVouchers } from '@/lib/jsonbin';
import { insertTransaction, getPricingConfig } from '@/lib/supabase';
import { hitungCheckout, hitungDiskonVoucher, hitungPoinDariMl, updatePengisian, type ChargeableItem } from '@/lib/calc';
import { buildWaMessage, buildWaLink } from '@/lib/wa-template';
import { normalizeWa } from '@/lib/phone';
import type { TransactionItem } from '@/lib/types';

// Body (dipakai kasir maupun self-checkout customer):
// {
//   cabangId: string,
//   items: [{ namaParfum, ml, hargaPerMl }],   // atau isi harga & kasir konversi ml di frontend
//   ukuranBotolMl?: number,                    // kalau pakai botol, biaya otomatis
//   tipe: 'grosir' | 'ecer',
//   member?: { wa, nama } | { id }             // opsional (grosir tidak dihitung member)
// }
export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
    const isStaff = session && ['superadmin', 'admin', 'kasir'].includes(session.role);

    const body = await req.json();
    const cabangId = body?.cabangId || session?.cabangId;
    const items: ChargeableItem[] = body?.items;
    const ukuranBotolMl = body?.ukuranBotolMl ? Number(body.ukuranBotolMl) : undefined;
    const tipe: 'grosir' | 'ecer' = body?.tipe === 'grosir' ? 'grosir' : 'ecer';

    if (!cabangId) {
      return NextResponse.json({ error: 'Cabang wajib dipilih' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Item belanja kosong' }, { status: 400 });
    }

    const branches = await getBranches();
    const branch = branches.find((b) => b.id === cabangId);
    if (!branch) {
      return NextResponse.json({ error: 'Cabang tidak ditemukan' }, { status: 400 });
    }

    const pricingConfig = await getPricingConfig();
    const calc = hitungCheckout(items, pricingConfig, ukuranBotolMl);

    // ---- Member (hanya dihitung kalau tipe = ecer) ----
    let member = null as Awaited<ReturnType<typeof getMembers>>[number] | null;
    let pengisianKeArr: number[] = [];
    let poinDariTransaksi = 0;

    if (tipe === 'ecer' && body?.member) {
      const members = await getMembers();
      if (body.member.id) {
        member = members.find((m) => m.id === body.member.id) ?? null;
      } else if (body.member.wa) {
        const waNormal = normalizeWa(body.member.wa);
        member = members.find((m) => normalizeWa(m.wa) === waNormal) ?? null;
        if (!member && body.member.nama) {
          member = {
            id: randomUUID(),
            nama: body.member.nama,
            wa: waNormal,
            poinTotal: 0,
            poinSaatIni: 0,
            pengisianKe: 0,
            totalPenukaran: 0,
            riwayat: [],
            kodeReferral: Math.floor(10000 + Math.random() * 90000).toString(),
            createdAt: new Date().toISOString(),
          };
          members.push(member);
        }
      }

      if (member) {
        poinDariTransaksi = hitungPoinDariMl(calc.totalMl);
        const jumlahBotol = items.length; // 1 item parfum = 1 botol/pengisian
        const { pengisianKe, totalPenukaranTambahan } = updatePengisian(member.pengisianKe, jumlahBotol);

        for (let i = 1; i <= jumlahBotol; i++) {
          const seq = member.pengisianKe + i;
          pengisianKeArr.push(seq > 10 ? ((seq - 1) % 10) + 1 : seq);
        }

        member.poinTotal += poinDariTransaksi;
        if (totalPenukaranTambahan > 0) {
          // Pengisian menyentuh kelipatan 10 -> poin saat ini direset, mulai hitung ulang
          member.poinSaatIni = poinDariTransaksi;
        } else {
          member.poinSaatIni += poinDariTransaksi;
        }
        member.pengisianKe = pengisianKe;
        member.totalPenukaran += totalPenukaranTambahan;

        const txId = randomUUID();
        member.riwayat.push({
          tanggal: new Date().toISOString(),
          parfum: items.map((it) => it.namaParfum),
          totalMl: calc.totalMl,
          totalHarga: calc.totalHarga,
          pengisianKe: pengisianKeArr[pengisianKeArr.length - 1] ?? 0,
          poinDidapat: poinDariTransaksi,
          cabangId,
          transactionId: txId,
        });

        await saveMembers(members);
      }
    }

    // ---- Voucher (opsional, divalidasi ulang di server — jangan percaya nilai dari client) ----
    let diskon = 0;
    let voucherCode: string | undefined;
    const voucherInput = typeof body?.voucherCode === 'string' ? body.voucherCode.trim() : '';
    let vouchersUntukUpdate: Awaited<ReturnType<typeof getVouchers>> | null = null;
    let voucherIdxUntukUpdate = -1;

    if (voucherInput) {
      const vouchers = await getVouchers();
      const idx = vouchers.findIndex((v) => v.code === voucherInput);
      const voucher = idx >= 0 ? vouchers[idx] : null;
      if (!voucher) {
        return NextResponse.json({ error: 'Kode voucher tidak ditemukan' }, { status: 400 });
      }
      if (!voucher.aktif) {
        return NextResponse.json({ error: 'Voucher tidak aktif' }, { status: 400 });
      }
      if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
        return NextResponse.json({ error: 'Voucher sudah kedaluwarsa' }, { status: 400 });
      }
      if (member && voucher.dipakaiOleh.includes(member.id)) {
        return NextResponse.json({ error: 'Voucher sudah pernah dipakai member ini' }, { status: 400 });
      }

      diskon = hitungDiskonVoucher(calc.totalHarga, voucher);
      voucherCode = voucher.code;
      vouchersUntukUpdate = vouchers;
      voucherIdxUntukUpdate = idx;
    }

    const totalSetelahDiskon = Math.max(0, calc.totalHarga - diskon);

    // ---- Simpan transaksi ke Supabase (rekap) ----
    const transactionId = randomUUID();
    const txItems: TransactionItem[] = calc.items.map((it) => ({
      productId: it.productId,
      namaParfum: it.namaParfum,
      ml: it.ml,
      hargaPerMl: it.hargaPerMl,
      ukuranBotolMl: it.ukuranBotolMl,
      subtotal: it.subtotal,
    }));

    await insertTransaction({
      id: transactionId,
      cabangId,
      karyawanId: isStaff ? session!.username : null,
      memberId: member?.id ?? null,
      items: txItems,
      totalMl: calc.totalMl,
      totalHarga: totalSetelahDiskon,
      biayaBotol: calc.biayaBotol,
      tipe,
      metodeCheckout: isStaff ? 'kasir' : 'self',
      voucherCode,
      createdAt: new Date().toISOString(),
    });

    // Tandai voucher sudah dipakai member ini (kalau ada member) — dilakukan
    // setelah transaksi berhasil tersimpan supaya tidak "termakan" kalau insert gagal.
    if (vouchersUntukUpdate && voucherIdxUntukUpdate >= 0 && member) {
      vouchersUntukUpdate[voucherIdxUntukUpdate] = {
        ...vouchersUntukUpdate[voucherIdxUntukUpdate],
        dipakaiOleh: [...vouchersUntukUpdate[voucherIdxUntukUpdate].dipakaiOleh, member.id],
      };
      await saveVouchers(vouchersUntukUpdate);
    }

    // ---- Bangun link WA (E-Struk view-only + notifikasi member) ----
    let waLink: string | null = null;
    let waMessage: string | null = null;
    if (member) {
      const storeProfile = await getStoreProfile();
      waMessage = buildWaMessage({
        namaToko: storeProfile.namaToko || 'Racik Parfum',
        alamatToko: branch.alamat || branch.nama,
        namaMember: member.nama,
        parfumList: items.map((it) => it.namaParfum),
        hargaPerMl: items[0]?.hargaPerMl ?? 0,
        pengisianKe: pengisianKeArr,
        poinDariTransaksi,
        poinTotalAkumulasi: member.poinTotal,
      });
      waLink = buildWaLink(member.wa, waMessage);
    }

    return NextResponse.json({
      transactionId,
      calc: { ...calc, diskon, totalSetelahDiskon },
      voucherCode,
      member,
      waLink,
      waMessage,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
