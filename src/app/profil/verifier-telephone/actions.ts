"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resendOtpSchema, verifyOtpSchema } from "@/lib/validation/profile";
import { authLimiter } from "@/lib/rate-limit";

function redirectWithError(phone: string, message: string): never {
  redirect(
    `/profil/verifier-telephone?phone=${encodeURIComponent(
      phone,
    )}&error=${encodeURIComponent(message)}`,
  );
}

function redirectWithInfo(phone: string, message: string): never {
  redirect(
    `/profil/verifier-telephone?phone=${encodeURIComponent(
      phone,
    )}&success=${encodeURIComponent(message)}`,
  );
}

function formatRateLimitMessage(reset: number): string {
  const secondsLeft = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  if (secondsLeft >= 60) {
    return `Trop de tentatives. Réessaye dans ${Math.ceil(secondsLeft / 60)} min.`;
  }
  return `Trop de tentatives. Réessaye dans ${secondsLeft}s.`;
}

/**
 * Verify the 6-digit OTP the user just received by SMS.
 *
 * `type: "phone_change"` tells Supabase that this is the second leg of the
 * flow started by `auth.updateUser({ phone })` — i.e. the user is confirming
 * that they own a NEW number. If they were verifying their ORIGINAL number at
 * signup, the type would be `"sms"` instead.
 *
 * On success, Supabase sets `auth.users.phone_confirmed_at`. We mirror that
 * into Prisma right away so the badge shows up without waiting for the next
 * `requireUser` drift sync.
 */
export async function verifyPhoneAction(formData: FormData): Promise<void> {
  const user = await requireUser("/profil");

  // Rate limit par userId — évite le brute force du code à 6 chiffres.
  const { success, reset } = await authLimiter.limit(`otp:verify:${user.id}`);
  if (!success) {
    const phone = String(formData.get("phone") ?? "");
    redirectWithError(phone, formatRateLimitMessage(reset));
  }

  const parsed = verifyOtpSchema.safeParse({
    phone: formData.get("phone"),
    code: formData.get("code"),
  });

  if (!parsed.success) {
    const phone = String(formData.get("phone") ?? "");
    redirectWithError(
      phone,
      parsed.error.issues[0]?.message ?? "Code invalide.",
    );
  }

  const { phone, code } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    phone,
    token: code,
    type: "phone_change",
  });

  if (error) {
    console.error("[verifyPhoneAction] verifyOtp failed", {
      message: error.message,
      code: (error as { code?: string }).code,
      status: (error as { status?: number }).status,
    });
    // Supabase returns messages in English — translate the common ones.
    const friendly =
      error.message.toLowerCase().includes("expired") ||
      error.message.toLowerCase().includes("invalid")
        ? "Code incorrect ou expiré. Demande un nouveau code."
        : `Vérification impossible : ${error.message}`;
    redirectWithError(phone, friendly);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { phone, phoneVerified: true },
  });

  revalidatePath("/profil");
  revalidatePath("/profil/edit");

  redirect(
    `/profil?success=${encodeURIComponent("Numéro vérifié avec succès !")}`,
  );
}

/**
 * Resend the SMS OTP by re-asking Supabase to update the user's phone. This
 * is idempotent on their side — the same MSISDN just triggers a fresh token.
 */
export async function resendOtpAction(formData: FormData): Promise<void> {
  const user = await requireUser("/profil");

  // Rate limit renvoi OTP par userId — cap les frais SMS Supabase en cas
  // d'abus.
  const { success, reset } = await authLimiter.limit(`otp:resend:${user.id}`);
  if (!success) {
    const phone = String(formData.get("phone") ?? "");
    redirectWithError(phone, formatRateLimitMessage(reset));
  }

  const parsed = resendOtpSchema.safeParse({
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    const phone = String(formData.get("phone") ?? "");
    redirectWithError(phone, "Numéro invalide.");
  }
  const { phone } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ phone });

  if (error) {
    console.error("[resendOtpAction] updateUser failed", {
      message: error.message,
      code: (error as { code?: string }).code,
    });
    redirectWithError(phone, `Envoi impossible : ${error.message}`);
  }

  redirectWithInfo(phone, "Un nouveau code a été envoyé par SMS.");
}
