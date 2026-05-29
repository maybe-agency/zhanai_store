const TELEGRAM_API_URL = "https://api.telegram.org";

function getTelegramConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  if (!chatId) {
    throw new Error("TELEGRAM_CHAT_ID is not configured");
  }

  return { botToken, chatId };
}

async function throwIfTelegramRequestFailed(response: Response): Promise<void> {
  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(`Telegram request failed: ${response.status} ${errorText}`);
  }
}

export async function sendTelegramMessage(text: string): Promise<void> {
  const { botToken, chatId } = getTelegramConfig();

  const response = await fetch(`${TELEGRAM_API_URL}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  await throwIfTelegramRequestFailed(response);
}

export async function sendTelegramPhoto(
  photo: Blob,
  filename = "receipt.jpg",
): Promise<void> {
  const { botToken, chatId } = getTelegramConfig();
  const formData = new FormData();

  formData.append("chat_id", chatId);
  formData.append("photo", photo, filename);

  const response = await fetch(`${TELEGRAM_API_URL}/bot${botToken}/sendPhoto`, {
    method: "POST",
    body: formData,
  });

  await throwIfTelegramRequestFailed(response);
}
