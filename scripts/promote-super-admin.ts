// =============================================================================
// PÉYI — Promotion d'un utilisateur au rang SUPER_ADMIN
// =============================================================================
// Crée OU met à jour un utilisateur pour lui donner le rôle SUPER_ADMIN.
// Cette opération est volontairement CLI-only : jamais exposée via l'UI.
//
// Raison : dans le cas d'une session super-admin compromise, un
// attaquant pourrait créer un pair persistant, ce qui contournerait
// complètement la capacité du vrai super-admin à reprendre la main.
// En rendant l'opération CLI, on exige un accès au serveur / à la DB,
// ce qui est un ordre de magnitude plus difficile à compromettre.
//
// Usage :
//   npm run promote-super-admin -- <email>
//   npx tsx scripts/promote-super-admin.ts <email>
//
// L'utilisateur doit déjà exister (être inscrit via l'interface
// normale). Le script refuse de créer un compte à sec — on veut
// s'assurer que Supabase Auth a bien un utilisateur associé.
// =============================================================================

import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email) {
    console.error("❌ Usage: npx tsx scripts/promote-super-admin.ts <email>");
    process.exit(1);
  }

  if (!email.includes("@")) {
    console.error(`❌ Email invalide : "${email}"`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    console.error(
      `❌ Aucun utilisateur avec l'email "${email}". L'utilisateur doit d'abord s'inscrire via l'UI.`,
    );
    process.exit(1);
  }

  if (user.role === UserRole.SUPER_ADMIN) {
    console.log(
      `ℹ️  @${user.username} (${user.email}) est déjà SUPER_ADMIN — rien à faire.`,
    );
    process.exit(0);
  }

  const previousRole = user.role;

  await prisma.user.update({
    where: { id: user.id },
    data: { role: UserRole.SUPER_ADMIN },
  });

  console.log(
    `✅ @${user.username} (${user.email}) : ${previousRole} → SUPER_ADMIN`,
  );
  console.log(
    "   Cette promotion n'est PAS tracée dans AdminActionLog (opération CLI hors audit UI).",
  );
}

main()
  .catch((err) => {
    console.error("❌ Erreur :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
