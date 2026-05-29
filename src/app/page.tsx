import Link from "next/link";
import { BouquetCatalog } from "@/components/BouquetCatalog";
import { getBouquets } from "@/lib/googleSheets";

export default async function Home() {
  const bouquets = await getBouquets();
  const activeBouquets = bouquets.filter((bouquet) => bouquet.active);

  return (
    <main className="min-h-screen bg-white text-stone-950">
      <header className="sticky top-0 z-20 border-b border-[#f3e7e2] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-10">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Zhanai Store
          </Link>
          <span className="rounded-full bg-[#fff3f5] px-3 py-1.5 text-xs font-semibold text-[#b77b88]">
            Бишкек
          </span>
        </div>
      </header>

      <section className="px-4 pb-4 pt-4 sm:px-6 sm:pt-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[1.5rem] bg-[#fff8f6] p-3 sm:p-5">
            <div className="px-1 py-2 sm:px-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c98696]">
                Цветочная витрина
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Цветы для особых моментов
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
                Цветы для особых моментов.
                <br />
                Подберите букет для дня рождения, свидания или просто без
                повода.
              </p>
            </div>
          </div>
        </div>
      </section>

      <BouquetCatalog bouquets={activeBouquets} />

      <footer className="bg-[#fbf4ef] px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start md:gap-8">
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-stone-950">
                ZHANAI STORE
              </p>
              <p className="mt-3 text-sm text-stone-600">
                Доставка цветов по Бишкеку
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-stone-950">Контакты</p>
              <div className="mt-3 space-y-1.5 text-sm text-stone-600">
                <p>+996 700 000 000</p>
                <a
                  href="mailto:info@zhanai.store"
                  className="inline-block transition hover:text-stone-950"
                >
                  info@zhanai.store
                </a>
                <p>ул. Киевская 123</p>
                <p>Бишкек</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-stone-950">
                Социальные сети
              </p>
              <div className="mt-3 space-y-1.5 text-sm text-stone-600">
                <p>Instagram</p>
                <p>WhatsApp</p>
                <p>Telegram</p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-stone-400">© 2025 Zhanai Store</p>
        </div>
      </footer>
    </main>
  );
}
