import Image from "next/image";
import type { Bouquet } from "@/lib/googleSheets";
import { formatKgs } from "@/lib/currency";

type BouquetCardProps = {
  bouquet: Bouquet;
  onOrder: (bouquet: Bouquet) => void;
};

function getImageUrl(image: string): string | null {
  try {
    const url = new URL(image);

    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function BouquetCard({ bouquet, onOrder }: BouquetCardProps) {
  const imageUrl = getImageUrl(bouquet.image);

  return (
    <article className="group">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1rem] bg-[#f7ebe8] shadow-[0_12px_34px_rgba(24,24,27,0.08)] transition duration-300 group-hover:shadow-[0_18px_46px_rgba(24,24,27,0.12)] sm:rounded-[1.25rem]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={bouquet.name}
            fill
            sizes="(min-width: 1280px) 370px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <>
            <div className="absolute inset-x-8 bottom-8 top-10 rounded-full bg-[#e6c7bf]" />
            <div className="absolute left-1/2 top-8 h-32 w-24 -translate-x-1/2 rounded-full bg-white/70" />
            <div className="absolute bottom-9 left-1/2 h-28 w-16 -translate-x-1/2 rounded-t-full bg-[#b99383]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.72),transparent_34%),linear-gradient(180deg,transparent,rgba(97,70,58,0.14))]" />
            <div className="absolute bottom-4 left-4 rounded-full bg-white/75 px-3 py-1 text-xs font-medium text-stone-600 backdrop-blur">
              Нет фото
            </div>
          </>
        )}
      </div>

      <div className="space-y-2 pt-2.5 sm:space-y-3 sm:pt-3">
        <div>
          <h2 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-stone-950 sm:min-h-0 sm:text-lg sm:leading-tight">
            {bouquet.name}
          </h2>
          <p className="mt-1 text-sm font-semibold text-zinc-700 sm:text-lg">
            {formatKgs(bouquet.price)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOrder(bouquet)}
          className="w-full rounded-full bg-[#262626] px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 sm:px-4 sm:py-2.5 sm:text-sm"
        >
          Заказать
        </button>
      </div>
    </article>
  );
}
