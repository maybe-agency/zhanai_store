import { google } from "googleapis";

export type Bouquet = {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
  active: boolean;
};

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

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

export async function getBouquets(): Promise<Bouquet[]> {
  const sheets = google.sheets({
    version: "v4",
    auth,
  });

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
