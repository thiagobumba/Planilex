/** Logo da identidade B · Casa Nova: casinha num quadrado verde + nome. */
export function Logo() {
  return (
    <div className="logo">
      <svg width="32" height="32" viewBox="0 0 34 34" aria-hidden="true">
        <rect width="34" height="34" rx="9" fill="var(--cor-primaria)"></rect>
        <path d="M9 17 L17 10 L25 17 V25 H9 Z" fill="none" stroke="var(--cor-primaria-suave)" strokeWidth="2" strokeLinejoin="round"></path>
        <path d="M14 25 V20 H20 V25" fill="none" stroke="var(--cor-primaria-suave)" strokeWidth="2"></path>
      </svg>
      <span>Planilex</span>
    </div>
  );
}
