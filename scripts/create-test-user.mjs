// Script de création d'un utilisateur de test
// Usage : node scripts/create-test-user.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dqiykwxlftnckufspkir.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaXlrd3hsZnRuY2t1ZnNwa2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTA0MzIsImV4cCI6MjA4NzA4NjQzMn0.wiSVNsRXVrnfkWAfMNZnUTbXSvF0t7fjCr54isnWPDQ";

const TEST_EMAIL = "test@facturepro.fr";
const TEST_PASSWORD = "Test1234!";
const TEST_NAME = "Utilisateur Test";
const TEST_COMPANY = "FacturePro Demo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Création de l'utilisateur de test...");
console.log(`Email    : ${TEST_EMAIL}`);
console.log(`Password : ${TEST_PASSWORD}`);
console.log("---");

// 1. Inscription
const { data, error: signUpError } = await supabase.auth.signUp({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
  options: { data: { full_name: TEST_NAME } },
});

if (signUpError) {
  if (signUpError.message.includes("already registered")) {
    console.log("✓ Utilisateur déjà existant — pas besoin de recréer.");
    console.log(`\nIdentifiants de test :`);
    console.log(`  Email    : ${TEST_EMAIL}`);
    console.log(`  Password : ${TEST_PASSWORD}`);
    process.exit(0);
  }
  console.error("✗ Erreur signUp :", signUpError.message);
  process.exit(1);
}

if (!data.user) {
  console.error("✗ Pas d'utilisateur retourné — la confirmation email est peut-être activée.");
  console.log("  → Désactive 'Confirm email' dans Supabase Auth → Providers → Email");
  process.exit(1);
}

console.log("✓ Compte auth créé :", data.user.id);

// 2. Org + user + séquences via fonction SECURITY DEFINER
const { error: setupError } = await supabase.rpc("setup_new_account", {
  p_auth_id: data.user.id,
  p_email: TEST_EMAIL,
  p_full_name: TEST_NAME,
  p_company_name: TEST_COMPANY,
});

if (setupError) {
  console.error("✗ Erreur setup_new_account :", setupError.message);
  process.exit(1);
}
console.log("✓ Organisation + profil + séquences créés (FAC, DEV, AVO, BL)");

console.log("\n✅ Utilisateur de test prêt !");
console.log("─────────────────────────────");
console.log(`  Email    : ${TEST_EMAIL}`);
console.log(`  Password : ${TEST_PASSWORD}`);
console.log("─────────────────────────────");
