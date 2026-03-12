import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

type ForgotPasswordBody = {
  email?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) return appUrl.replace(/\/$/, "");
  return "http://localhost:3000";
}

async function findUserByEmail(email: string) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const found = users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (found) return found;
    if (users.length < perPage) return null;

    page += 1;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ForgotPasswordBody;
    const email = body.email?.trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);

    if (user) {
      const redirectTo = `${getBaseUrl()}/reset-password`;

      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
        email,
        { redirectTo }
      );

      if (resetError) {
        console.error("forgot-password resetPasswordForEmail error:", resetError);
      }
    }

    return NextResponse.json(
      {
        message:
          "If an account exists for that email, a password recovery link has been sent.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("forgot-password route error:", error);

    return NextResponse.json(
      {
        message:
          "If an account exists for that email, a password recovery link has been sent.",
      },
      { status: 200 }
    );
  }
}