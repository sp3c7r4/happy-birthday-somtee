"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { perks, photos, portrait, pride, status, ticker } from "@/lib/content";

type Wish = { id: string; text: string; from: string; createdAt: string };

const CONFETTI = ["#F4A81D", "#1B7A3A", "#7FD99A", "#2DB34A", "#0E4D27", "#E2531F", "#FFFFFF"];
const STICKS = ["#1B7A3A", "#7FD99A", "#EEF7E6", "#0E4D27", "#FFFFFF"];
const BALLOONS = ["#F4A81D", "#1B7A3A", "#7FD99A", "#2DB34A", "#E2531F", "#0E4D27"];
const WISH_TINTS = ["#F4A81D", "#EEF7E6", "#CFF1DA", "#7FD99A"];
const WISH_ROT = [-2, 1.5, -1, 2];
const CANDLE_MSGS = [
  "Blow out all five candles for a surprise",
  "Four to go, keep blowing",
  "Three left, almost there",
  "Two more!",
  "Last one, make a wish first",
];

/* ---------- small svg bits ---------- */

function Sparkle({ size = 24, color = "#F4A81D", style }: { size?: number; color?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={style}>
      <path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12Z" fill={color} />
    </svg>
  );
}

function Star({ size = 24, color = "#F4A81D", className, style }: { size?: number; color?: string; className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={style}>
      <path d="M12 0l2.6 8.2L22 6l-5.4 6L22 18l-7.4-2.2L12 24l-2.6-8.2L2 18l5.4-6L2 6l7.4 2.2Z" fill={color} />
    </svg>
  );
}

function Balloon({ color, width = 120, className, style }: { color: string; width?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} width={width} height={(width * 100) / 60} viewBox="0 0 60 100" aria-hidden="true" style={style}>
      <ellipse cx="30" cy="30" rx="26" ry="30" fill={color} />
      <path d="M30 60l-4 6h8z" fill={color} />
      <path d="M30 66c-6 10 6 18 0 32" fill="none" stroke="#0E4D27" strokeWidth="1.5" />
      <ellipse cx="21" cy="20" rx="5" ry="9" fill="#FFFFFF" opacity=".4" />
    </svg>
  );
}

/* ---------- confetti ---------- */

function useRain(count = 70) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const dur = 6 + ((i * 7) % 11) * 0.5;
        const delay = -(((i * 13) % 37) / 37) * dur;
        const w = 7 + (i % 4) * 3;
        const style: CSSProperties = {
          left: `${(i * 41 + 7) % 100}%`,
          width: w,
          height: i % 3 === 0 ? w : Math.round(w * 1.8),
          borderRadius: i % 5 === 0 ? "50%" : 2,
          background: CONFETTI[i % CONFETTI.length],
          opacity: 0.9,
          animation: `${i % 2 ? "rainA" : "rainB"} ${dur}s linear ${delay.toFixed(2)}s infinite`,
        };
        return style;
      }),
    [count]
  );
}

