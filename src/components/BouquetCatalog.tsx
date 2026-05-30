"use client";

import { useMemo, useState } from "react";
import { BouquetCard } from "@/components/BouquetCard";
import { OrderModal } from "@/components/OrderModal";
import type { Bouquet } from "@/lib/googleSheets";

type BouquetCatalogProps = {
  bouquets: Bouquet[];
};

const ALL_CATEGORIES = "Все";
const ALL_PRICES = "all";

const priceFilters = [
  {
    id: ALL_PRICES,
    label: "Все",
    matches: () => true,
  },
  {
    id: "under-3000",
    label: "До 3 000",
    matches: (price: number) => price < 3000,
  },
  {
    id: "3000-5000",
    label: "3 000–5 000",
    matches: (price: number) => price >= 3000 && price <= 5000,
  },
  {
    id: "5000-8000",
    label: "5 000–8 000",
    matches: (price: number) => price >= 5000 && price <= 8000,
  },
  {
    id: "over-8000",
    label: "8 000+",
    matches: (price: number) => price > 8000,
  },
];

export function BouquetCatalog({ bouquets }: BouquetCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [selectedPriceFilter, setSelectedPriceFilter] = useState(ALL_PRICES);
  const [selectedBouquet, setSelectedBouquet] = useState<Bouquet | null>(null);

  const categories = useMemo(() => {
    const uniqueCategories = bouquets
      .map((bouquet) => bouquet.category.trim())
      .filter(Boolean);

    return [ALL_CATEGORIES, ...Array.from(new Set(uniqueCategories))];
  }, [bouquets]);

  const selectedPriceMatcher =
    priceFilters.find((filter) => filter.id === selectedPriceFilter)
      ?.matches ?? priceFilters[0].matches;

  const filteredBouquets = bouquets.filter((bouquet) => {
    const matchesCategory =
      selectedCategory === ALL_CATEGORIES ||
      bouquet.category === selectedCategory;
    const matchesPrice = selectedPriceMatcher(bouquet.price);

    return matchesCategory && matchesPrice;
  });

  return (
    <>
      <section className="px-4 py-2 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pb-1">
          {categories.map((category) => {
            const isActive = category === selectedCategory;

            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                  isActive
                    ? "border-[#2f2926] bg-[#2f2926] text-white"
                    : "border-[#f0ddd6] bg-white text-stone-700 hover:border-[#dfbfc5]"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-4 pb-10 pt-5 sm:px-6 sm:pt-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 sm:mb-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c98696]">
                Каталог
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Букеты
              </h2>
            </div>

            <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {priceFilters.map((filter) => {
                const isActive = filter.id === selectedPriceFilter;

                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setSelectedPriceFilter(filter.id)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm ${
                      isActive
                        ? "bg-[#262626] text-white shadow-[0_10px_26px_rgba(24,24,27,0.16)]"
                        : "bg-transparent text-zinc-800 hover:bg-zinc-100"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredBouquets.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:gap-6">
              {filteredBouquets.map((bouquet) => (
                <BouquetCard
                  key={bouquet.id}
                  bouquet={bouquet}
                  onOrder={setSelectedBouquet}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-[#eadbd4] bg-[#fff8f6] p-8 text-center text-sm text-stone-500">
              Активные букеты пока не добавлены.
            </div>
          )}
        </div>
      </section>

      {selectedBouquet ? (
        <OrderModal
          bouquet={selectedBouquet}
          onClose={() => setSelectedBouquet(null)}
        />
      ) : null}
    </>
  );
}
