import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.signUp({
    email: "diagnostic@facturepro.fr",
    password: "Test1234!",
  });

  return NextResponse.json({
    success: !error,
    error: error ? { message: error.message, status: error.status } : null,
    user: data?.user ? { id: data.user.id, email: data.user.email, confirmed: data.user.confirmed_at } : null,
    session: data?.session ? "session créée" : "pas de session",
  });
}
