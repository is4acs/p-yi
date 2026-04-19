import { NextResponse, type NextRequest } from "next/server";
import {
  AffiliatePayoutStatus,
  UserRole,
} from "@prisma/client";

import { requireRole } from "@/lib/auth/current-user";
import { exportPayoutsCsv } from "@/lib/affiliate/payout";

/**
 * Export CSV des paiements d'affiliation. Filtre optionnel par statut
 * via `?status=PENDING` pour pouvoir télécharger uniquement la file
 * à virer.
 *
 *   /admin/affiliation/export            → tous les paiements
 *   /admin/affiliation/export?status=PENDING → à verser uniquement
 *
 * Restreint aux ADMIN — contient des infos personnelles (emails,
 * montants) qu'un modérateur n'a pas à voir.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await requireRole(UserRole.ADMIN, "/admin/affiliation");

  const statusParam = request.nextUrl.searchParams.get("status");
  const status =
    statusParam && statusParam in AffiliatePayoutStatus
      ? (statusParam as AffiliatePayoutStatus)
      : undefined;

  const csv = await exportPayoutsCsv({ status });

  const now = new Date().toISOString().slice(0, 10);
  const statusSuffix = status ? `-${status.toLowerCase()}` : "";
  const filename = `peyi-affiliation-payouts${statusSuffix}-${now}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
