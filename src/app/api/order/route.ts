import { NextResponse } from "next/server";
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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const bouquetName = getStringValue(formData, "bouquetName");
    const bouquetPrice = getStringValue(formData, "bouquetPrice");
    const name = getStringValue(formData, "name");
    const phone = getStringValue(formData, "phone");
    const address = getStringValue(formData, "address");
    const deliveryDate = getStringValue(formData, "deliveryDate");
    const deliveryTime = getStringValue(formData, "deliveryTime");
    const cardText = getStringValue(formData, "cardText");
    const comment = getStringValue(formData, "comment");
    const receipt = formData.get("receipt");

    if (
      !bouquetName ||
      !bouquetPrice ||
      !name ||
      !phone ||
      !address ||
      !deliveryDate ||
      !deliveryTime
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

    const message = `🌷 Новый заказ

Букет: ${bouquetName}
Цена: ${bouquetPrice} сомов

Имя: ${name}
Телефон: ${phone}
Адрес: ${address}

Дата доставки: ${deliveryDate}
Время доставки: ${deliveryTime}

Открытка:
${cardText}

Комментарий:
${comment}`;

    await sendTelegramMessage(message);

    if (receipt instanceof File && receipt.size > 0) {
      await sendTelegramPhoto(receipt, receipt.name);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order submission failed", error);

    return NextResponse.json(
      { error: "Order submission failed" },
      { status: 500 },
    );
  }
}
