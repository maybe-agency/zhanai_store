"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  DeliveryMapPicker,
  type DeliveryLocation,
} from "@/components/DeliveryMapPicker";
import { formatKgs } from "@/lib/currency";
import type { Bouquet } from "@/lib/googleSheets";
import { formatPhoneInput, normalizePhone } from "@/lib/phone";

type OrderModalProps = {
  bouquet: Bouquet;
  onClose: () => void;
};

type CheckoutStep = "order" | "payment" | "receipt" | "success";

type OrderFormData = {
  customerName: string;
  customerPhone: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  latitude: string;
  longitude: string;
  mapUrl: string;
  deliveryDate: string;
  deliveryTime: string;
  cardText: string;
  comment: string;
  discountApplied: boolean;
  consentAccepted: boolean;
};

type CustomerLookup = {
  phone: string;
  name: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderDate: string;
  discountAvailable: number;
};

const inputClassName =
  "mt-1.5 w-full rounded-xl border border-[#f0ddd6] bg-white px-3 py-2.5 text-sm text-stone-950 outline-none transition focus:border-[#dfbfc5] focus:ring-2 focus:ring-[#fff3f5]";

const qrImage = process.env.NEXT_PUBLIC_QR_IMAGE;
const defaultPhoneCode = "+996";

const initialOrderData: OrderFormData = {
  customerName: "",
  customerPhone: "",
  recipientName: "",
  recipientPhone: "",
  deliveryAddress: "",
  latitude: "",
  longitude: "",
  mapUrl: "",
  deliveryDate: "",
  deliveryTime: "",
  cardText: "",
  comment: "",
  discountApplied: false,
  consentAccepted: false,
};

