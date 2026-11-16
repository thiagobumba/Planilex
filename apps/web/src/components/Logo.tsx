/**
 * Logo da identidade B · Casa Nova: casinha num quadrado + nome.
 * `sobreVerde`: versão para fundo verde (quadrado menta, casinha verde, nome claro).
 */
export function Logo({ sobreVerde = false }: { sobreVerde?: boolean }) {
  const fundo = sobreVerde ? "var(--cor-primaria-suave)" : "var(--cor-primaria)";
  const traco = sobreVerde ? "var(--cor-primaria)" : "var(--cor-primaria-suave)";
  return (
    <div className={sobreVerde ? "logo logo-claro" : "logo"}>
      <svg width="32" height="32" viewBox="0 0 34 34" aria-hidden="true">
        <rect width="34" height="34" rx="9" fill={fundo}></rect>
        <path d="M9 17 L17 10 L25 17 V25 H9 Z" fill="none" stroke={traco} strokeWidth="2" strokeLinejoin="round"></path>
        <path d="M14 25 V20 H20 V25" fill="none" stroke={traco} strokeWidth="2"></path>
      </svg>
      <span>Planilex</span>
    </div>
  );
}
