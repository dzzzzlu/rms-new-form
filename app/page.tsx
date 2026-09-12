"use client";

import { useState } from "react";
import Image from "next/image";
import {
  FileText,
  ClipboardCheck,
  BarChart3,
  FilePlus,
  MapPin,
  History,
  ListChecks,
  CreditCard,
  Upload,
  Users,
  TrendingUp,
  FileBarChart,
  Menu,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Role = "home" | "student" | "registrar" | "admin";

const CONTENT: Record<
  Role,
  {
    eyebrow?: string;
    title: string;
    sub: string;
    cards: { Icon: LucideIcon; title: string; desc: string }[];
  }
> = {
  home: {
    eyebrow: "RMC WILDCATS",
    title: "Request your academic documents, fully online",
    sub: "Transcripts, certificates, and diplomas — track every request from submission to pickup.",
    cards: [
      { Icon: FileText, title: "For students", desc: "Request documents and pay via GCash." },
      { Icon: ClipboardCheck, title: "For the registrar", desc: "Verify payments and update statuses." },
      { Icon: BarChart3, title: "For administrators", desc: "Manage accounts and view analytics." },
    ],
  },
  student: {
    eyebrow: "STUDENT PORTAL",
    title: "Your documents, one tap away",
    sub: "Request a transcript, pay via GCash, and watch it move from pending to ready — no more lining up at the registrar's window.",
    cards: [
      { Icon: FilePlus, title: "New request", desc: "Start a fresh document request in minutes." },
      { Icon: MapPin, title: "Track status", desc: "Follow your request from pending to ready." },
      { Icon: History, title: "Request history", desc: "Review everything you've requested before." },
    ],
  },
  registrar: {
    eyebrow: "REGISTRAR PORTAL",
    title: "Keep every request moving",
    sub: "Verify GCash payments, update statuses in one click, and export reports — all requests in one queue.",
    cards: [
      { Icon: ListChecks, title: "Manage requests", desc: "See and update every request in one queue." },
      { Icon: CreditCard, title: "Verify payments", desc: "Confirm GCash references before processing." },
      { Icon: Upload, title: "Export reports", desc: "Pull request and revenue data anytime." },
    ],
  },
  admin: {
    eyebrow: "ADMIN PORTAL",
    title: "See the whole system at a glance",
    sub: "Manage user roles, watch demand trends by document and month, and keep the institution's data exportable.",
    cards: [
      { Icon: Users, title: "Manage users", desc: "Control roles and access across the system." },
      { Icon: TrendingUp, title: "Analytics", desc: "Track demand by status, month, and document." },
      { Icon: FileBarChart, title: "Reports", desc: "Institution-wide, exportable at any time." },
    ],
  },
};

const TABS: { key: Role; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "student", label: "Student" },
  { key: "registrar", label: "Registrar" },
  { key: "admin", label: "Admin" },
];

export default function Home() {
  const [role, setRole] = useState<Role>("home");
  const [mobileNav, setMobileNav] = useState(false);
  const c = CONTENT[role];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-brand-100/60 bg-white px-6 py-4 sm:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
            <Image src="/logo.png" alt="Regis Marie College" width={36} height={36} className="rounded-lg" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-brand-950">Regis Marie College</p>
            <p className="text-xs text-brand-400">Document Request System</p>
          </div>
        </div>

        {/* Center tabs (desktop) */}
        <nav className="hidden gap-2 md:flex" aria-label="Portal preview">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setRole(t.key)}
              aria-pressed={role === t.key}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                role === t.key ? "bg-brand-950 text-white" : "text-brand-600 hover:bg-brand-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileNav(!mobileNav)}
          className="rounded-lg p-2 text-brand-950 md:hidden"
          aria-label="Toggle navigation"
        >
          {mobileNav ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile nav dropdown */}
      {mobileNav && (
        <div className="z-10 border-b border-brand-100/60 bg-white px-6 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setRole(t.key);
                  setMobileNav(false);
                }}
                className={`rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition ${
                  role === t.key ? "bg-brand-950 text-white" : "text-slate-500 hover:bg-brand-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-6 py-10 sm:px-10 lg:py-14">
        {/* Hero */}
        <section className="rounded-2xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-10 text-white sm:p-14">
          {c.eyebrow && <p className="mb-3 text-xs font-bold tracking-widest text-gold">{c.eyebrow}</p>}
          <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">{c.title}</h1>
          <p className="mt-4 max-w-xl text-base text-brand-200 sm:text-lg">{c.sub}</p>
        </section>

        {/* Feature cards */}
        <section className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {c.cards.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-brand-100/60 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                <f.Icon className="h-6 w-6 text-brand-600" strokeWidth={1.75} />
              </div>
              <h2 className="font-semibold text-brand-950">{f.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}