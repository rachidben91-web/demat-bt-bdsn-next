"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import {
  subscribeTerrainPushAction,
  unsubscribeTerrainPushAction,
} from "@/app/actions/terrain-push";
import type { SerializablePushSubscription } from "@/lib/terrain-push";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function serializeSubscription(subscription: PushSubscription): SerializablePushSubscription {
  return JSON.parse(JSON.stringify(subscription)) as SerializablePushSubscription;
}

export function TerrainNotificationsCard() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function syncState() {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window &&
        Boolean(publicKey);

      setIsSupported(supported);

      if (!supported) {
        return;
      }

      setPermission(Notification.permission);

      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        setSubscription(existingSubscription);

        if (existingSubscription && Notification.permission === "granted") {
          const result = await subscribeTerrainPushAction({
            subscription: serializeSubscription(existingSubscription),
            userAgent: navigator.userAgent,
          });

          if (result.error) {
            setError(result.error);
          }
        }
      } catch (syncError) {
        console.error("Terrain push sync failed", syncError);
      }
    }

    void syncState();
  }, [publicKey]);

  async function handleSubscribe() {
    if (!publicKey) {
      setError("La cle publique des notifications est absente.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      let nextPermission = Notification.permission;

      if (nextPermission !== "granted") {
        nextPermission = await Notification.requestPermission();
      }

      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        setError("Autorisation refusee. Active les notifications dans le navigateur Samsung/Chrome.");
        return;
      }

      const nextSubscription =
        subscription ??
        (await registration.pushManager.subscribe({
          applicationServerKey: urlBase64ToUint8Array(publicKey),
          userVisibleOnly: true,
        }));

      const result = await subscribeTerrainPushAction({
        subscription: serializeSubscription(nextSubscription),
        userAgent: navigator.userAgent,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSubscription(nextSubscription);
      setMessage(result.success);
    } catch (subscribeError) {
      setError(
        subscribeError instanceof Error
          ? subscribeError.message
          : "Activation des notifications impossible.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUnsubscribe() {
    if (!subscription) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      await subscription.unsubscribe();
      const result = await unsubscribeTerrainPushAction({
        endpoint: subscription.endpoint,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSubscription(null);
      setMessage(result.success);
    } catch (unsubscribeError) {
      setError(
        unsubscribeError instanceof Error
          ? unsubscribeError.message
          : "Desactivation des notifications impossible.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const hasSubscription = Boolean(subscription);
  const statusLabel = !isSupported
    ? "Indisponible"
    : hasSubscription
      ? "Actives"
      : permission === "denied"
        ? "Bloquees"
        : "A activer";

  return (
    <section className="rounded-[24px] border border-white/70 bg-white/96 p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Alertes terrain
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
            Notifications push
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Recois une alerte sur la tablette Samsung lors d&apos;une nouvelle mission, d&apos;un
            message bureau ou d&apos;un document ajoute.
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Etat: {statusLabel}
          </p>
        </div>

        {hasSubscription ? (
          <button
            className="inline-flex items-center gap-2 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoading}
            onClick={handleUnsubscribe}
            type="button"
          >
            <BellOff className="h-4 w-4" />
            {isLoading ? "Mise a jour..." : "Desactiver"}
          </button>
        ) : (
          <button
            className="inline-flex items-center gap-2 rounded-[18px] bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(8,145,178,0.24)] transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoading || !isSupported}
            onClick={handleSubscribe}
            type="button"
          >
            <Bell className="h-4 w-4" />
            {isLoading ? "Activation..." : "Activer"}
          </button>
        )}
      </div>

      {!isSupported ? (
        <p className="mt-3 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Les notifications seront disponibles quand la PWA sera ouverte dans un navigateur Android compatible et que les cles push seront configurees.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-[18px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="mt-3 rounded-[18px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
    </section>
  );
}
