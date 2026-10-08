'use client';

import { useEffect, useState } from 'react';
import { EditPencil, HomeText, useContactInfo, useHomeEdit } from './HomepageEditor';
import Link from 'next/link';
import { ArrowUp, BellRing, GraduationCap, Mail, MapPin, Phone } from 'lucide-react';
import { assetUrl, type SiteSettings } from '../siteSettings';
import { LOGIN_PATH, NAV_LINKS, REGISTER_PATH, useDashboardPath } from './useHomeSession';

const columnTitle = 'text-sm font-semibold text-white';
const footerLink = 'text-sm text-slate-300 transition hover:text-white hover:underline';

function BackToTop({ color, textColor }: { color: string; textColor: string }) {
  const [visible, setVisible] = useState(false);
  const { editMode } = useHomeEdit();
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Retour en haut de la page"
      className={`fixed right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition hover:brightness-110 ${editMode ? 'bottom-20' : 'bottom-5'}`}
      style={{ backgroundColor: color, color: textColor }}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

export function HomeFooter({ settings }: { settings: SiteSettings }) {
  const dashboardPath = useDashboardPath();
  const logoUrl = assetUrl(settings.logoUrl);
  const { scolarite } = useContactInfo();
  const { editMode, editContact } = useHomeEdit();
  const hasContact = Boolean(scolarite.address || scolarite.phone || scolarite.email);

  return (
    <footer className="bg-[#06233b] text-slate-300">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        {/* Bandeau d'information */}
        <div className="flex flex-col gap-6 rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <BellRing className="h-4 w-4" style={{ color: settings.secondaryColor }} aria-hidden />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: settings.secondaryColor }}><HomeText contentKey="footer.1" /></span>
            </div>
            <h2 className="mt-4 font-[family-name:var(--font-heading)] text-xl font-bold text-white sm:text-2xl"><HomeText contentKey="footer.2" /></h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300"><HomeText contentKey="footer.3" /></p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            {dashboardPath ? (
              <Link href={dashboardPath} className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-[#0b3b60] transition hover:brightness-95" style={{ backgroundColor: settings.secondaryColor }}><HomeText contentKey="footer.4" /></Link>
            ) : (
              <>
                <Link href={REGISTER_PATH} className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-[#0b3b60] transition hover:brightness-95" style={{ backgroundColor: settings.secondaryColor }}><HomeText contentKey="footer.5" /></Link>
                <Link href={LOGIN_PATH} className="inline-flex items-center justify-center rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"><HomeText contentKey="footer.6" /></Link>
              </>
            )}
          </div>
        </div>

        {/* Colonnes */}
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
          <div>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-12 w-12 rounded-lg bg-white object-contain p-1" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
                  <GraduationCap className="h-6 w-6" style={{ color: settings.secondaryColor }} aria-hidden />
                </span>
              )}
              <div>
                <p className="font-[family-name:var(--font-heading)] text-base font-semibold text-white"><HomeText contentKey="footer.7" /></p>
                <p className="text-xs" style={{ color: settings.secondaryColor }}><HomeText contentKey="footer.8" /></p>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-300"><HomeText contentKey="footer.9" /></p>
          </div>

          <nav aria-label="Le site">
            <h3 className={columnTitle}><HomeText contentKey="footer.10" /></h3>
            <ul className="mt-4 space-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}><a href={link.href} className={footerLink}><HomeText contentKey={link.contentKey} /></a></li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Liens utiles">
            <h3 className={columnTitle}><HomeText contentKey="footer.11" /></h3>
            <ul className="mt-4 space-y-2.5">
              {!dashboardPath && <li><Link href={LOGIN_PATH} className={footerLink}><HomeText contentKey="footer.12" /></Link></li>}
              {!dashboardPath && <li><Link href={REGISTER_PATH} className={footerLink}><HomeText contentKey="footer.13" /></Link></li>}
              {dashboardPath && <li><Link href={dashboardPath} className={footerLink}><HomeText contentKey="footer.14" /></Link></li>}
              <li><Link href="/#statuts" className={footerLink}><HomeText contentKey="footer.15" /></Link></li>
              <li><Link href="/#aide" className={footerLink}><HomeText contentKey="footer.16" /></Link></li>
            </ul>
          </nav>

          {(hasContact || editMode) && (
            <div>
              <h3 className={columnTitle}><HomeText contentKey="footer.17" /><EditPencil label="Modifier les coordonnées" onClick={editContact} className="ml-2" /></h3>
              <ul className="mt-4 space-y-3 text-sm">
                {scolarite.address && (
                  <li className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10"><MapPin className="h-4 w-4" style={{ color: settings.secondaryColor }} aria-hidden /></span>
                    <span className="pt-1">{scolarite.address}</span>
                  </li>
                )}
                {scolarite.phone && (
                  <li className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10"><Phone className="h-4 w-4" style={{ color: settings.secondaryColor }} aria-hidden /></span>
                    <a href={`tel:${scolarite.phone.replace(/\s/g, '')}`} className="pt-1 hover:text-white hover:underline">{scolarite.phone}</a>
                  </li>
                )}
                {scolarite.email && (
                  <li className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10"><Mail className="h-4 w-4" style={{ color: settings.secondaryColor }} aria-hidden /></span>
                    <a href={`mailto:${scolarite.email}`} className="break-all pt-1 hover:text-white hover:underline">{scolarite.email}</a>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Bas de page */}
        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-slate-400">
          © {new Date().getFullYear()}<HomeText contentKey="footer.18" /></div>
      </div>
      <BackToTop color={settings.secondaryColor} textColor="#0b3b60" />
    </footer>
  );
}
