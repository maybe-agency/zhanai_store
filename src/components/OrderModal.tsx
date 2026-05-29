"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import { useState } from "react";
import type { Bouquet } from "@/lib/googleSheets";

type OrderModalProps = {
  bouquet: Bouquet;
  onClose: () => void;
};

type CheckoutStep = "order" | "payment" | "receipt" | "success";

type OrderFormData = {
  name: string;
  phone: string;
  address: string;
  deliveryDate: string;
  deliveryTime: string;
  cardText: string;
  comment: string;
};

const inputClassName =
  "mt-1.5 w-full rounded-xl border border-[#f0ddd6] bg-white px-3 py-2.5 text-sm text-stone-950 outline-none transition focus:border-[#dfbfc5] focus:ring-2 focus:ring-[#fff3f5]";

const qrImage = process.env.NEXT_PUBLIC_QR_IMAGE;

const initialOrderData: OrderFormData = {
  name: "",
  phone: "",
  address: "",
  deliveryDate: "",
  deliveryTime: "",
  cardText: "",
  comment: "",
};

export function OrderModal({ bouquet, onClose }: OrderModalProps) {
  const [step, setStep] = useState<CheckoutStep>("order");
  const [orderData, setOrderData] = useState<OrderFormData>(initialOrderData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function handleOrderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setOrderData({
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      address: String(formData.get("address") ?? ""),
      deliveryDate: String(formData.get("deliveryDate") ?? ""),
      deliveryTime: String(formData.get("deliveryTime") ?? ""),
      cardText: String(formData.get("cardText") ?? ""),
      comment: String(formData.get("comment") ?? ""),
    });
    setSubmitError("");
    setStep("payment");
  }

  async function handleReceiptSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    setIsSubmitting(true);
    setSubmitError("");

    const receiptFormData = new FormData(form);
    const orderFormData = new FormData();
    const receipt = receiptFormData.get("receipt");

    orderFormData.append("bouquetName", bouquet.name);
    orderFormData.append("bouquetPrice", String(bouquet.price));
    orderFormData.append("name", orderData.name);
    orderFormData.append("phone", orderData.phone);
    orderFormData.append("address", orderData.address);
    orderFormData.append("deliveryDate", orderData.deliveryDate);
    orderFormData.append("deliveryTime", orderData.deliveryTime);
    orderFormData.append("cardText", orderData.cardText);
    orderFormData.append("comment", orderData.comment);

    if (receipt instanceof File && receipt.size > 0) {
      orderFormData.append("receipt", receipt);
    }

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
      setStep("success");
    } catch {
      setSubmitError("Не удалось отправить заказ. Попробуйте еще раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
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
            {bouquet.price.toLocaleString("ru-RU")} сом
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
                {bouquet.price.toLocaleString("ru-RU")} сом
              </p>
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
                className="rounded-full border border-[#f0ddd6] bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-[#dfbfc5]"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                {isSubmitting ? "Отправляем..." : "Отправить заказ"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleOrderSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-stone-700">
                Имя *
                <input className={inputClassName} name="name" required />
              </label>

              <label className="text-sm font-medium text-stone-700">
                Телефон *
                <input
                  className={inputClassName}
                  name="phone"
                  type="tel"
                  required
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-stone-700">
              Адрес доставки *
              <input className={inputClassName} name="address" required />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-stone-700">
                Дата доставки *
                <input
                  className={inputClassName}
                  name="deliveryDate"
                  type="date"
                  required
                />
              </label>

              <label className="text-sm font-medium text-stone-700">
                Время доставки *
                <input
                  className={inputClassName}
                  name="deliveryTime"
                  type="time"
                  required
                />
              </label>
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
  );
}
