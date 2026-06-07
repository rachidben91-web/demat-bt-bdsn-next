const PARIS_TIME_ZONE = "Europe/Paris";
const WEATHER_FETCH_TIMEOUT_MS = 4000;

const SUPPORT_ZONES = [
  {
    id: "villeneuve-la-garenne",
    label: "Villeneuve la Garenne",
    shortLabel: "VLG",
    latitude: 48.9392,
    longitude: 2.3293,
  },
  {
    id: "groslay",
    label: "Groslay",
    shortLabel: "Groslay",
    latitude: 48.9846,
    longitude: 2.3478,
  },
  {
    id: "bois-colombes",
    label: "Bois Colombes",
    shortLabel: "Bois-Col.",
    latitude: 48.9156,
    longitude: 2.2687,
  },
  {
    id: "saint-denis",
    label: "Saint Denis",
    shortLabel: "St-Denis",
    latitude: 48.9362,
    longitude: 2.3574,
  },
] as const;

export type HeaderWeatherZone = {
  id: string;
  label: string;
  temperatureC: number | null;
  rainProbabilityPercent: number | null;
  weatherLabel: string | null;
  weatherIcon: string;
};

export type DayWeatherZone = {
  id: string;
  label: string;
  shortLabel: string;
  weatherLabel: string;
  weatherIcon: string;
  minTempC: number | null;
  maxTempC: number | null;
  rainProbabilityPercent: number | null;
  precipitationMm: number | null;
  humidHours: number;
  rsfLevel: "favorable" | "surveiller" | "deconseillee";
  rsfLabel: string;
};

export type SupportWeatherBundle = {
  generatedAtLabel: string;
  headerZones: HeaderWeatherZone[];
  dayZones: DayWeatherZone[];
  weatherNote: string;
};

type CurrentForecastResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
  hourly?: {
    time?: string[];
    precipitation_probability?: Array<number | null>;
  };
};

type ForecastDailyResponse = {
  daily?: {
    time?: string[];
    weather_code?: Array<number | null>;
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
    precipitation_sum?: Array<number | null>;
  };
  hourly?: {
    time?: string[];
    precipitation_probability?: Array<number | null>;
    relative_humidity_2m?: Array<number | null>;
    precipitation?: Array<number | null>;
  };
};

type ArchiveDailyResponse = {
  daily?: {
    time?: string[];
    weather_code?: Array<number | null>;
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
    precipitation_sum?: Array<number | null>;
  };
  hourly?: {
    time?: string[];
    relative_humidity_2m?: Array<number | null>;
    precipitation?: Array<number | null>;
  };
};

function formatParisIsoDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatTimestampLabel(date = new Date()) {
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return `${dateLabel} — ${timeLabel}`;
}

function formatCompactDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00Z`);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

function roundTemperature(value: number | null | undefined) {
  return typeof value === "number" ? Math.round(value) : null;
}

function roundMetric(value: number | null | undefined, digits = 0) {
  if (typeof value !== "number") {
    return null;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function describeWeatherCode(code: number | null | undefined) {
  switch (code) {
    case 0:
      return "Ensoleille";
    case 1:
      return "Plutot degage";
    case 2:
      return "Partiellement nuageux";
    case 3:
      return "Couvert";
    case 45:
    case 48:
      return "Brouillard";
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return "Bruine";
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
      return "Pluie";
    case 71:
    case 73:
    case 75:
    case 77:
      return "Neige";
    case 80:
    case 81:
    case 82:
      return "Averses";
    case 85:
    case 86:
      return "Averses de neige";
    case 95:
      return "Orage";
    case 96:
    case 99:
      return "Orage avec grele";
    default:
      return "Conditions variables";
  }
}

function weatherIcon(code: number | null | undefined) {
  switch (code) {
    case 0:
    case 1:
      return "☀️";
    case 2:
      return "⛅";
    case 3:
      return "☁️";
    case 45:
    case 48:
      return "🌫️";
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return "🌦️";
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
    case 80:
    case 81:
    case 82:
      return "🌧️";
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return "🌨️";
    case 95:
    case 96:
    case 99:
      return "⛈️";
    default:
      return "🌤️";
  }
}

async function fetchWeatherJson<T>(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(WEATHER_FETCH_TIMEOUT_MS),
    next: { revalidate: 600 },
  });

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  return (await response.json()) as T;
}

function maxDefined(values: Array<number | null | undefined>) {
  const defined = values.filter((value): value is number => typeof value === "number");

  return defined.length > 0 ? Math.max(...defined) : null;
}

function countHumidHours(
  humidities: Array<number | null | undefined>,
  precipitations: Array<number | null | undefined>,
) {
  let humidHours = 0;

  for (let index = 0; index < humidities.length; index += 1) {
    const humidity = humidities[index];
    const precipitation = precipitations[index];

    if ((typeof humidity === "number" && humidity >= 85) || (typeof precipitation === "number" && precipitation > 0.2)) {
      humidHours += 1;
    }
  }

  return humidHours;
}

function inferRainProbabilityFromHistory(
  humidHours: number,
  precipitationMm: number | null,
) {
  if (humidHours <= 0 && (!precipitationMm || precipitationMm <= 0)) {
    return 4;
  }

  const humidityScore = Math.round((humidHours / 24) * 100);
  const precipitationScore =
    precipitationMm && precipitationMm > 0 ? Math.min(100, Math.round(precipitationMm * 8)) : 0;

  return Math.max(humidityScore, precipitationScore);
}

function buildRsfDecision(
  rainProbabilityPercent: number | null,
  humidHours: number,
  precipitationMm: number | null,
) {
  const rainProbability = rainProbabilityPercent ?? 0;
  const precipitation = precipitationMm ?? 0;

  if (rainProbability >= 50 || humidHours >= 4 || precipitation >= 5) {
    return {
      level: "deconseillee" as const,
      label: "RSF deconseillee - Humidite probable du sol",
    };
  }

  if (rainProbability >= 20 || humidHours >= 1 || precipitation >= 1) {
    return {
      level: "surveiller" as const,
      label: "RSF a surveiller - Humidite possible",
    };
  }

  return {
    level: "favorable" as const,
    label: "RSF favorable - Conditions seches probables",
  };
}

async function getHeaderZoneWeather(
  zone: (typeof SUPPORT_ZONES)[number],
): Promise<HeaderWeatherZone> {
  try {
    const todayDate = formatParisIsoDate();
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(zone.latitude));
    url.searchParams.set("longitude", String(zone.longitude));
    url.searchParams.set("current", "temperature_2m,weather_code");
    url.searchParams.set("hourly", "precipitation_probability");
    url.searchParams.set("timezone", PARIS_TIME_ZONE);
    url.searchParams.set("start_date", todayDate);
    url.searchParams.set("end_date", todayDate);

    const weather = await fetchWeatherJson<CurrentForecastResponse>(url.toString());

    return {
      id: zone.id,
      label: zone.label,
      temperatureC: roundTemperature(weather.current?.temperature_2m),
      rainProbabilityPercent: maxDefined(weather.hourly?.precipitation_probability ?? []),
      weatherLabel: describeWeatherCode(weather.current?.weather_code),
      weatherIcon: weatherIcon(weather.current?.weather_code),
    };
  } catch {
    return {
      id: zone.id,
      label: zone.label,
      temperatureC: null,
      rainProbabilityPercent: null,
      weatherLabel: null,
      weatherIcon: "🌤️",
    };
  }
}

async function getForecastDayWeather(
  zone: (typeof SUPPORT_ZONES)[number],
  selectedDate: string,
): Promise<DayWeatherZone | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(zone.latitude));
  url.searchParams.set("longitude", String(zone.longitude));
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
  );
  url.searchParams.set(
    "hourly",
    "precipitation_probability,relative_humidity_2m,precipitation",
  );
  url.searchParams.set("timezone", PARIS_TIME_ZONE);
  url.searchParams.set("start_date", selectedDate);
  url.searchParams.set("end_date", selectedDate);

  const weather = await fetchWeatherJson<ForecastDailyResponse>(url.toString());
  const dayIndex = weather.daily?.time?.findIndex((value) => value === selectedDate) ?? -1;

  if (dayIndex < 0) {
    return null;
  }

  const rainProbabilityPercent = maxDefined(weather.hourly?.precipitation_probability ?? []);
  const humidHours = countHumidHours(
    weather.hourly?.relative_humidity_2m ?? [],
    weather.hourly?.precipitation ?? [],
  );
  const precipitationMm = roundMetric(weather.daily?.precipitation_sum?.[dayIndex] ?? null, 1);
  const rsf = buildRsfDecision(rainProbabilityPercent, humidHours, precipitationMm);
  const code = weather.daily?.weather_code?.[dayIndex];

  return {
    id: zone.id,
    label: zone.label,
    shortLabel: zone.shortLabel,
    weatherLabel: describeWeatherCode(code),
    weatherIcon: weatherIcon(code),
    minTempC: roundTemperature(weather.daily?.temperature_2m_min?.[dayIndex] ?? null),
    maxTempC: roundTemperature(weather.daily?.temperature_2m_max?.[dayIndex] ?? null),
    rainProbabilityPercent,
    precipitationMm,
    humidHours,
    rsfLevel: rsf.level,
    rsfLabel: rsf.label,
  };
}

async function getArchiveDayWeather(
  zone: (typeof SUPPORT_ZONES)[number],
  selectedDate: string,
): Promise<DayWeatherZone | null> {
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(zone.latitude));
  url.searchParams.set("longitude", String(zone.longitude));
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
  );
  url.searchParams.set("hourly", "relative_humidity_2m,precipitation");
  url.searchParams.set("timezone", PARIS_TIME_ZONE);
  url.searchParams.set("start_date", selectedDate);
  url.searchParams.set("end_date", selectedDate);

  const weather = await fetchWeatherJson<ArchiveDailyResponse>(url.toString());
  const dayIndex = weather.daily?.time?.findIndex((value) => value === selectedDate) ?? -1;

  if (dayIndex < 0) {
    return null;
  }

  const precipitationMm = roundMetric(weather.daily?.precipitation_sum?.[dayIndex] ?? null, 1);
  const humidHours = countHumidHours(
    weather.hourly?.relative_humidity_2m ?? [],
    weather.hourly?.precipitation ?? [],
  );
  const rainProbabilityPercent = inferRainProbabilityFromHistory(humidHours, precipitationMm);
  const rsf = buildRsfDecision(rainProbabilityPercent, humidHours, precipitationMm);
  const code = weather.daily?.weather_code?.[dayIndex];

  return {
    id: zone.id,
    label: zone.label,
    shortLabel: zone.shortLabel,
    weatherLabel: describeWeatherCode(code),
    weatherIcon: weatherIcon(code),
    minTempC: roundTemperature(weather.daily?.temperature_2m_min?.[dayIndex] ?? null),
    maxTempC: roundTemperature(weather.daily?.temperature_2m_max?.[dayIndex] ?? null),
    rainProbabilityPercent,
    precipitationMm,
    humidHours,
    rsfLevel: rsf.level,
    rsfLabel: rsf.label,
  };
}

async function getSelectedDayZoneForecast(
  zone: (typeof SUPPORT_ZONES)[number],
  selectedDate: string,
  todayDate: string,
) {
  try {
    return selectedDate < todayDate
      ? await getArchiveDayWeather(zone, selectedDate)
      : await getForecastDayWeather(zone, selectedDate);
  } catch {
    return null;
  }
}

function buildWeatherNote(dayZones: DayWeatherZone[], selectedDate: string, todayDate: string) {
  if (dayZones.length === 0) {
    return selectedDate < todayDate
      ? `Aucune donnee meteo disponible pour le ${formatCompactDate(selectedDate)}.`
      : `Aucune prevision disponible pour le ${formatCompactDate(selectedDate)}.`;
  }

  const strongWatchCount = dayZones.filter((zone) => zone.rsfLevel === "deconseillee").length;
  const mediumWatchCount = dayZones.filter((zone) => zone.rsfLevel === "surveiller").length;
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${selectedDate}T12:00:00Z`));

  if (strongWatchCount > 0) {
    return `${dateLabel} : vigilance humidite forte sur ${strongWatchCount} commune(s).`;
  }

  if (mediumWatchCount > 0) {
    return `${dateLabel} : vigilance humidite moderee sur ${mediumWatchCount} commune(s).`;
  }

  return `${dateLabel} : conditions seches probables sur ${dayZones.length} commune(s).`;
}

export async function getSupportWeatherBundle(
  selectedDate: string,
): Promise<SupportWeatherBundle> {
  const todayDate = formatParisIsoDate();
  const [headerZones, dayZones] = await Promise.all([
    Promise.all(SUPPORT_ZONES.map((zone) => getHeaderZoneWeather(zone))),
    Promise.all(SUPPORT_ZONES.map((zone) => getSelectedDayZoneForecast(zone, selectedDate, todayDate))),
  ]);

  const resolvedDayZones = dayZones.filter((zone): zone is DayWeatherZone => zone !== null);

  return {
    generatedAtLabel: formatTimestampLabel(),
    headerZones,
    dayZones: resolvedDayZones,
    weatherNote: buildWeatherNote(resolvedDayZones, selectedDate, todayDate),
  };
}
