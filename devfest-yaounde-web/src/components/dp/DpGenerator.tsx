"use client";

import {
  ArrowClockwise,
  DownloadSimple,
  ImageSquare,
  ShareNetwork,
  Warning,
} from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Reveal } from "@/components/ui/Reveal";
import {
  ACCEPTED_TYPES,
  composeDp,
  DEFAULT_TRANSFORM,
  DpImageError,
  dpFileName,
  loadPhoto,
  type DpTransform,
} from "@/lib/dp/compose";
import { DEFAULT_FRAME_ID, DP_FRAMES, findFrame } from "@/lib/dp/frames";
import { downloadDp, shareCaption, shareDp } from "@/lib/dp/share";
import { DpStage } from "./DpStage";
import { clampTransform, MAX_SCALE, MIN_SCALE } from "./pan";

/** Matches the slice in `renderDp` — the input refuses what the card would cut. */
const MAX_NICKNAME = 28;

type ErrorCode = DpImageError["code"];
type Notice = "shared" | "copied" | "unavailable" | "downloaded" | "failed";

const subscribeNoop = () => () => {};

/**
 * `/dp-generator` — the whole feature (PAGES.md §9).
 *
 * STANDALONE BY DESIGN: no sign-in, no session, no order, no network call of
 * any kind. It shares the brand and nothing else, so it keeps working when
 * the rest of the site's backend is down, and it can be handed out as a link
 * on its own.
 *
 * NOT A WIZARD. The name, the photo, the look and the crop are all live at
 * once, over one preview that is literally the file you are about to save.
 * A stepper was the obvious shape and the wrong one: every control here
 * changes the same picture, so hiding three of them behind "next" would make
 * people walk the flow again to fix one thing.
 *
 * The compositing, the frames and the sharing come from `src/lib/dp/`. This
 * component owns the state and the screen, and deliberately re-implements
 * none of it.
 */