function Burst({ burst }: { burst: number }) {
  if (burst === 0) return null;
  const anim = burst % 2 ? "burstA" : "burstB";
  return (
    <div className="burst-layer" aria-hidden="true" key={burst}>
      {Array.from({ length: 70 }, (_, i) => {
        const w = 8 + (i % 4) * 3;
        return (
          <span
            key={i}
            className="piece"
            style={{
              left: `${(i * 37 + 11) % 100}%`,
              width: w,
              height: i % 2 ? w : w * 1.8,
              borderRadius: i % 3 === 0 ? "50%" : 2,
              background: CONFETTI[i % CONFETTI.length],
              opacity: 0,
              animation: `${anim} ${2.2 + ((i * 7) % 10) / 8}s ${((i * 13) % 20) / 20}s ease-in forwards`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ---------- page ---------- */

export default function BirthdayPage() {
  const rain = useRain();
  const [burst, setBurst] = useState(0);
  const celebrate = useCallback(() => setBurst((b) => b + 1), []);

  // candles
  const [lit, setLit] = useState([true, true, true, true, true]);
  const litCount = lit.filter(Boolean).length;
  const toggleCandle = (i: number) => {
    const next = lit.slice();
    next[i] = !next[i];
    setLit(next);
    if (next.every((x) => !x)) celebrate();
  };

  // balloons
  const [popped, setPopped] = useState([false, false, false, false, false, false]);
  const poppedCount = popped.filter(Boolean).length;
  const popBalloon = (i: number) => {
    const next = popped.slice();
    next[i] = true;
    setPopped(next);
    if (next.every(Boolean)) celebrate();
  };

  // wishes (persisted via /api/wishes)
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");

  const loadWishes = useCallback(async () => {
    try {
      const res = await fetch("/api/wishes", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setWishes(data.wishes);
      else setNote(data.error ?? "Could not load wishes.");
    } catch {
      setNote("Could not reach the wish wall.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishes();
    const id = setInterval(loadWishes, 15000); // pick up wishes from other people
    return () => clearInterval(id);
  }, [loadWishes]);

  const addWish = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setNote("");
    try {
      const res = await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, from: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save your wish.");
      setWishes((w) => [data.wish, ...w.filter((x) => x.id !== data.wish.id)]);
      setDraft("");
      setName("");
      setNote("Pinned! Thank you.");
      celebrate();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not save your wish.");
    } finally {
      setSending(false);
    }
  };

  const tickerItems = [...ticker, ...ticker, ...ticker, ...ticker];

  return (
    <main className="page">
      <div className="rain-layer" aria-hidden="true">
        {rain.map((s, i) => (
          <span key={i} className="piece" style={s} />
        ))}
      </div>

      {/* HERO */}
      <header className="hero">
        <Burst burst={burst} />
        <Balloon className="bob deco hero-balloon-dark" color="#1B7A3A" width={90} style={{ left: "3%", top: 120, animationDelay: "-1s" }} />
        <Balloon className="bob deco" color="#7FD99A" width={70} style={{ right: "4%", top: 60, animationDelay: "-2.5s" }} />
        <Balloon className="bob deco" color="#FFFFFF" width={60} style={{ left: "44%", bottom: 30, animationDelay: "-0.4s" }} />
        <div className="wrap">
          <div className="hero-top">
            <span className="brand">Arthurite Integrated</span>
            <span className="date-pill">13 November 2026</span>
          </div>
          <div className="hero-body">
            <div className="hero-copy">
              <p className="kicker" style={{ fontSize: 18 }}>Hip hip hooray! Today the whole team says</p>
              <h1 className="wig">Happy birthday, Somto!</h1>
              <p className="lead">
                To our Founder and CEO, the engineer who keeps putting Nigerian businesses on the cloud. Today the only
                thing we&apos;re scaling is the celebration.
              </p>
            </div>
            <div className="cake">
              <div className="candles">
                {lit.map((on, i) => (
                  <button
                    key={i}
                    className="candle"
                    onClick={() => toggleCandle(i)}
                    aria-label={on ? `Blow out candle ${i + 1}` : `Relight candle ${i + 1}`}
                  >
                    {on ? (
                      <svg className="flame" width="22" height="34" viewBox="0 0 22 34" aria-hidden="true">
                        <path d="M11 1C14 9 21 13 21 22a10 10 0 0 1-20 0C1 15 7 12 11 1Z" fill="#E2531F" />
                        <path d="M11 13c2 4 5 6 5 10a5 5 0 0 1-10 0c0-3 3-6 5-10Z" fill="#FFF3C4" />
                      </svg>
                    ) : (
                      <svg width="22" height="34" viewBox="0 0 22 34" aria-hidden="true">
                        <path d="M11 32c-4-4 4-7 0-12s3-8 0-12" fill="none" stroke="#0E4D27" strokeOpacity=".4" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                    <span className="stick" style={{ background: STICKS[i] }} />
                  </button>
                ))}
              </div>
              <div className="tier-top">S · O · M · T · O</div>
              <div className="tier-bottom" />
              <div className="plate" />
              <p className="cake-msg" aria-live="polite">
                {litCount === 0 ? "Wish made. It is already in production." : CANDLE_MSGS[5 - litCount]}
              </p>
              {litCount === 0 && (
                <button className="link-btn" onClick={() => setLit([true, true, true, true, true])}>
                  Relight the candles
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* TICKER */}
      <div className="ticker" aria-hidden="true">
        <div className="marquee">
          {tickerItems.map((t, i) => (
            <span key={i}>
              {t}
              <Sparkle size={22} color="#7FD99A" />
            </span>
          ))}
        </div>
      </div>

      {/* HALL OF PRIDE */}
      <section className="pride">
        <Star className="spin deco" size={420} style={{ right: -120, top: -100, opacity: 0.08 }} />
        <div className="wrap">
          <p className="kicker" style={{ color: "#F4A81D" }}>The Hall of Pride</p>
          <h2 className="h2">Somto, look how far you&apos;ve taken us.</h2>
          <p className="lead">
            Every card flips to show what that milestone means to the people who build with you. Hover one to hold it
            still.
          </p>
          <div className="pride-grid">
            {pride.map((c, i) => (
              <div className="flip" key={c.title}>
                <div className="flip-inner" style={{ animationDelay: `${i * 1.1}s` }}>
                  <div className={`face tone-${c.tone}`}>
                    <Star size={44} color="currentColor" />
                    <div>
                      <p className="face-kicker">{c.kicker}</p>
                      <p className="face-title">{c.title}</p>
                    </div>
                  </div>
                  <div className="face back">
                    <p className="face-kicker" style={{ color: "#1B7A3A" }}>Why we&apos;re proud</p>
                    <p className="face-back">{c.back}</p>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "#1B7A3A" }}>— Team Arthurite</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BALLOONS */}
      <section className="section">
        <div className="wrap">
          <p className="kicker" style={{ color: "#1B7A3A" }}>Party game</p>
          <h2 className="h2">Pop a balloon, Somto</h2>
          <p className="lead">
            Each one is hiding a birthday perk.{" "}
            {poppedCount === 6 ? "All six popped. Every perk is yours!" : `${6 - poppedCount} left to pop.`}
          </p>
          <div className="balloon-grid">
            {popped.map((p, i) => (
              <div className="balloon-cell" key={i}>
                {p ? (
                  <div className="perk pop">{perks[i]}</div>
                ) : (
                  <button className="balloon" onClick={() => popBalloon(i)} aria-label={`Pop balloon ${i + 1}`}>
                    <Balloon className="bob" color={BALLOONS[i]} style={{ animationDelay: `-${i * 0.7}s` }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FORECAST */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap forecast">
          <div>
            <p className="kicker" style={{ color: "#1B7A3A" }}>Today&apos;s forecast</p>
            <h2 className="h2">100% chance of cake. Zero downtime.</h2>
            <p className="lead" style={{ maxWidth: 480 }}>
              Your birthday status page, as filed by the team. All systems are celebrating normally.
            </p>
          </div>
          <div className="status-card bob">
            {status.map((s) => (
              <div className="status-row" key={s.name}>
                <span>{s.name}</span>
                <span className="status-pill">{s.state}</span>
              </div>
            ))}
            <p style={{ margin: "14px 0 0", fontSize: 14, color: "#3C5A45" }}>Uptime this year: one more than last year.</p>
          </div>
        </div>
      </section>

      {/* MOMENTS */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <h2 className="h2" style={{ fontSize: "clamp(36px, 4vw, 56px)" }}>Moments with Somto</h2>
          <div className="feature">
            <div className="starburst">
              <div className="starburst-ring spin" />
              <div className="starburst-photo">
                {portrait.src ? <img src={portrait.src} alt={portrait.alt} /> : "[Portrait: Somto in black]"}
              </div>
              <Star className="bob deco" size={64} style={{ right: -8, top: "52%" }} />
              <Sparkle size={28} style={{ position: "absolute", left: -10, top: "14%" }} />
            </div>
            <div className="ticket-col">
              <div className="ticket wig">
                <p className="ticket-name">Engr. Somtochukwu Ezepue</p>
                <p className="ticket-role">CEO ARTHURITE INTEGRATED</p>
              </div>
              <p style={{ margin: 0, textAlign: "center", fontSize: 20, fontWeight: 500 }}>
                Celebrating your vision and leadership.
              </p>
            </div>
          </div>
          <div className="photo-grid">
            {photos.map((p) => (
              <div
                key={p.label}
                className={`photo wig${p.src ? " has-img" : ""}`}
                style={{ background: p.tint, transform: `rotate(${p.rot}deg)` }}
              >
                {p.src ? <img src={p.src} alt={p.alt} /> : p.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WISH WALL */}
      <section className="wishes" id="wishes">
        <div className="wrap">
          <p className="kicker" style={{ color: "#FFF3C4" }}>The wish wall</p>
          <h2 className="h2">Pin a wish for the boss</h2>
          <form className="wish-form" onSubmit={addWish}>
            <div className="field" style={{ flex: "2 1 320px" }}>
              <label htmlFor="wish-text">Your wish</label>
              <input
                id="wish-text"
                value={draft}
                maxLength={500}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Happy birthday, Somto! ..."
                required
              />
            </div>
            <div className="field" style={{ flex: "1 1 200px" }}>
              <label htmlFor="wish-name">Your name</label>
              <input id="wish-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="From ..." />
            </div>
            <button type="submit" className="btn" disabled={sending}>
              {sending ? "Pinning..." : "Pin it"}
            </button>
          </form>
          <p className="form-note" aria-live="polite">{note}</p>
          {loading ? (
            <p className="empty">Loading wishes...</p>
          ) : wishes.length === 0 ? (
            <p className="empty">No wishes yet. Be the first to pin one!</p>
          ) : (
            <div className="wish-grid">
              {wishes.map((w, i) => (
                <div
                  key={w.id}
                  className="wish pop wig"
                  style={{ background: WISH_TINTS[i % 4], transform: `rotate(${WISH_ROT[i % 4]}deg)` }}
                >
                  <p className="wish-text">{w.text}</p>
                  <p className="wish-from">{w.from}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="footer">
        <p className="footer-title">Here&apos;s to the next chapter, Somto.</p>
        <p style={{ margin: "16px 0 0", fontSize: 18 }}>With love from the whole Arthurite family</p>
        <p className="cities">Lagos · Accra · London</p>
      </footer>
    </main>
  );
}
