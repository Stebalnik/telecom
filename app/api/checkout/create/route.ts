import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

function getBaseUrl(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (envUrl) return envUrl;

  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/+$/, "");

  return "http://localhost:3000";
}

function safePath(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  return value;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json();

    const amount = Number(body.amount);
    const email = body.email || undefined;
    const purpose = body.purpose || "platform_support";
    const title =
      body.title ||
      process.env.STRIPE_SUPPORT_PRODUCT_NAME ||
      "Support LEOTEOR Telecom Marketplace";

    const successPath = safePath(body.successPath, "/dashboard");
    const cancelPath = safePath(body.cancelPath, "/dashboard");

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    const unitAmount = Math.round(amount * 100);

    if (unitAmount < 100) {
      return NextResponse.json(
        { error: "Minimum amount is $1.00" },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "donate",
      customer_email: email,
      success_url: `${baseUrl}${successPath}?checkout=success`,
      cancel_url: `${baseUrl}${cancelPath}?checkout=cancelled`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: unitAmount,
            product_data: {
              name: title,
              description: `Purpose: ${purpose}`,
            },
          },
        },
      ],
      metadata: {
        purpose,
        ...(body.metadata || {}),
      },
    });

    return NextResponse.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to create checkout session" },
      { status: 500 }
    );
  }
}