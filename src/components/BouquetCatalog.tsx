"use client";

import { useMemo, useState } from "react";
import { BouquetCard } from "@/components/BouquetCard";
import { OrderModal } from "@/components/OrderModal";
import type { Bouquet } from "@/lib/googleSheets";

type BouquetCatalogProps = {
  bouquets: Bouquet[];
};

const ALL_CATEGORIES = "Все";

export function BouquetCatalog({ bouquets }: BouquetCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [selectedBouquet, setSelectedBouquet] = useState<Bouquet | null>(null);

  const categories = useMemo(() => {
    const uniqueCategories = bouquets
      .map((bouquet) => bouquet.category.trim())
      .filter(Boolean);

    return [ALL_CATEGORIES, ...Array.from(new Set(uniqueCategories))];
  }, [bouquets]);

  const filteredBouquets =
    selectedCategory === ALL_CATEGORIES
      ? bouquets
      : bouquets.filter((bouquet) => bouquet.category === selectedCategory);

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
          <div className="mb-5 flex items-end justify-between gap-4 sm:mb-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c98696]">
                Каталог
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Букеты
              </h2>
            </div>

            <div className="hidden rounded-full border border-dashed border-[#eddad3] bg-[#fff8f6] px-4 py-2 text-sm font-medium text-stone-500 sm:block">
              Фильтры позже
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
