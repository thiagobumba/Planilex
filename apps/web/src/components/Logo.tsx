/**
 * Logo da identidade G · Planta baixa: a planta de uma casa (paredes e porta) num quadrado + nome.
 * `sobreEscuro`: versão para o menu azul-marinho (traço e nome claros).
 */
export function Logo({ sobreEscuro = false }: { sobreEscuro?: boolean }) {
  const traco = sobreEscuro ? "#e8eef7" : "var(--cor-primaria)";
  return (
    <div className={sobreEscuro ? "logo logo-claro" : "logo"}>
      <svg width="30" height="30" viewBox="0 0 28 28" aria-hidden="true">
        <rect x="1.5" y="1.5" width="25" height="25" fill="none" stroke={traco} strokeWidth="3"></rect>
        <path d="M1.5 14 H12 M16 14 H26.5 M14 1.5 V9" stroke={traco} strokeWidth="2"></path>
      </svg>
      <span>Planilex</span>
    </div>
  );
}
