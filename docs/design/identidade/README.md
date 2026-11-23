# Identidade visual — três direções (propostas)

**Substituída em 2026-11-23 pela G · Planta baixa** (`docs/design/estilos/`). Antes, de 2026-11-16 a 2026-11-23, a escolhida foi a **B · Casa Nova**, aplicada no app (tokens em `apps/web/src/app/globals.css`, logo em `apps/web/src/components/Logo.tsx`, tela inicial em `apps/web/src/app/login/page.tsx`). As outras duas ficam como referência. Fontes dos quadros do canvas de design (página "Identidade visual"):
https://claude.ai/artifact/TUjJMSBd4XSLrPrhCijLrX

| Direção | Arquivos | Ideia |
|---------|----------|-------|
| A · Papelaria | `Id-A-Login`, `Id-A-Marca` | Clima de convite de casamento: papel linho, serifa Fraunces com itálico, terracota e sálvia |
| B · Casa Nova | `Id-B-Login`, `Id-B-Marca` | Evolução do visual atual: verde floresta, logo de casinha, prévia do painel já na tela de entrada |
| C · Livro-caixa noturno | `Id-C-Login`, `Id-C-Marca` | Inspirada no APIcanvas (github.com/apicanvas/apicanvas, licença Apache-2.0): tema escuro, valores em IBM Plex Mono, âmbar só para foco e ação principal |

Os três mantêm as regras de `docs/ux-8-regras.md` (aviso com "Desfazer", atalhos, feedback). ## Tokens da direção B

| Token | Cor | Uso |
|-------|-----|-----|
| `--cor-primaria` | `#1F5C46` (Floresta) | Botões principais, logo, menu ativo, vitrine da tela inicial |
| `--cor-primaria-escura` | `#164433` | Hover, textos sobre a menta |
| `--cor-primaria-suave` | `#DCEFE5` (Menta) | Cartão "Disponível", item ativo do menu, etiqueta "Comprado" |
| `--cor-texto` | `#16211C` (Grafite) | Texto principal |
| `--cor-fundo` | `#F4F6F3` | Fundo das telas |
| `--cor-atencao` | `#D69A2D` (Mostarda) | Cômodo perto do limite (90% ou mais) |
| `--cor-alerta-forte` | `#E8704F` (Coral) | Barra de cômodo acima do limite |
| `--cor-alerta` | `#B04A2E` | Textos de alerta (contraste AA) |

Dentro do app:
- **Menu lateral** em verde-floresta com textura de pontos, igual à vitrine da tela inicial. O logo aparece em menta (`<Logo sobreVerde />`), o item ativo em menta e o saldo num bloco translúcido.
- **Cartões** brancos com raio de 20 px e sombra suave.

Fontes: Space Grotesk (títulos e valores) e Inter (texto). Raios: 12 px em botões e campos, 16 px em cartões, 20 px na vitrine.
