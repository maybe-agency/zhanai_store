import { google } from "googleapis";
import { normalizePhone } from "@/lib/phone";

export type Bouquet = {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
  active: boolean;
};

export type Customer = {
  phone: string;
  name: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderDate: string;
  rowIndex: number;
};

export type OrderRecord = {
  id: string;
  date: string;
  bouquetId: string;
  bouquetName: string;
  price: number;
  customerName: string;
  customerPhone: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  deliveryDate: string;
  deliveryTime: string;
  cardText: string;
  comment: string;
  receiptUrl: string;
  status: string;
};

export type OrderStatus =
  | "new"
  | "paid"
  | "assembling"
  | "ready"
  | "delivering"
  | "delivered"
  | "cancelled";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const customersSheetName = "Customers";
const ordersSheetName = "Orders";
const customersHeader = [
  "phone",
  "name",
  "orders_count",
  "total_spent",
  "last_order_date",
];
const ordersHeader = [
  "id",
  "date",
  "bouquet_id",
  "bouquet_name",
  "price",
  "customer_name",
  "customer_phone",
  "recipient_name",
  "recipient_phone",
  "address",
  "delivery_date",
  "delivery_time",
  "card_text",
  "comment",
  "receipt_url",
  "status",
];

function getSheetsClient() {
  return google.sheets({
    version: "v4",
    auth,
  });
}

function parsePrice(value: string | undefined): number {
  const normalizedValue = value?.replace(/\s/g, "").replace(",", ".") ?? "";
  const price = Number(normalizedValue);

  return Number.isFinite(price) ? price : 0;
}

function parseActive(value: string | undefined): boolean {
  const normalizedValue = value?.trim().toLowerCase();

  return ["true", "1", "yes", "y", "да", "активный", "active"].includes(
    normalizedValue ?? "",
  );
}

function parseNumber(value: string | undefined): number {
  const number = Number(value?.replace(/\s/g, "").replace(",", ".") ?? "");

  return Number.isFinite(number) ? number : 0;
}

function parseOrderNumber(value: string | undefined): number {
  const match = value?.match(/^ZH-(\d+)$/);

  return match ? Number(match[1]) : 0;
}

export async function getBouquets(): Promise<Bouquet[]> {
  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Bouquets!A:G",
  });

  const rows = response.data.values ?? [];

  return rows
    .slice(1)
    .map(([id, name, price, image, description, category, active]) => ({
      id: id ?? "",
      name: name ?? "",
      price: parsePrice(price),
      image: image ?? "",
      description: description ?? "",
      category: category ?? "",
      active: parseActive(active),
    }));
}

async function ensureSheet(sheetName: string, header: string[]): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const sheetExists = spreadsheet.data.sheets?.some(
    (sheet) => sheet.properties?.title === sheetName,
  );

  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });
  }

  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:${String.fromCharCode(64 + header.length)}1`,
  });
  const currentHeader = headerResponse.data.values?.[0] ?? [];

  if (header.some((headerCell, index) => currentHeader[index] !== headerCell)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:${String.fromCharCode(64 + header.length)}1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [header],
      },
    });
  }
}

async function ensureCustomersSheet(): Promise<void> {
  await ensureSheet(customersSheetName, customersHeader);
}

async function ensureOrdersSheet(): Promise<void> {
  await ensureSheet(ordersSheetName, ordersHeader);
}

export async function getNextOrderNumber(): Promise<string> {
  await ensureOrdersSheet();

  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${ordersSheetName}!A2:A`,
  });
  const rows = response.data.values ?? [];
  const maxOrderNumber = rows.reduce((maxNumber, [orderId]) => {
    const parsedOrderNumber = parseOrderNumber(orderId);

    return parsedOrderNumber > maxNumber ? parsedOrderNumber : maxNumber;
  }, 1000);

  return `ZH-${maxOrderNumber + 1}`;
}

export async function getCustomerByPhone(
  phone: string,
): Promise<Customer | null> {
  await ensureCustomersSheet();

  const sheets = getSheetsClient();
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return null;
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${customersSheetName}!A2:E`,
  });
  const rows = response.data.values ?? [];
  const rowIndex = rows.findIndex((row) => normalizePhone(row[0] ?? "") === normalizedPhone);

  if (rowIndex === -1) {
    return null;
  }

  const [savedPhone, name, ordersCount, totalSpent, lastOrderDate] =
    rows[rowIndex];

  return {
    phone: normalizePhone(savedPhone ?? normalizedPhone),
    name: name ?? "",
    ordersCount: parseNumber(ordersCount),
    totalSpent: parseNumber(totalSpent),
    lastOrderDate: lastOrderDate ?? "",
    rowIndex: rowIndex + 2,
  };
}

type UpsertCustomerOrderInput = {
  phone: string;
  name: string;
  orderAmount: number;
  orderDate: string;
};

export async function upsertCustomerOrder({
  phone,
  name,
  orderAmount,
  orderDate,
}: UpsertCustomerOrderInput): Promise<Customer> {
  await ensureCustomersSheet();

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    throw new Error("Customer phone is required");
  }

  const existingCustomer = await getCustomerByPhone(normalizedPhone);
  const nextOrdersCount = (existingCustomer?.ordersCount ?? 0) + 1;
  const nextTotalSpent = (existingCustomer?.totalSpent ?? 0) + orderAmount;
  const nextCustomer: Customer = {
    phone: normalizedPhone,
    name: name || existingCustomer?.name || "",
    ordersCount: nextOrdersCount,
    totalSpent: nextTotalSpent,
    lastOrderDate: orderDate,
    rowIndex: existingCustomer?.rowIndex ?? 0,
  };
  const values = [
    [
      nextCustomer.phone,
      nextCustomer.name,
      nextCustomer.ordersCount,
      nextCustomer.totalSpent,
      nextCustomer.lastOrderDate,
    ],
  ];

  if (existingCustomer) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${customersSheetName}!A${existingCustomer.rowIndex}:E${existingCustomer.rowIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values,
      },
    });

    return {
      ...nextCustomer,
      rowIndex: existingCustomer.rowIndex,
    };
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${customersSheetName}!A:E`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values,
    },
  });

  return nextCustomer;
}

export async function appendOrder(order: OrderRecord): Promise<void> {
  await ensureOrdersSheet();

  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${ordersSheetName}!A:P`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [
          order.id,
          order.date,
          order.bouquetId,
          order.bouquetName,
          order.price,
          order.customerName,
          order.customerPhone,
          order.recipientName,
          order.recipientPhone,
          order.address,
          order.deliveryDate,
          order.deliveryTime,
          order.cardText,
          order.comment,
          order.receiptUrl,
          order.status,
        ],
      ],
    },
  });
}
