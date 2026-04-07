import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { withServerErrorLogging } from "../../../../lib/errors/withServerErrorLogging";

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
    const result = await withServerErrorLogging(
      async () => {
        if (!process.env.STRIPE_SECRET_KEY) {
          return NextResponse.json(
            { error: "Checkout is not configured." },
            { status: 500 }
          );
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const body = await req.json();

        const amount = Number(body.amount);
        const email =
          typeof body.email === "string" && body.email.trim()
            ? body.email.trim()
            : undefined;
        const purpose =
          typeof body.purpose === "string" && body.purpose.trim()
            ? body.purpose.trim()
            : "platform_support";
        const title =
          (typeof body.title === "string" && body.title.trim()) ||
          process.env.STRIPE_SUPPORT_PRODUCT_NAME ||
          "Support LEOTEOR Telecom Marketplace";

        const successPath = safePath(body.successPath, "/dashboard");
        const cancelPath = safePath(body.cancelPath, "/dashboard");

        if (!Number.isFinite(amount) || amount <= 0) {
          return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
        }

        const unitAmount = Math.round(amount * 100);

        if (unitAmount < 100) {
          return NextResponse.json(
            { error: "Minimum amount is $1.00." },
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
            ...(body.metadata && typeof body.metadata === "object"
              ? body.metadata
              : {}),
          },
        });

        return NextResponse.json({
          ok: true,
          url: session.url,
          sessionId: session.id,
        });
      },
      {
        message: "checkout_create_failed",
        code: "checkout_create_failed",
        source: "api",
        area: "checkout",
        path: "/api/checkout/create",
      }
    );

    return result;
  } catch {
    return NextResponse.json(
      { error: "Unable to create checkout session." },
      { status: 500 }
    );
  }
}