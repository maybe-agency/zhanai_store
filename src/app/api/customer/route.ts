import { NextResponse } from "next/server";
import { getCustomerByPhone } from "@/lib/googleSheets";
import { normalizePhone } from "@/lib/phone";

export async function POST(request: Request) {
  try {
    const { phone } = (await request.json()) as { phone?: string };
    const normalizedPhone = normalizePhone(phone ?? "");

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Phone is required" },
        { status: 400 },
      );
    }

    const customer = await getCustomerByPhone(normalizedPhone);
    const discountAvailable =
      customer && customer.ordersCount > 0 && customer.ordersCount % 4 === 0
        ? 500
        : 0;

    return NextResponse.json({
      customer: customer
        ? {
            phone: customer.phone,
            name: customer.name,
            ordersCount: customer.ordersCount,
            totalSpent: customer.totalSpent,
            lastOrderDate: customer.lastOrderDate,
            discountAvailable,
          }
        : null,
    });
  } catch (error) {
    console.error("Customer lookup failed", error);

    return NextResponse.json(
      { error: "Customer lookup failed" },
      { status: 500 },
    );
  }
}