export function OrderModal({ bouquet, onClose }: OrderModalProps) {
  const [step, setStep] = useState<CheckoutStep>("order");
  const [orderData, setOrderData] = useState<OrderFormData>(initialOrderData);
  const [customerPhone, setCustomerPhone] = useState(defaultPhoneCode);
  const [recipientPhone, setRecipientPhone] = useState(defaultPhoneCode);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLocation, setDeliveryLocation] =
    useState<DeliveryLocation | null>(null);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [customerLookup, setCustomerLookup] = useState<CustomerLookup | null>(
    null,
  );
  const [hasCustomerLookupResult, setHasCustomerLookupResult] = useState(false);
  const [isCustomerLookupLoading, setIsCustomerLookupLoading] = useState(false);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const activeDiscount = customerLookup?.discountAvailable ?? 0;
  const orderDiscount = discountApplied
    ? Math.min(activeDiscount, bouquet.price)
    : 0;
  const orderTotal = Math.max(bouquet.price - orderDiscount, 0);

  const lookupCustomerDiscount = useCallback(async (phone: string) => {
    const normalizedPhone = normalizePhone(phone);

    if (normalizedPhone.length <= defaultPhoneCode.length) {
      setCustomerLookup(null);
      setHasCustomerLookupResult(false);
      return;
    }

    setIsCustomerLookupLoading(true);

    try {
      const response = await fetch("/api/customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      if (!response.ok) {
        throw new Error("Customer lookup failed");
      }

      const data = (await response.json()) as {
        customer: CustomerLookup | null;
      };

      setCustomerLookup(data.customer);
      setHasCustomerLookupResult(true);
    } catch {
      setCustomerLookup(null);
      setHasCustomerLookupResult(false);
    } finally {
      setIsCustomerLookupLoading(false);
    }
  }, []);

  useEffect(() => {
    const normalizedPhone = normalizePhone(customerPhone);

    if (normalizedPhone.length <= defaultPhoneCode.length) {
      return;
    }

    const lookupTimeout = window.setTimeout(() => {
      void lookupCustomerDiscount(normalizedPhone);
    }, 500);

    return () => window.clearTimeout(lookupTimeout);
  }, [customerPhone, lookupCustomerDiscount]);

  function handleOrderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const normalizedCustomerPhone = normalizePhone(
      String(formData.get("customerPhone") ?? ""),
    );
    const normalizedRecipientPhone = normalizePhone(
      String(formData.get("recipientPhone") ?? ""),
    );
    const nextDeliveryAddress = deliveryAddress.trim();
    const consentAccepted = formData.get("consentAccepted") === "on";

    if (normalizedCustomerPhone.length <= defaultPhoneCode.length) {
      setSubmitError("Укажите телефон заказчика.");
      return;
    }

    if (
      !deliveryLocation?.latitude ||
      !deliveryLocation.longitude ||
      !deliveryLocation.mapUrl
    ) {
      setSubmitError("Выберите адрес доставки на карте.");
      return;
    }

    if (!nextDeliveryAddress) {
      setSubmitError("Укажите адрес доставки.");
      return;
    }

    if (!consentAccepted) {
      setSubmitError("Необходимо согласие на обработку персональных данных.");
      return;
    }

    setOrderData({
      customerName: String(formData.get("customerName") ?? ""),
      customerPhone: normalizedCustomerPhone,
      recipientName: String(formData.get("recipientName") ?? ""),
      recipientPhone: normalizedRecipientPhone,
      deliveryAddress: nextDeliveryAddress,
      latitude: deliveryLocation.latitude,
      longitude: deliveryLocation.longitude,
      mapUrl: deliveryLocation.mapUrl,
      deliveryDate: String(formData.get("deliveryDate") ?? ""),
      deliveryTime: String(formData.get("deliveryTime") ?? ""),
      cardText: String(formData.get("cardText") ?? ""),
      comment: String(formData.get("comment") ?? ""),
      discountApplied,
      consentAccepted,
    });
    setSubmitError("");
    setStep("payment");
  }

  function placeCursorAtPhoneEnd(input: HTMLInputElement) {
    if (input.value === defaultPhoneCode) {
      window.requestAnimationFrame(() => {
        input.setSelectionRange(input.value.length, input.value.length);
      });
    }
  }

  async function handleReceiptSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const form = event.currentTarget;

    setIsSubmitting(true);
    setSubmitError("");

    const receiptFormData = new FormData(form);
    const orderFormData = new FormData();
    const receipt = receiptFormData.get("receipt");

    orderFormData.append("bouquetId", bouquet.id);
    orderFormData.append("bouquetName", bouquet.name);
    orderFormData.append("bouquetPrice", String(bouquet.price));
    orderFormData.append("customerName", orderData.customerName);
    orderFormData.append("customerPhone", orderData.customerPhone);
    orderFormData.append("recipientName", orderData.recipientName);
    orderFormData.append("recipientPhone", orderData.recipientPhone);
    orderFormData.append("deliveryAddress", orderData.deliveryAddress);
    orderFormData.append("latitude", orderData.latitude);
    orderFormData.append("longitude", orderData.longitude);
    orderFormData.append("mapUrl", orderData.mapUrl);
    orderFormData.append("deliveryDate", orderData.deliveryDate);
    orderFormData.append("deliveryTime", orderData.deliveryTime);
    orderFormData.append("cardText", orderData.cardText);
    orderFormData.append("comment", orderData.comment);
    orderFormData.append("discountApplied", String(orderData.discountApplied));
    orderFormData.append("consentAccepted", String(orderData.consentAccepted));

    if (!(receipt instanceof File) || receipt.size === 0) {
      setSubmitError("Загрузите чек оплаты.");
      setIsSubmitting(false);
      return;
    }

    orderFormData.append("receipt", receipt);

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        body: orderFormData,
      });

      if (!response.ok) {
        throw new Error("Order request failed");
      }

      form.reset();
      setOrderData(initialOrderData);
      setCustomerPhone(defaultPhoneCode);
      setRecipientPhone(defaultPhoneCode);
      setDeliveryAddress("");
      setDeliveryLocation(null);
      setCustomerLookup(null);
      setHasCustomerLookupResult(false);
      setDiscountApplied(false);
      setStep("success");
    } catch {
      setSubmitError("Не удалось отправить заказ. Попробуйте еще раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end bg-zinc-950/45 px-4 py-4 backdrop-blur-sm sm:items-center sm:justify-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
      >
        <div className="max-h-[90vh] w-full overflow-y-auto rounded-[1.5rem] bg-white p-5 shadow-[0_24px_80px_rgba(24,24,27,0.18)] sm:max-w-xl sm:p-6">
        <div className="mb-5">
          <h2
            id="order-modal-title"
            className="mt-2 text-2xl font-semibold tracking-tight text-stone-950"
          >
            Заказ букета
          </h2>
          <p className="mt-3 text-base font-semibold text-stone-950">
            {bouquet.name}
          </p>
          <p className="mt-1 text-base font-semibold text-zinc-700">
            {formatKgs(bouquet.price)}
          </p>
        </div>

        {step === "success" ? (
          <div className="space-y-5">
            <div className="rounded-2xl bg-[#fff8f6] p-5 text-center">
              <p className="text-lg font-semibold text-stone-950">
                Спасибо за заказ 🌷
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Мы получили вашу заявку и скоро свяжемся с вами.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Закрыть
              </button>
            </div>
          </div>
        ) : step === "payment" ? (
          <div className="space-y-5">
            <div className="rounded-2xl bg-[#fff8f6] p-4">
              <p className="text-sm font-semibold text-stone-950">
                {bouquet.name}
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-700">
                {formatKgs(bouquet.price)}
              </p>
              {orderDiscount > 0 ? (
                <>
                  <p className="mt-1 text-sm font-semibold text-[#b77b88]">
                    Скидка: {formatKgs(orderDiscount)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    Итого: {formatKgs(orderTotal)}
                  </p>
                </>
              ) : null}
            </div>

            <div className="mx-auto grid aspect-square w-48 place-items-center rounded-2xl bg-white shadow-[inset_0_0_0_1px_#f0ddd6]">
              {qrImage ? (
                <Image
                  src={qrImage}
                  alt="QR-код для оплаты"
                  width={192}
                  height={192}
                  className="h-full w-full rounded-2xl object-contain p-3"
                  unoptimized
                />
              ) : (
                <div className="px-6 text-center text-sm font-medium leading-6 text-stone-500">
                  QR-код оплаты пока не добавлен
                </div>
              )}
            </div>

            <p className="text-center text-sm leading-6 text-stone-600">
              Отсканируйте QR-код и оплатите заказ
            </p>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[#f0ddd6] bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-[#dfbfc5]"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => setStep("receipt")}
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Я оплатил
              </button>
            </div>
          </div>
        ) : step === "receipt" ? (
          <form onSubmit={handleReceiptSubmit} className="space-y-5">
            <div className="rounded-2xl bg-[#fff8f6] p-4">
              <p className="text-sm font-semibold text-stone-950">
                Загрузите чек оплаты
              </p>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                Поддерживаемые форматы: jpg, jpeg, png, webp.
              </p>
            </div>

            <label className="block text-sm font-medium text-stone-700">
              Чек оплаты
              <input
                className={inputClassName}
                name="receipt"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                required
              />
            </label>

            {submitError ? (
              <p className="text-sm font-medium text-red-600">{submitError}</p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-full border border-[#f0ddd6] bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-[#dfbfc5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Отправляем..." : "Отправить заказ"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleOrderSubmit} className="space-y-5">
            <div className="space-y-4">
              <p className="text-sm font-semibold text-stone-950">
                Заказчик
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-stone-700">
                  Имя заказчика *
                  <input className={inputClassName} name="customerName" />
                </label>

                <label className="text-sm font-medium text-stone-700">
                  Телефон заказчика *
                  <input
                    className={inputClassName}
                    name="customerPhone"
                    type="tel"
                    inputMode="tel"
                    value={customerPhone}
                    onFocus={(event) =>
                      placeCursorAtPhoneEnd(event.currentTarget)
                    }
                    onChange={(event) => {
                      setCustomerPhone(formatPhoneInput(event.target.value));
                      setCustomerLookup(null);
                      setHasCustomerLookupResult(false);
                      setDiscountApplied(false);
                    }}
                    required
                  />
                </label>
              </div>

              {isCustomerLookupLoading ? (
                <p className="text-sm text-stone-500">Проверяем скидку...</p>
              ) : null}

              {activeDiscount > 0 ? (
                <div className="rounded-2xl bg-[#fff8f6] p-4">
                  <div className="mb-3 space-y-1 text-sm text-stone-600">
                    <p>
                      Заказов:{" "}
                      <span className="font-semibold text-stone-950">
                        {customerLookup?.ordersCount ?? 0}
                      </span>
                    </p>
                    <p>
                      Всего потрачено:{" "}
                      <span className="font-semibold text-stone-950">
                        {formatKgs(customerLookup?.totalSpent ?? 0)}
                      </span>
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-stone-950">
                    Вам доступна скидка {formatKgs(activeDiscount)}
                  </p>
                  <label className="mt-3 flex items-center gap-2 text-sm font-medium text-stone-700">
                    <input
                      type="checkbox"
                      checked={discountApplied}
                      onChange={(event) =>
                        setDiscountApplied(event.target.checked)
                      }
                      className="h-4 w-4 accent-zinc-900"
                    />
                    Применить скидку к этому заказу
                  </label>
                </div>
              ) : null}

              {hasCustomerLookupResult && activeDiscount === 0 ? (
                <div className="rounded-2xl bg-[#fff8f6] p-4 text-sm text-stone-600">
                  <p>
                    Заказов:{" "}
                    <span className="font-semibold text-stone-950">
                      {customerLookup?.ordersCount ?? 0}
                    </span>
                  </p>
                  <p className="mt-1">
                    Всего потрачено:{" "}
                    <span className="font-semibold text-stone-950">
                      {formatKgs(customerLookup?.totalSpent ?? 0)}
                    </span>
                  </p>
                </div>
              ) : null}

            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-stone-950">
                Получатель
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-stone-700">
                  Имя получателя *
                  <input className={inputClassName} name="recipientName" />
                </label>

                <label className="text-sm font-medium text-stone-700">
                  Телефон получателя
                  <input
                    className={inputClassName}
                    name="recipientPhone"
                    type="tel"
                    inputMode="tel"
                    value={recipientPhone}
                    onFocus={(event) =>
                      placeCursorAtPhoneEnd(event.currentTarget)
                    }
                    onChange={(event) =>
                      setRecipientPhone(formatPhoneInput(event.target.value))
                    }
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-stone-700">
                Адрес доставки *
                <input
                  className={inputClassName}
                  name="deliveryAddress"
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  required
                />
              </label>

              <div className="rounded-2xl bg-[#fff8f6] p-4">
                <button
                  type="button"
                  onClick={() => setIsMapPickerOpen(true)}
                  className="w-full rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  📍 Выбрать адрес на карте
                </button>
                {deliveryLocation ? (
                  <div className="mt-3 text-sm leading-6 text-stone-600">
                    <p>
                      Координаты:{" "}
                      <span className="font-medium text-stone-950">
                        {deliveryLocation.latitude},{" "}
                        {deliveryLocation.longitude}
                      </span>
                    </p>
                    <a
                      href={deliveryLocation.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-zinc-900 underline underline-offset-4"
                    >
                      Открыть точку на карте
                    </a>
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-stone-500">
                    Точная доставка будет сохранена по координатам.
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-stone-700">
                  Дата доставки *
                  <input
                    className={inputClassName}
                    name="deliveryDate"
                    type="date"
                  />
                </label>

                <label className="text-sm font-medium text-stone-700">
                  Время доставки *
                  <input
                    className={inputClassName}
                    name="deliveryTime"
                    type="time"
                  />
                </label>
              </div>
            </div>

            <label className="block text-sm font-medium text-stone-700">
              Текст открытки
              <textarea
                className={`${inputClassName} min-h-20 resize-y`}
                name="cardText"
              />
            </label>

            <label className="block text-sm font-medium text-stone-700">
              Комментарий
              <textarea
                className={`${inputClassName} min-h-20 resize-y`}
                name="comment"
              />
            </label>

            <label className="flex items-start gap-2 text-sm font-medium text-stone-700">
              <input
                name="consentAccepted"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 accent-zinc-900"
              />
              <span>Я согласен на обработку персональных данных</span>
            </label>

            {submitError ? (
              <p className="text-sm font-medium text-red-600">{submitError}</p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[#f0ddd6] bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-[#dfbfc5]"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Перейти к оплате
              </button>
            </div>
          </form>
        )}
        </div>
      </div>

      {isMapPickerOpen ? (
        <DeliveryMapPicker
          initialLocation={deliveryLocation}
          onCancel={() => setIsMapPickerOpen(false)}
          onSelect={(location) => {
            setDeliveryLocation(location);
            setDeliveryAddress(location.address);
            setIsMapPickerOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
