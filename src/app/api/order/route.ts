import { NextResponse } from "next/server";
import {
  appendOrder,
  getCustomerByPhone,
  getNextOrderNumber,
  upsertCustomerOrder,
} from "@/lib/googleSheets";
import { formatKgs } from "@/lib/currency";
import { normalizePhone } from "@/lib/phone";
import { sendTelegramMessage, sendTelegramPhoto } from "@/lib/telegram";

const allowedReceiptTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getStringValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getMessageLine(label: string, value: string): string | null {
  return value ? `${label}: ${value}` : null;
}

function getMessageSection(title: string, lines: Array<string | null>): string {
  return [title, ...lines.filter(Boolean)].join("\n");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const bouquetId = getStringValue(formData, "bouquetId");
    const bouquetName = getStringValue(formData, "bouquetName");
    const bouquetPrice = getStringValue(formData, "bouquetPrice");
    const customerName = getStringValue(formData, "customerName");
    const customerPhone = normalizePhone(
      getStringValue(formData, "customerPhone"),
    );
    const recipientName = getStringValue(formData, "recipientName");
    const recipientPhone = normalizePhone(
      getStringValue(formData, "recipientPhone"),
    );
    const deliveryAddress = getStringValue(formData, "deliveryAddress");
    const latitude = getStringValue(formData, "latitude");
    const longitude = getStringValue(formData, "longitude");
    const mapUrl = getStringValue(formData, "mapUrl");
    const deliveryDate = getStringValue(formData, "deliveryDate");
    const deliveryTime = getStringValue(formData, "deliveryTime");
    const cardText = getStringValue(formData, "cardText");
    const comment = getStringValue(formData, "comment");
    const discountRequested =
      getStringValue(formData, "discountApplied") === "true";
    const consentAccepted =
      getStringValue(formData, "consentAccepted") === "true";
    const receipt = formData.get("receipt");
    const bouquetPriceNumber = Number(bouquetPrice);
    const orderDate = new Date().toISOString();

    if (
      !bouquetId ||
      !bouquetName ||
      !Number.isFinite(bouquetPriceNumber) ||
      customerPhone.length <= 4 ||
      !latitude ||
      !longitude ||
      !mapUrl ||
      !deliveryAddress ||
      !consentAccepted ||
      !(receipt instanceof File) ||
      receipt.size === 0
    ) {
      return NextResponse.json(
        { error: "Missing required order fields" },
        { status: 400 },
      );
    }

    if (receipt instanceof File && receipt.size > 0) {
      if (!allowedReceiptTypes.has(receipt.type)) {
        return NextResponse.json(
          { error: "Unsupported receipt image format" },
          { status: 400 },
        );
      }
    }

    const customer = await getCustomerByPhone(customerPhone);
    const availableDiscount =
      customer && customer.ordersCount > 0 && customer.ordersCount % 4 === 0
        ? 500
        : 0;
    const discountApplied =
      discountRequested && availableDiscount > 0
        ? Math.min(availableDiscount, bouquetPriceNumber)
        : 0;
    const orderTotal = Math.max(bouquetPriceNumber - discountApplied, 0);
    const orderNumber = await getNextOrderNumber();

    const deliveryDateTime = [deliveryDate, deliveryTime]
      .filter(Boolean)
      .join(", ");
    const message = [
      "🌷 Новый заказ",
      [
        `Номер заказа: ${orderNumber}`,
        `Букет: ${bouquetName}`,
        `Стоимость: ${formatKgs(orderTotal)}`,
      ].join("\n"),
      getMessageSection("👤 Заказчик", [
        getMessageLine("Имя", customerName),
        getMessageLine("Телефон", customerPhone),
      ]),
      getMessageSection("🎁 Получатель", [
        getMessageLine("Имя", recipientName),
        getMessageLine("Телефон", recipientPhone),
      ]),
      getMessageSection("📍 Адрес доставки", [deliveryAddress]),
      getMessageSection("🗺 Карта", [mapUrl]),
      deliveryDateTime
        ? getMessageSection("🕒 Время доставки", [deliveryDateTime])
        : null,
      cardText ? getMessageSection("💌 Открытка", [cardText]) : null,
      comment ? getMessageSection("📝 Комментарий", [comment]) : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    await sendTelegramMessage(message);

    if (receipt instanceof File && receipt.size > 0) {
      await sendTelegramPhoto(receipt, receipt.name);
    }

    await appendOrder({
      id: orderNumber,
      date: orderDate,
      bouquetId,
      bouquetName,
      price: bouquetPriceNumber,
      customerName,
      customerPhone,
      recipientName,
      recipientPhone,
      address: deliveryAddress,
      latitude,
      longitude,
      mapUrl,
      deliveryDate,
      deliveryTime,
      cardText,
      comment,
      receiptUrl: "",
      status: "new",
    });

    await upsertCustomerOrder({
      phone: customerPhone,
      name: customerName,
      orderAmount: bouquetPriceNumber,
      orderDate,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order submission failed", error);

    return NextResponse.json(
      { error: "Order submission failed" },
      { status: 500 },
    );
  }
}
