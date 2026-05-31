"use client";

import { useEffect, useRef, useState } from "react";

export type DeliveryLocation = {
  address: string;
  latitude: string;
  longitude: string;
  mapUrl: string;
};

type DeliveryMapPickerProps = {
  initialLocation?: DeliveryLocation | null;
  onCancel: () => void;
  onSelect: (location: DeliveryLocation) => void;
};

type YandexMapEvent = {
  get: (key: string) => [number, number] | undefined;
};

type YandexPlacemark = unknown;

type YandexMap = {
  destroy: () => void;
  setCenter: (coordinates: [number, number], zoom?: number) => void;
  events: {
    add: (eventName: string, handler: (event: YandexMapEvent) => void) => void;
  };
  geoObjects: {
    add: (geoObject: YandexPlacemark) => void;
    remove: (geoObject: YandexPlacemark) => void;
  };
};

type YandexMapsApi = {
  ready: (callback: () => void) => void;
  Map: new (
    container: HTMLElement,
    options: {
      center: [number, number];
      controls: string[];
      zoom: number;
    },
  ) => YandexMap;
  Placemark: new (
    coordinates: [number, number],
    properties?: Record<string, string>,
    options?: Record<string, string>,
  ) => YandexPlacemark;
};

type GeocoderResponse = {
  response?: {
    GeoObjectCollection?: {
      featureMember?: Array<{
        GeoObject?: {
          metaDataProperty?: {
            GeocoderMetaData?: {
              text?: string;
            };
          };
          Point?: {
            pos?: string;
          };
        };
      }>;
    };
  };
};

declare global {
  interface Window {
    ymaps?: YandexMapsApi;
    zhanaiYandexMapsReady?: Promise<void>;
  }
}

const yandexMapsApiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;
const yandexGeocoderApiKey = process.env.NEXT_PUBLIC_YANDEX_GEOCODER_API_KEY;
const defaultCenter: [number, number] = [42.8746, 74.5698];

function getMapUrl(latitude: number, longitude: number): string {
  return `https://yandex.com/maps/?ll=${longitude},${latitude}&z=17&pt=${longitude},${latitude},pm2rdm`;
}

function getLocation(
  address: string,
  [latitude, longitude]: [number, number],
): DeliveryLocation {
  return {
    address,
    latitude: String(latitude),
    longitude: String(longitude),
    mapUrl: getMapUrl(latitude, longitude),
  };
}

function getGeocoderUrl(query: string): string {
  const url = new URL("https://geocode-maps.yandex.ru/v1/");

  url.searchParams.set("apikey", yandexGeocoderApiKey ?? "");
  url.searchParams.set("geocode", query);
  url.searchParams.set("lang", "ru_RU");
  url.searchParams.set("format", "json");
  url.searchParams.set("results", "1");

  return url.toString();
}

function parseGeocoderResponse(data: GeocoderResponse): DeliveryLocation | null {
  const geoObject =
    data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
  const address = geoObject?.metaDataProperty?.GeocoderMetaData?.text ?? "";
  const position = geoObject?.Point?.pos;

  if (!position) {
    return null;
  }

  const [longitude, latitude] = position.split(" ").map(Number);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return getLocation(address, [latitude, longitude]);
}

async function fetchGeocoderLocation(
  query: string,
): Promise<DeliveryLocation | null> {
  if (!yandexGeocoderApiKey) {
    throw new Error("Yandex Geocoder API key is not configured");
  }

  const response = await fetch(getGeocoderUrl(query));

  if (!response.ok) {
    throw new Error(`Yandex Geocoder request failed: ${response.status}`);
  }

  const data = (await response.json()) as GeocoderResponse;

  return parseGeocoderResponse(data);
}

