// ============================================================
// Logika finalisasi transaksi (dipakai bareng oleh POST /api/transactions
// checkout langsung oleh kasir, DAN oleh PATCH /api/pesanan saat kasir
// meng-ACC pesanan self-checkout). Supaya poin member, pengisian ke-berapa,
// voucher, dan simpan ke Supabase konsisten di kedua jalur checkout ini.
// ============================================================

import { randomUUID } from 'crypto';
import { getMembers, saveMembers, getBranches, getStoreProfile, getVouchers, saveVouchers } from './jsonbin';
import { insertTransaction, getPricingConfig } from './supabase';
import { hitungCheckout, hitungDiskonVoucher, hitungPoinDariMl, updatePengisian, type ChargeableItem } from './calc';
import { buildWaMessage, buildWaLink } from './wa-template';
import { normalizeWa } from './phone';
import type { TransactionItem } from './types';

export type FinalizeCheckoutInput = {
  cabangId: string;
  items: ChargeableItem[];
  ukuranBotolMl?: number;
  tipe: 'grosir' | 'ecer';
  member?: { id?: string; wa?: string; nama?: string };
  voucherCode?: string;
  karyawanId: string | null; // username kasir yang melayani, atau null utk self-checkout langsung (tidak dipakai lagi di alur Pesanan)
  metodeCheckout: 'kasir' | 'self';
};

export async function finalizeCheckout(input: FinalizeCheckoutInput) {
  const branches = await getBranches();
  const branch = branches.find((b) => b.id === input.cabangId);
  if (!branch) throw new Error('Cabang tidak ditemukan');

  const pricingConfig = await getPricingConfig();
  const calc = hitungCheckout(input.items, pricingConfig, input.ukuranBotolMl);

  let member = null as Awaited<ReturnType<typeof getMembers>>[number] | null;
  let pengisianKeArr: number[] = [];
  let poinDariTransaksi = 0;

  if (input.tipe === 'ecer' && input.member) {
    const members = await getMembers();
    if (input.member.id) {
      member = members.find((m) => m.id === input.member!.id) ?? null;
    } else {
      const waNormal = input.member.wa ? normalizeWa(input.member.wa) : '';
      if (waNormal) {
        member = members.find((m) => normalizeWa(m.wa) === waNormal) ?? null;
      }
      if (!member && input.member.nama) {
        member = {
          id: randomUUID(),
          nama: input.member.nama,
          wa: waNormal,
          poinTotal: 0,
          poinSaatIni: 0,
          pengisianKe: 0,
          totalPenukaran: 0,
          penukaranTerpakai: 0,
          riwayat: [],
          kodeReferral: Math.floor(10000 + Math.random() * 90000).toString(),
          createdAt: new Date().toISOString(),
        };
        members.push(member);
      }
    }

    if (member) {
      poinDariTransaksi = hitungPoinDariMl(calc.totalMl);
      const jumlahBotol = input.items.length;
      const { pengisianKe, totalPenukaranTambahan } = updatePengisian(member.pengisianKe, jumlahBotol);

      for (let i = 1; i <= jumlahBotol; i++) {
        const seq = member.pengisianKe + i;
        pengisianKeArr.push(seq > 10 ? ((seq - 1) % 10) + 1 : seq);
      }

      member.poinTotal += poinDariTransaksi;
      if (totalPenukaranTambahan > 0) {
        member.poinSaatIni = poinDariTransaksi;
      } else {
        member.poinSaatIni += poinDariTransaksi;
      }
      member.pengisianKe = pengisianKe;
      member.totalPenukaran += totalPenukaranTambahan;

      const txId = randomUUID();
      member.riwayat.push({
        tanggal: new Date().toISOString(),
        parfum: input.items.map((it) => it.namaParfum),
        totalMl: calc.totalMl,
        totalHarga: calc.totalHarga,
        pengisianKe: pengisianKeArr[pengisianKeArr.length - 1] ?? 0,
        poinDidapat: poinDariTransaksi,
        cabangId: input.cabangId,
        transactionId: txId,
      });

      await saveMembers(members);
    }
  }

  let diskon = 0;
  let voucherCode: string | undefined;
  const voucherInput = (input.voucherCode || '').trim();
  let vouchersUntukUpdate: Awaited<ReturnType<typeof getVouchers>> | null = null;
  let voucherIdxUntukUpdate = -1;

  if (voucherInput) {
    const vouchers = await getVouchers();
    const idx = vouchers.findIndex((v) => v.code === voucherInput);
    const voucher = idx >= 0 ? vouchers[idx] : null;
    if (!voucher) throw new Error('Kode voucher tidak ditemukan');
    if (!voucher.aktif) throw new Error('Voucher tidak aktif');
    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) throw new Error('Voucher sudah kedaluwarsa');
    if (member && voucher.dipakaiOleh.includes(member.id)) throw new Error('Voucher sudah pernah dipakai member ini');

    diskon = hitungDiskonVoucher(calc.totalHarga, voucher);
    voucherCode = voucher.code;
    vouchersUntukUpdate = vouchers;
    voucherIdxUntukUpdate = idx;
  }

  const totalSetelahDiskon = Math.max(0, calc.totalHarga - diskon);

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
    cabangId: input.cabangId,
    karyawanId: input.karyawanId,
    memberId: member?.id ?? null,
    items: txItems,
    totalMl: calc.totalMl,
    totalHarga: totalSetelahDiskon,
    biayaBotol: calc.biayaBotol,
    tipe: input.tipe,
    metodeCheckout: input.metodeCheckout,
    voucherCode,
    createdAt: new Date().toISOString(),
  });

  if (vouchersUntukUpdate && voucherIdxUntukUpdate >= 0 && member) {
    vouchersUntukUpdate[voucherIdxUntukUpdate] = {
      ...vouchersUntukUpdate[voucherIdxUntukUpdate],
      dipakaiOleh: [...vouchersUntukUpdate[voucherIdxUntukUpdate].dipakaiOleh, member.id],
    };
    await saveVouchers(vouchersUntukUpdate);
  }

  let waLink: string | null = null;
  let waMessage: string | null = null;
  if (member && member.wa) {
    const storeProfile = await getStoreProfile();
    waMessage = buildWaMessage({
      namaToko: storeProfile.namaToko || 'Racik Parfum',
      alamatToko: branch.alamat || branch.nama,
      namaMember: member.nama,
      parfumList: input.items.map((it) => it.namaParfum),
      hargaPerMl: input.items[0]?.hargaPerMl ?? 0,
      pengisianKe: pengisianKeArr,
      poinDariTransaksi,
      poinTotalAkumulasi: member.poinTotal,
    });
    waLink = buildWaLink(member.wa, waMessage);
  }

  return {
    transactionId,
    calc: { ...calc, diskon, totalSetelahDiskon },
    voucherCode,
    member,
    waLink,
    waMessage,
  };
}
