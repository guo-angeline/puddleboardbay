"use client";

import { useState, useEffect, useRef } from "react";

const FORMSPREE_ID = "xdajvagj";

type Status = "idle" | "submitting" | "success" | "error";

interface Props {
  onClose: () => void;
  defaultType?: string;
  defaultMessage?: string;
}

export default function FeedbackModal({ onClose, defaultType, defaultMessage }: Props) {
  const [type, setType] = useState(defaultType ?? "feedback");
  const [message, setMessage] = useState(defaultMessage ?? "");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ type, message, email: email || undefined }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ background: "rgba(11,42,71,0.35)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-['Newsreader'] text-lg font-bold text-(--dark)">
            Get in touch
          </h2>
          <button
            onClick={onClose}
            className="text-(--muted) hover:text-(--dark) transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {status === "success" ? (
          <div className="px-6 py-10 text-center">
            <div className="text-4xl mb-3">🏄</div>
            <p className="font-semibold text-(--dark)">Thanks for reaching out!</p>
            <p className="text-sm text-(--muted) mt-1">I&apos;ll get back to you soon.</p>
            <button
              onClick={onClose}
              className="mt-6 px-5 py-2 rounded-lg bg-(--accent) text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-(--muted) uppercase tracking-wide mb-1.5">
                Type
              </label>
              <div className="flex gap-2">
                {[
                  { value: "feedback", label: "Feedback" },
                  { value: "spot", label: "Suggest a spot" },
                  { value: "issue", label: "Report issue" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                    style={
                      type === opt.value
                        ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                        : { background: "#fff", color: "var(--muted)", borderColor: "var(--border)" }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-(--muted) uppercase tracking-wide mb-1.5">
                Message <span className="text-(--accent)">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  type === "spot"
                    ? "Spot name, location, anything helpful..."
                    : type === "issue"
                    ? "What's wrong? Which spot?"
                    : "What's on your mind?"
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base md:text-sm text-(--dark) placeholder-gray-400 focus:outline-none focus:border-(--accent) resize-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-(--muted) uppercase tracking-wide mb-1.5">
                Your email <span className="text-gray-400 font-normal">(optional, for replies)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base md:text-sm text-(--dark) placeholder-gray-400 focus:outline-none focus:border-(--accent)"
              />
            </div>

            {status === "error" && (
              <p className="text-sm text-red-600">Something went wrong. Try again.</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--muted)", background: "#fff" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "submitting"}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {status === "submitting" ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