export function DpGenerator() {
  const t = useTranslations("pages.dpGenerator");
  const tError = useTranslations("errors.dp");
  const locale = useLocale();
  const lang = locale === "en" ? "en" : "fr";

  const [nickname, setNickname] = useState("");
  const [photo, setPhoto] = useState<ImageBitmap | null>(null);
  const [frameId, setFrameId] = useState(DEFAULT_FRAME_ID);
  const [transform, setTransform] = useState<DpTransform>(DEFAULT_TRANSFORM);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [dropping, setDropping] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const zoomId = useId();

  /* Bitmaps hold decoded pixels — a 12 MB JPEG is far larger once decoded, so
     the one being replaced is released rather than left to the collector. The
     cleanup closes the bitmap from ITS OWN render, which is what makes this
     correct on both replace and unmount. */
  useEffect(() => {
    if (!photo) return;
    return () => photo.close();
  }, [photo]);

  /* The share caption carries the event link, and the only honest source for
     it is the address this page is actually being served from — hardcoding a
     domain would put the wrong URL in every caption on every preview
     deployment. Read through useSyncExternalStore so the server renders a
     defined empty value instead of a guess to be corrected. */
  const origin = useSyncExternalStore(
    subscribeNoop,
    () => window.location.origin,
    () => "",
  );
  const eventUrl = origin ? `${origin}/${lang}` : "";

  const frame = findFrame(frameId) ?? DP_FRAMES[0];

  async function acceptFile(file: File | undefined) {
    if (!file) return;
    setNotice(null);
    try {
      const bitmap = await loadPhoto(file);
      setPhoto(bitmap);
      /* A new photo means a new subject: keeping the previous crop would
         frame someone else's shoulders. */
      setTransform(DEFAULT_TRANSFORM);
      setError(null);
    } catch (err) {
      setError(err instanceof DpImageError ? err.code : "unreadable");
    }
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    void acceptFile(e.target.files?.[0]);
    /* Cleared so picking the SAME file twice still fires a change event —
       otherwise "choose another", then changing your mind, does nothing. */
    e.target.value = "";
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDropping(false);
    void acceptFile(e.dataTransfer.files?.[0]);
  }

  async function render(): Promise<Blob | null> {
    if (!photo) return null;
    try {
      return await composeDp({ photo, frameId, nickname, transform });
    } catch {
      setNotice("failed");
      return null;
    }
  }

  async function onDownload() {
    setBusy("download");
    setNotice(null);
    const blob = await render();
    if (blob) {
      downloadDp(blob, dpFileName(nickname));
      setNotice("downloaded");
    }
    setBusy(null);
  }

  async function onShare() {
    setBusy("share");
    setNotice(null);
    const blob = await render();
    if (blob) {
      const outcome = await shareDp({
        blob,
        fileName: dpFileName(nickname),
        locale: lang,
        eventUrl,
      });
      setNotice(outcome);
    }
    setBusy(null);
  }

  const stageLabel = nickname.trim()
    ? t("preview.label", {
        nickname: nickname.trim(),
        frame: frame.label[lang],
      })
    : t("preview.labelAnonymous", { frame: frame.label[lang] });

  const noticeText =
    notice === "downloaded" || notice === "failed"
      ? t(`status.${notice}`)
      : notice
        ? tError(notice)
        : "";

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-16">
      {/* ---------------- Controls ---------------- */}
      <div className="order-2 flex flex-col gap-10 lg:order-1">
        <Field step="01" title={t("steps.name")}>
          <label className="flex flex-col gap-1.5">
            <span className="sr-only">{t("nickname.label")}</span>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={MAX_NICKNAME}
              placeholder={t("nickname.placeholder")}
              autoComplete="off"
              className="w-full max-w-sm rounded-lg border-2 border-black02 bg-offwhite px-4 py-2.5 font-sans text-body-l font-bold text-black02"
            />
            <span className="flex max-w-sm items-center justify-between gap-4 text-caption text-black02/60">
              {t("nickname.hint")}
              <span className="shrink-0 font-mono tabular-nums">
                {nickname.length}/{MAX_NICKNAME}
              </span>
            </span>
          </label>
        </Field>

        <Field step="02" title={t("steps.photo")}>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 bg-primary px-6 py-3 font-sans text-body-m font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-transform duration-200 ease-bouncy hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:transform-none"
            >
              <ImageSquare size={18} weight="bold" aria-hidden />
              {photo ? t("photo.replace") : t("photo.cta")}
            </button>
            {photo && (
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setTransform(DEFAULT_TRANSFORM);
                  setNotice(null);
                }}
                className="rounded-pill border-2 border-black02 px-5 py-3 font-sans text-body-m font-bold text-black02 hover:bg-halftone"
              >
                {t("photo.remove")}
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={onPick}
              className="sr-only"
              aria-label={t("photo.cta")}
            />
          </div>
          <p className="mt-2 text-caption text-black02/60">{t("photo.hint")}</p>

          {error && (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-lg border-2 border-danger bg-danger-pastel p-4 text-body-m font-bold text-black02"
            >
              <Warning
                size={20}
                weight="bold"
                aria-hidden
                className="mt-0.5 shrink-0 text-danger"
              />
              {tError(error)}
            </p>
          )}
        </Field>

        <Field step="03" title={t("steps.look")}>
          <fieldset>
            <legend className="sr-only">{t("steps.look")}</legend>
            <div className="flex flex-wrap gap-3">
              {DP_FRAMES.map((option) => (
                <label key={option.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="dp-frame"
                    value={option.id}
                    checked={option.id === frameId}
                    onChange={() => setFrameId(option.id)}
                    className="peer sr-only"
                  />
                  {/* Selection is carried by weight, a fill AND the ring —
                      never by colour alone (DESIGN.md §2.6). */}
                  <span className="flex items-center gap-2.5 rounded-pill border-2 border-black02 bg-offwhite py-1.5 pl-1.5 pr-4 font-sans text-body-m text-black02 peer-checked:bg-primary peer-checked:font-bold peer-checked:shadow-[0_4px_0_0_var(--color-black02)] peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-[var(--color-primary)]">
                    <span
                      aria-hidden
                      className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-black02"
                      style={{ background: option.background }}
                    >
                      <span
                        className={`h-4 w-4 border-2 ${option.mask === "circle" ? "rounded-pill" : "rounded-sm"}`}
                        style={{ borderColor: option.accent }}
                      />
                    </span>
                    {option.label[lang]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </Field>

        <Field step="04" title={t("steps.frame")}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <label
              htmlFor={zoomId}
              className="font-mono text-mono-tag font-bold uppercase tracking-wide text-black02"
            >
              {t("adjust.zoom")}
            </label>
            <input
              id={zoomId}
              type="range"
              className="dp-range w-full max-w-xs"
              min={MIN_SCALE}
              max={MAX_SCALE}
              step={0.01}
              value={transform.scale}
              disabled={!photo}
              onChange={(e) =>
                setTransform((current) =>
                  photo
                    ? clampTransform(photo, {
                        ...current,
                        scale: Number(e.target.value),
                      })
                    : current,
                )
              }
            />
            <button
              type="button"
              onClick={() => setTransform(DEFAULT_TRANSFORM)}
              disabled={!photo}
              className="inline-flex items-center gap-2 rounded-pill border-2 border-black02 px-4 py-2 font-sans text-body-m font-bold text-black02 hover:bg-halftone disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowClockwise size={16} weight="bold" aria-hidden />
              {t("adjust.reset")}
            </button>
          </div>
          <p id={hintId} className="mt-3 max-w-md text-caption text-black02/70">
            {photo ? t("adjust.hint") : t("adjust.waiting")}
          </p>
        </Field>

        <Reveal className="rounded-lg border-2 border-black02 bg-pastel p-5">
          <p className="font-sans text-body-l font-bold text-black02">
            {t("privacy.title")}
          </p>
          <p className="mt-2 text-body-m text-black02/80">
            {t("privacy.body")}
          </p>
        </Reveal>

        {/* Sits with the privacy note rather than beside the Share button, for
            two reasons: they are the same kind of block — what actually
            happens, in plain words — and the preview rail has to stay SHORTER
            than this column, or it has no room to stick in. */}
        {eventUrl && (
          <Reveal className="rounded-lg border-2 border-black02 bg-offwhite p-5">
            <p className="font-sans text-body-m font-bold text-black02">
              {t("caption.title")}
            </p>
            <p className="mt-2 whitespace-pre-line rounded-md bg-pastel p-3 font-mono text-caption text-black02">
              {shareCaption(lang, eventUrl)}
            </p>
            <p className="mt-2 text-caption text-black02/70">
              {t("caption.hint")}
            </p>
          </Reveal>
        )}
      </div>

      {/*
        ---------------- Preview + actions ----------------

        The preview leads on a phone, so the first thing you see is the thing
        you are making. That does put Download and Share above the controls
        there, which is the trade-off taken knowingly: moving them below would
        need a second mount point chosen by media query, and that buys a
        hydration jump — on mobile if the server shape is desktop, on desktop
        if it is not. Both are worse than one flick back up to a button that
        is plainly disabled until there is something to save.

        The rail sticks under the chrome at the same offset as the filter rail
        (globals.css `--chrome-h`). It can only stick while it stays SHORTER
        than the controls column — that is why the caption block lives over
        there, and why anything else added here should too.
      */}
      <div className="order-1 lg:order-2 lg:sticky lg:top-[calc(var(--chrome-h)+1rem)] lg:self-start">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDropping(true);
          }}
          onDragLeave={() => setDropping(false)}
          onDrop={onDrop}
        >
          {photo ? (
            <DpStage
              photo={photo}
              frameId={frameId}
              nickname={nickname}
              transform={transform}
              onTransformChange={setTransform}
              label={stageLabel}
              hintId={hintId}
            />
          ) : (
            /* The empty state is the drop target and the picker in one, and it
               shows the chosen frame's colours — so the look you picked is
               visible before you have a photo to put in it. */
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              style={{ background: frame.background }}
              className={`flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dropping ? "border-black02 bg-primary" : "border-black02/50"
              }`}
            >
              <ImageSquare
                size={40}
                weight="bold"
                aria-hidden
                style={{ color: frame.accent }}
              />
              <span
                className="font-sans text-body-l font-bold"
                style={{ color: frame.foreground }}
              >
                {dropping ? t("photo.dropActive") : t("preview.empty")}
              </span>
              <span
                className="text-body-m opacity-75"
                style={{ color: frame.foreground }}
              >
                {t("photo.drop")}
              </span>
            </button>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => void onDownload()}
            disabled={!photo || busy !== null}
            className="inline-flex items-center justify-center gap-2 rounded-pill border-2 border-black02 bg-primary px-7 py-3.5 font-sans text-body-l font-bold text-black02 shadow-[0_4px_0_0_var(--color-black02)] transition-transform duration-200 ease-bouncy hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 motion-reduce:transform-none"
          >
            <DownloadSimple size={20} weight="bold" aria-hidden />
            {busy === "download"
              ? t("actions.downloading")
              : t("actions.download")}
          </button>
          <button
            type="button"
            onClick={() => void onShare()}
            disabled={!photo || busy !== null}
            className="inline-flex items-center justify-center gap-2 rounded-pill border-2 border-black02 px-7 py-3 font-sans text-body-m font-bold text-black02 hover:bg-halftone disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShareNetwork size={18} weight="bold" aria-hidden />
            {busy === "share" ? t("actions.sharing") : t("actions.share")}
          </button>
        </div>

        {/* One live region for every outcome — saved, shared, copied, or the
            browser refusing both. Silence after a tap is the failure mode this
            prevents. */}
        <p
          aria-live="polite"
          className="mt-3 min-h-[1.5rem] text-body-m font-bold text-black02"
        >
          {noticeText}
        </p>
      </div>
    </div>
  );
}

/** A numbered control group. Numbered for orientation, not as a wizard step. */
function Field({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-baseline gap-3">
        <span className="font-mono text-mono-tag font-bold text-black02/50">
          {step}
        </span>
        <span className="font-sans text-heading-m font-bold text-black02">
          {title}
        </span>
      </h2>
      {children}
    </section>
  );
}
