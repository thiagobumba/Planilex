"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONES = {
  painel: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
      <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
      <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
      <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
    </>
  ),
  itens: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11"></path>
      <path d="M4 6h.01M4 12h.01M4 18h.01"></path>
    </>
  ),
  comodos: <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"></path>,
  configuracoes: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8"></path>
      <circle cx="16" cy="7" r="2"></circle>
      <circle cx="10" cy="17" r="2"></circle>
    </>
  ),
};

const LINKS = [
  { href: "/", rotulo: "Painel", icone: ICONES.painel },
  { href: "/itens", rotulo: "Itens", icone: ICONES.itens },
  { href: "/comodos", rotulo: "Cômodos", icone: ICONES.comodos },
  { href: "/configuracoes", rotulo: "Configurações", curto: "Ajustes", icone: ICONES.configuracoes },
];

/** Menu lateral; no celular (até 820 px) vira a barra de abas fixa embaixo. Marca a página atual. */
export function Menu() {
  const caminho = usePathname();
  return (
    <ul className="menu-links">
      {LINKS.map((l) => {
        const ativo = l.href === "/" ? caminho === "/" : caminho.startsWith(l.href);
        return (
          <li key={l.href}>
            <Link href={l.href} className={ativo ? "menu-link ativo" : "menu-link"} aria-current={ativo ? "page" : undefined}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {l.icone}
              </svg>
              {"curto" in l ? (
                <>
                  <span className="rotulo-longo">{l.rotulo}</span>
                  <span className="rotulo-curto" aria-hidden="true">
                    {l.curto}
                  </span>
                </>
              ) : (
                l.rotulo
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