function loadYandexMaps(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.ymaps) {
    return Promise.resolve();
  }

  if (window.zhanaiYandexMapsReady) {
    return window.zhanaiYandexMapsReady;
  }

  window.zhanaiYandexMapsReady = new Promise((resolve, reject) => {
    if (!yandexMapsApiKey) {
      reject(new Error("Yandex Maps API key is not configured"));
      return;
    }

    const script = document.createElement("script");

    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(
      yandexMapsApiKey,
    )}&lang=ru_RU`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Yandex Maps"));
    document.head.appendChild(script);
  });

  return window.zhanaiYandexMapsReady;
}

export function DeliveryMapPicker({
  initialLocation,
  onCancel,
  onSelect,
}: DeliveryMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<YandexMap | null>(null);
  const placemarkRef = useRef<YandexPlacemark | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialLocation?.address ?? "");
  const [selectedLocation, setSelectedLocation] =
    useState<DeliveryLocation | null>(initialLocation ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      try {
        await loadYandexMaps();

        if (!isMounted || !window.ymaps || !mapContainerRef.current) {
          return;
        }

        window.ymaps.ready(() => {
          if (!isMounted || !window.ymaps || !mapContainerRef.current) {
            return;
          }

          const center =
            initialLocation?.latitude && initialLocation.longitude
              ? [Number(initialLocation.latitude), Number(initialLocation.longitude)]
              : defaultCenter;
          const map = new window.ymaps.Map(mapContainerRef.current, {
            center: center as [number, number],
            controls: ["zoomControl", "geolocationControl"],
            zoom: initialLocation ? 17 : 12,
          });

          mapRef.current = map;

          if (initialLocation) {
            addPlacemark([
              Number(initialLocation.latitude),
              Number(initialLocation.longitude),
            ]);
          }

          map.events.add("click", (event) => {
            const coordinates = event.get("coords");

            if (coordinates) {
              void selectCoordinates(coordinates);
            }
          });

          setIsLoading(false);
        });
      } catch {
        if (isMounted) {
          setError("Не удалось загрузить карту.");
          setIsLoading(false);
        }
      }
    }

    function addPlacemark(coordinates: [number, number]) {
      if (!window.ymaps || !mapRef.current) {
        return;
      }

      if (placemarkRef.current) {
        mapRef.current.geoObjects.remove(placemarkRef.current);
      }

      const placemark = new window.ymaps.Placemark(
        coordinates,
        {},
        { preset: "islands#roseDotIcon" },
      );

      placemarkRef.current = placemark;
      mapRef.current.geoObjects.add(placemark);
    }

    async function selectCoordinates(coordinates: [number, number]) {
      if (!window.ymaps || !mapRef.current) {
        return;
      }

      setIsSearching(true);
      setError("");
      addPlacemark(coordinates);
      mapRef.current.setCenter(coordinates, 17);

      try {
        const [latitude, longitude] = coordinates;
        const location = await fetchGeocoderLocation(`${longitude},${latitude}`);

        if (!location) {
          setError("Адрес не найден для выбранной точки.");
          return;
        }

        setSelectedLocation(location);
        setSearchQuery(location.address);
      } catch {
        setError("Не удалось определить адрес. Попробуйте выбрать точку еще раз.");
      } finally {
        setIsSearching(false);
      }
    }

    void initMap();

    return () => {
      isMounted = false;
      mapRef.current?.destroy();
      mapRef.current = null;
      placemarkRef.current = null;
    };
  }, [initialLocation]);

  async function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!window.ymaps || !mapRef.current || !searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    setError("");

    try {
      const location = await fetchGeocoderLocation(searchQuery);

      if (!location) {
        setError("Адрес не найден.");
        return;
      }

      const coordinates: [number, number] = [
        Number(location.latitude),
        Number(location.longitude),
      ];

      if (placemarkRef.current) {
        mapRef.current.geoObjects.remove(placemarkRef.current);
      }

      const placemark = new window.ymaps.Placemark(
        coordinates,
        {},
        { preset: "islands#roseDotIcon" },
      );

      placemarkRef.current = placemark;
      mapRef.current.geoObjects.add(placemark);
      mapRef.current.setCenter(coordinates, 17);
      setSelectedLocation(location);
      setSearchQuery(location.address);
    } catch {
      setError("Не удалось найти адрес.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-zinc-950/50 px-4 py-4 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-[1.5rem] bg-white p-5 shadow-[0_24px_80px_rgba(24,24,27,0.22)] sm:max-w-2xl sm:p-6">
        <div className="mb-4">
          <h3 className="text-xl font-semibold tracking-tight text-stone-950">
            Выберите адрес доставки
          </h3>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Точная доставка будет рассчитана по выбранной точке на карте.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="mb-3 flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-xl border border-[#f0ddd6] bg-white px-3 py-2.5 text-sm text-stone-950 outline-none transition focus:border-[#dfbfc5] focus:ring-2 focus:ring-[#fff3f5]"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Введите адрес в Бишкеке"
          />
          <button
            type="submit"
            disabled={isSearching || isLoading}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Найти
          </button>
        </form>

        <div className="relative h-80 overflow-hidden rounded-2xl bg-[#fff8f6] sm:h-96">
          <div ref={mapContainerRef} className="h-full w-full" />
          {isLoading ? (
            <div className="absolute inset-0 grid place-items-center bg-[#fff8f6] text-sm font-medium text-stone-500">
              Загружаем карту...
            </div>
          ) : null}
        </div>

        {selectedLocation ? (
          <div className="mt-4 rounded-2xl bg-[#fff8f6] p-4 text-sm text-stone-600">
            <p className="font-semibold text-stone-950">
              {selectedLocation.address || "Выбранная точка"}
            </p>
            <p className="mt-1">
              {selectedLocation.latitude}, {selectedLocation.longitude}
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[#f0ddd6] bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-[#dfbfc5]"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!selectedLocation || isSearching}
            onClick={() => {
              if (selectedLocation) {
                onSelect(selectedLocation);
              }
            }}
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Выбрать адрес
          </button>
        </div>
      </div>
    </div>
  );
}
