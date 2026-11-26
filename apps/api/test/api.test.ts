// Testes de ponta a ponta da API contra um PostgreSQL de teste.
// Uso: TEST_DATABASE_URL=postgresql://... npm test -w @planilex/api
// O banco precisa estar com as migrações aplicadas. NUNCA aponte para o banco real.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import { after, before, describe, test } from "node:test";

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.log("TEST_DATABASE_URL não definida: testes da API ignorados.");
  process.exit(0);
}
process.env.DATABASE_URL = url;
// Nunca falar com o Supabase real: sem a chave secreta, os convites não disparam e-mails nem criam contas.
// (Vazio, e não apagado: o dotenv não sobrescreve uma variável que já existe, então o .env não a traz de volta.)
process.env.SUPABASE_SECRET_KEY = "";
process.env.BACKUP_AUTOMATICO = "0";

// SerpApi simulado: conta as chamadas e responde conforme o termo.
let chamadasSerpApi = 0;
const serpApi = http.createServer((req, res) => {
  chamadasSerpApi++;
  const q = new URL(req.url ?? "", "http://x").searchParams.get("q") ?? "";
  res.setHeader("content-type", "application/json");
  if (q.includes("chave errada")) return res.end(JSON.stringify({ error: "Invalid API key. Your API key should be here: https://serpapi.com/manage-api-key" }));
  if (q.includes("nada")) return res.end(JSON.stringify({ error: "Google Shopping hasn't returned any results for this query." }));
  res.end(
    JSON.stringify({
      shopping_results: [
        { title: "Micro-ondas 32L Inox", source: "Casas Bahia", price: "R$ 719,00", extracted_price: 719, product_link: "https://www.google.com/shopping/product/1", thumbnail: "https://img/1" },
        { title: "Micro-ondas 32L Inox", source: "Magazine Luiza", price: "R$ 689,90", extracted_price: 689.9, link: "https://loja/2", delivery: "Frete grátis" },
        { title: "Sem preço", source: "Loja X", product_link: "https://x" },
      ],
    }),
  );
});
await new Promise<void>((ok) => serpApi.listen(0, ok));
process.env.SERPAPI_URL = `http://127.0.0.1:${(serpApi.address() as { port: number }).port}`;
process.env.SERPAPI_KEY = "chave-de-teste";

// API de afiliados da Shopee simulada: confere a assinatura e responde conforme o termo.
let chamadasShopee = 0;
const shopee = http.createServer((req, res) => {
  chamadasShopee++;
  let corpo = "";
  req.on("data", (d) => (corpo += d));
  req.on("end", async () => {
    const { assinarShopee } = await import("../src/fontes/shopee.js");
    const auth = String(req.headers.authorization ?? "");
    const ts = Number(/Timestamp=(\d+)/.exec(auth)?.[1]);
    res.setHeader("content-type", "application/json");
    if (auth !== assinarShopee("123", "segredo-teste", corpo, ts)) {
      return res.end(JSON.stringify({ errors: [{ message: "Invalid Signature", extensions: { code: 10020 } }] }));
    }
    const termo = String(/keyword: ("(?:[^"\\]|\\.)*")/.exec(JSON.parse(corpo).query)?.[1] ?? '""');
    if (termo.includes("shopee fora")) return res.end(JSON.stringify({ errors: [{ message: "system error", extensions: { code: 11000 } }] }));
    const nodes = termo.includes("com shopee")
      ? [
          { itemId: 1, productName: "Micro-ondas 30L Shopee", priceMin: "650.50", shopName: "Loja Oficial", offerLink: "https://s.shopee.com.br/abc", imageUrl: "https://img/s1" },
          { itemId: 2, productName: "Prato giratório para micro-ondas", priceMin: "39.90", shopName: "Peças", offerLink: "https://s.shopee.com.br/peca" },
          { itemId: 3, productName: "Sem preço", shopName: "X", offerLink: "https://s.shopee.com.br/x" },
          { itemId: 4, productName: "Micro-ondas 20L", priceMin: "599", shopName: "Loja A", productLink: "https://shopee.com.br/a" },
          { itemId: 5, productName: "Micro-ondas 34L", priceMin: "899", shopName: "Loja B", productLink: "https://shopee.com.br/b" },
          { itemId: 6, productName: "Micro-ondas 25L", priceMin: "700", shopName: "Loja C", productLink: "https://shopee.com.br/c" },
        ]
      : [];
    res.end(JSON.stringify({ data: { productOfferV2: { nodes } } }));
  });
});
await new Promise<void>((ok) => shopee.listen(0, ok));
process.env.SHOPEE_API_URL = `http://127.0.0.1:${(shopee.address() as { port: number }).port}/graphql`;
process.env.SHOPEE_APP_ID = "123";
process.env.SHOPEE_APP_SECRET = "segredo-teste";

const { criarApp } = await import("../src/app.js");
const { definirVerificadorDeToken } = await import("../src/plugins/autenticacao.js");
const { db } = await import("../src/db.js");

const ana = randomUUID();
const beto = randomUUID();
const carla = randomUUID();
const dani = randomUUID();
const edu = randomUUID();
const emails: Record<string, string> = {
  [ana]: "ana@teste.com",
  [beto]: "beto@teste.com",
  [carla]: "Carla@Teste.com",
  [dani]: "dani@teste.com",
  [edu]: "edu@teste.com",
};

// Nos testes, o "token" é o próprio id do usuário; o e-mail vem da tabela acima.
definirVerificadorDeToken(async (token) => (token.startsWith("u-") ? { id: token.slice(2), email: emails[token.slice(2)] } : null));
const app = await criarApp({ logger: false });

function chamar(usuario: string | null, method: "GET" | "POST" | "PATCH" | "DELETE", rota: string, body?: unknown) {
  return app.inject({
    method,
    url: rota,
    headers: usuario ? { authorization: `Bearer u-${usuario}` } : {},
    payload: body as object | undefined,
  });
}

describe("API do Planilex", () => {
  let orcamentoId = "";
  let cozinhaId = "";
  let salaId = "";
  let itemId = "";

  before(async () => {
    await app.ready();
  });

  after(async () => {
    await db().orcamento.deleteMany({ where: { membros: { some: { usuarioId: { in: [ana, beto, carla, dani, edu] } } } } });
    await db().buscaPreco.deleteMany({ where: { termo: { startsWith: "teste-planilex " } } });
    await db().$disconnect();
    await app.close();
    serpApi.close();
    shopee.close();
  });

  test("sem token responde 401", async () => {
    const r = await chamar(null, "GET", "/orcamentos");
    assert.equal(r.statusCode, 401);
    const r2 = await app.inject({ method: "GET", url: "/orcamentos", headers: { authorization: "Bearer invalido" } });
    assert.equal(r2.statusCode, 401);
  });

  test("health continua público", async () => {
    assert.equal((await chamar(null, "GET", "/health")).statusCode, 200);
    assert.equal((await chamar(null, "GET", "/health/banco")).json().status, "ok");
  });

  test("cria orçamento com cômodos padrão", async () => {
    const r = await chamar(ana, "POST", "/orcamentos", {
      nome: "Nossa casa",
      valorTotal: 60000,
      reservaImprevistos: 6000,
      dataCasamento: "2027-04-18",
      voltagemCasa: "V220",
    });
    assert.equal(r.statusCode, 201, r.body);
    orcamentoId = r.json().id;
    assert.equal(r.json().dataCasamento, "2027-04-18");

    const lista = (await chamar(ana, "GET", "/orcamentos")).json();
    assert.equal(lista.length, 1);
    assert.equal(lista[0].papel, "DONO");

    const detalhe = (await chamar(ana, "GET", `/orcamentos/${orcamentoId}`)).json();
    assert.deepEqual(
      detalhe.comodos.map((c: { nome: string }) => c.nome),
      ["Cozinha", "Sala", "Quarto", "Banheiro", "Área de serviço", "Materiais e obra"],
    );
    cozinhaId = detalhe.comodos[0].id;
    salaId = detalhe.comodos[1].id;
  });

  test("orçamento atual: resumo numa chamada só e 204 sem orçamento", async () => {
    const atual = await chamar(ana, "GET", "/orcamentos/atual");
    assert.equal(atual.statusCode, 200, atual.body);
    assert.equal(atual.json().id, orcamentoId);
    assert.equal(atual.json().papel, "DONO");
    assert.equal(atual.json().comodos.length, 6);
    assert.ok(atual.json().resumo);
    assert.equal((await chamar(beto, "GET", "/orcamentos/atual")).statusCode, 204);
  });

  test("valida os dados do orçamento", async () => {
    const r = await chamar(ana, "POST", "/orcamentos", { nome: "", valorTotal: -1 });
    assert.equal(r.statusCode, 400);
    assert.ok(r.json().erro);
  });

  test("outra pessoa não vê nem altera o orçamento", async () => {
    assert.equal((await chamar(beto, "GET", "/orcamentos")).json().length, 0);
    assert.equal((await chamar(beto, "GET", `/orcamentos/${orcamentoId}`)).statusCode, 404);
    assert.equal((await chamar(beto, "PATCH", `/orcamentos/${orcamentoId}`, { nome: "x" })).statusCode, 404);
    assert.equal((await chamar(beto, "POST", "/itens", { nome: "x", comodoId: cozinhaId })).statusCode, 404);
    assert.equal((await chamar(beto, "GET", `/orcamentos/${orcamentoId}/itens`)).statusCode, 404);
  });

  test("cômodos: limite, nome repetido e exclusão", async () => {
    assert.equal((await chamar(ana, "PATCH", `/comodos/${cozinhaId}`, { limite: 15000 })).json().limite, 15000);
    assert.equal((await chamar(ana, "POST", `/orcamentos/${orcamentoId}/comodos`, { nome: "Cozinha" })).statusCode, 409);
    const varanda = await chamar(ana, "POST", `/orcamentos/${orcamentoId}/comodos`, { nome: "Varanda", limite: 2000 });
    assert.equal(varanda.statusCode, 201);
    assert.equal(varanda.json().ordem, 6);
    assert.equal((await chamar(ana, "DELETE", `/comodos/${varanda.json().id}`)).statusCode, 204);
  });

  test("itens: criar, regras de comprado, mover e filtrar", async () => {
    const r = await chamar(ana, "POST", "/itens", {
      nome: "Micro-ondas 32L Inox",
      comodoId: cozinhaId,
      situacao: "ESCOLHIDO",
      valorPrevisto: 689.9,
    });
    assert.equal(r.statusCode, 201, r.body);
    itemId = r.json().id;
    assert.equal(r.json().comodo, "Cozinha");

    // Comprado sem valor pago é recusado
    const semPago = await chamar(ana, "PATCH", `/itens/${itemId}`, { situacao: "COMPRADO" });
    assert.equal(semPago.statusCode, 400);

    const comprado = await chamar(ana, "PATCH", `/itens/${itemId}`, { situacao: "COMPRADO", valorPago: 650 });
    assert.equal(comprado.json().valorPago, 650);

    // Voltar para escolhido limpa o valor pago
    const volta = await chamar(ana, "PATCH", `/itens/${itemId}`, { situacao: "ESCOLHIDO" });
    assert.equal(volta.json().valorPago, null);
    await chamar(ana, "PATCH", `/itens/${itemId}`, { situacao: "COMPRADO", valorPago: 650 });

    await chamar(ana, "POST", "/itens", { nome: "Sofá 3 lugares", comodoId: salaId, valorPrevisto: 3200 });
    await chamar(ana, "POST", "/itens", { nome: "Geladeira", comodoId: cozinhaId, valorPrevisto: 15000 });

    const daCozinha = (await chamar(ana, "GET", `/orcamentos/${orcamentoId}/itens?comodoId=${cozinhaId}`)).json();
    assert.equal(daCozinha.length, 2);
    const busca = (await chamar(ana, "GET", `/orcamentos/${orcamentoId}/itens?busca=sofá`)).json();
    assert.equal(busca.length, 1);
    const comprados = (await chamar(ana, "GET", `/orcamentos/${orcamentoId}/itens?situacao=COMPRADO`)).json();
    assert.equal(comprados.length, 1);
  });

  test("edição parcial não volta campos para o padrão", async () => {
    // Regressão: no zod v4, .partial() aplicava os .default() e o PATCH só com a situação voltava a quantidade para 1.
    const novo = await chamar(ana, "POST", "/itens", { nome: "Cadeiras", comodoId: salaId, quantidade: 6, situacao: "CADASTRADO", valorPrevisto: 1200 });
    assert.equal(novo.statusCode, 201, novo.body);
    const id = novo.json().id;
    const comprado = (await chamar(ana, "PATCH", `/itens/${id}`, { situacao: "COMPRADO", valorPago: 1100 })).json();
    assert.equal(comprado.quantidade, 6);
    const desmarcado = (await chamar(ana, "PATCH", `/itens/${id}`, { situacao: "ESCOLHIDO" })).json();
    assert.equal(desmarcado.quantidade, 6);
    const renomeado = (await chamar(ana, "PATCH", `/itens/${id}`, { nome: "Cadeiras de jantar" })).json();
    assert.equal(renomeado.situacao, "ESCOLHIDO");
    assert.equal(renomeado.quantidade, 6);

    // GET /itens/:id devolve só o item; quem não é membro recebe 404.
    const um = await chamar(ana, "GET", `/itens/${id}`);
    assert.equal(um.statusCode, 200, um.body);
    assert.equal(um.json().nome, "Cadeiras de jantar");
    assert.equal(um.json().comodo, "Sala");
    assert.equal((await chamar(beto, "GET", `/itens/${id}`)).statusCode, 404);
    assert.equal((await chamar(ana, "DELETE", `/itens/${id}`)).statusCode, 204);
    assert.equal((await chamar(ana, "GET", `/itens/${id}`)).statusCode, 404);

    // Cômodo: PATCH só com o nome mantém o limite.
    const antes = (await chamar(ana, "PATCH", `/comodos/${cozinhaId}`, { nome: "Cozinha nova" })).json();
    assert.equal(antes.limite, 15000);
    assert.equal((await chamar(ana, "PATCH", `/comodos/${cozinhaId}`, { nome: "Cozinha" })).json().limite, 15000);
  });

  test("não exclui cômodo com itens", async () => {
    const r = await chamar(ana, "DELETE", `/comodos/${cozinhaId}`);
    assert.equal(r.statusCode, 409);
  });

  test("resumo do painel soma certo", async () => {
    const d = (await chamar(ana, "GET", `/orcamentos/${orcamentoId}`)).json();
    // Considerado: 650 (pago) + 15000 + 3200 = 18850
    assert.equal(d.resumo.previsto, 18850);
    assert.equal(d.resumo.pago, 650);
    assert.equal(d.resumo.aPagar, 18200);
    assert.equal(d.resumo.disponivel, 41150);
    const cozinha = d.comodos.find((c: { nome: string }) => c.nome === "Cozinha");
    assert.equal(cozinha.previsto, 15650);
    assert.equal(cozinha.acimaDoLimite, true);
    assert.equal(cozinha.excedente, 650);
    assert.equal(cozinha.quantidadeComprados, 1);
  });

  test("convidar pessoas: só o dono, validação e repetidos", async () => {
    // Beto ainda não é membro: não vê nem convida
    assert.equal((await chamar(beto, "POST", `/orcamentos/${orcamentoId}/convites`, { email: "x@teste.com" })).statusCode, 404);
    assert.equal((await chamar(ana, "POST", `/orcamentos/${orcamentoId}/convites`, { email: "não é e-mail" })).statusCode, 400);
    const r = await chamar(ana, "POST", `/orcamentos/${orcamentoId}/convites`, { email: "  BETO@teste.com " });
    assert.equal(r.statusCode, 201, r.body);
    assert.equal(r.json().email, "beto@teste.com");
    // Sem SUPABASE_SECRET_KEY nos testes: o convite vale, mas o e-mail não sai e o motivo vem na resposta
    assert.equal(r.json().emailEnviado, false);
    assert.ok(r.json().motivoEmail);
    assert.equal((await chamar(ana, "POST", `/orcamentos/${orcamentoId}/convites`, { email: "beto@teste.com" })).statusCode, 409);
    assert.equal((await chamar(ana, "POST", `/orcamentos/${orcamentoId}/convites`, { email: "ana@teste.com" })).statusCode, 409);
    await chamar(ana, "POST", `/orcamentos/${orcamentoId}/convites`, { email: "carla@teste.com" });
  });

  test("convidado entra e vê o mesmo orçamento", async () => {
    // O convite também é aceito pela rota do orçamento atual (a que o site usa).
    assert.equal((await chamar(beto, "GET", "/orcamentos/atual")).json().id, orcamentoId);
    const lista = (await chamar(beto, "GET", "/orcamentos")).json();
    assert.equal(lista.length, 1);
    assert.equal(lista[0].id, orcamentoId);
    assert.equal(lista[0].papel, "EDITOR");
    // Pode editar itens, mas não convidar
    assert.equal((await chamar(beto, "POST", "/itens", { nome: "Ventilador", comodoId: cozinhaId })).statusCode, 201);
    assert.equal((await chamar(beto, "POST", `/orcamentos/${orcamentoId}/convites`, { email: "z@teste.com" })).statusCode, 403);
    // E-mail com maiúsculas no login também casa com o convite
    assert.equal((await chamar(carla, "GET", "/orcamentos")).json()[0]?.id, orcamentoId);

    const pessoas = (await chamar(ana, "GET", `/orcamentos/${orcamentoId}/pessoas`)).json();
    assert.equal(pessoas.podeGerenciar, true);
    assert.deepEqual(
      pessoas.membros.map((m: { email: string }) => m.email).sort(),
      ["ana@teste.com", "beto@teste.com", "carla@teste.com"],
    );
    assert.equal(pessoas.convites.length, 0);
    assert.equal((await chamar(beto, "GET", `/orcamentos/${orcamentoId}/pessoas`)).json().podeGerenciar, false);
  });

  test("cancelar convite e remover pessoa", async () => {
    const c = (await chamar(ana, "POST", `/orcamentos/${orcamentoId}/convites`, { email: "depois@teste.com" })).json();
    assert.equal((await chamar(beto, "POST", `/convites/${c.id}/reenviar`)).statusCode, 403);
    const reenvio = await chamar(ana, "POST", `/convites/${c.id}/reenviar`);
    assert.equal(reenvio.statusCode, 200);
    assert.equal(reenvio.json().emailEnviado, false);
    assert.equal((await chamar(beto, "DELETE", `/convites/${c.id}`)).statusCode, 403);
    assert.equal((await chamar(ana, "DELETE", `/convites/${c.id}`)).statusCode, 204);
    assert.equal((await chamar(ana, "DELETE", `/orcamentos/${orcamentoId}/membros/${ana}`)).statusCode, 409);
    assert.equal((await chamar(beto, "DELETE", `/orcamentos/${orcamentoId}/membros/${carla}`)).statusCode, 403);
    assert.equal((await chamar(ana, "DELETE", `/orcamentos/${orcamentoId}/membros/${carla}`)).statusCode, 204);
    assert.equal((await chamar(carla, "GET", `/orcamentos/${orcamentoId}`)).statusCode, 404);
    assert.equal((await chamar(carla, "GET", "/orcamentos")).json().length, 0);
  });

  test("busca de preços: validação, ordem, cache e erros", async () => {
    assert.equal((await chamar(null, "GET", "/precos?q=micro-ondas")).statusCode, 401);
    assert.equal((await chamar(ana, "GET", "/precos?q=ab")).statusCode, 400);

    const termo = `teste-planilex micro-ondas ${randomUUID().slice(0, 8)}`;
    const antes = chamadasSerpApi;
    const r1 = (await chamar(ana, "GET", `/precos?q=${encodeURIComponent("  " + termo.toUpperCase() + " ")}`)).json();
    assert.equal(r1.emCache, false);
    assert.equal(r1.termo, termo);
    assert.deepEqual(r1.ofertas.map((o: { preco: number }) => o.preco), [689.9, 719]); // sem a oferta sem preço, mais barata primeiro
    assert.equal(r1.ofertas[0].link, "https://loja/2");
    assert.equal(r1.ofertas[1].link, "https://www.google.com/shopping/product/1");

    const r2 = (await chamar(beto, "GET", `/precos?q=${encodeURIComponent(termo)}`)).json();
    assert.equal(r2.emCache, true);
    assert.equal(chamadasSerpApi, antes + 1, "a segunda busca deve vir do cache");

    const r3 = (await chamar(ana, "GET", `/precos?q=${encodeURIComponent(termo)}&atualizar=1`)).json();
    assert.equal(r3.emCache, false);
    assert.equal(chamadasSerpApi, antes + 2);

    // Chave do SerpApi recusada: a Shopee ainda responde, e o motivo vem em "avisos"
    const erro = await chamar(ana, "GET", `/precos?q=${encodeURIComponent("teste-planilex chave errada")}`);
    assert.equal(erro.statusCode, 200);
    assert.deepEqual(erro.json().fontes, ["shopee"]);
    assert.match(erro.json().avisos[0], /SERPAPI_KEY/);

    const vazio = (await chamar(ana, "GET", `/precos?q=${encodeURIComponent("teste-planilex nada")}`)).json();
    assert.deepEqual(vazio.ofertas, []);
  });

  test("busca de preços: Google e Shopee juntos, acessórios escondidos e falha de uma fonte", async () => {
    const termo = `teste-planilex com shopee ${randomUUID().slice(0, 8)}`;
    const r = (await chamar(ana, "GET", `/precos?q=${encodeURIComponent(termo)}`)).json();
    assert.deepEqual(r.fontes, ["google", "shopee"]);
    assert.deepEqual(r.avisos, []);
    // 599 (Shopee) · 650,50 (Shopee) · 689,90 (Google) · 700 · 719 (Google) · 899; o prato de R$ 39,90 fica escondido
    assert.deepEqual(r.ofertas.map((o: { preco: number }) => o.preco), [599, 650.5, 689.9, 700, 719, 899]);
    assert.equal(r.ocultas, 1);
    const daShopee = r.ofertas.find((o: { preco: number }) => o.preco === 650.5);
    assert.equal(daShopee.fonte, "shopee");
    assert.equal(daShopee.loja, "Loja Oficial (Shopee)");
    assert.equal(daShopee.link, "https://s.shopee.com.br/abc");
    assert.equal(r.ofertas.find((o: { preco: number }) => o.preco === 689.9).fonte, "google");
    assert.equal((await chamar(ana, "GET", `/precos?q=${encodeURIComponent(termo)}`)).json().emCache, true);

    // Shopee fora do ar: o Google continua aparecendo, com aviso, e a busca não é guardada
    const termoFalha = `teste-planilex shopee fora ${randomUUID().slice(0, 8)}`;
    const f = (await chamar(ana, "GET", `/precos?q=${encodeURIComponent(termoFalha)}`)).json();
    assert.deepEqual(f.fontes, ["google"]);
    assert.equal(f.ofertas.length, 2);
    assert.match(f.avisos[0], /Shopee/);
    assert.equal((await chamar(ana, "GET", `/precos?q=${encodeURIComponent(termoFalha)}`)).json().emCache, false);
  });

  test("busca de preços: marca refina a busca e filtra as ofertas", async () => {
    const base = `teste-planilex micro-ondas ${randomUUID().slice(0, 8)}`;
    const r = (await chamar(ana, "GET", `/precos?q=${encodeURIComponent(base)}&marca=${encodeURIComponent("Casas Bahía")}`)).json();
    assert.equal(r.termo, `${base} casas bahía`, "a marca entra no termo enviado às lojas");
    assert.equal(r.marca, "Casas Bahía");
    assert.equal(r.marcaSemResultado, false);
    assert.deepEqual(r.ofertas.map((o: { loja: string }) => o.loja), ["Casas Bahia"], "sem acento e sem diferenciar maiúsculas");

    const nenhuma = (await chamar(ana, "GET", `/precos?q=${encodeURIComponent(base)}&marca=Electrolux`)).json();
    assert.equal(nenhuma.marcaSemResultado, true);
    assert.equal(nenhuma.ofertas.length, 2, "sem oferta da marca, mostra todas");

    const semMarca = (await chamar(ana, "GET", `/precos?q=${encodeURIComponent(base)}`)).json();
    assert.equal(semMarca.marca, null);
    assert.equal(semMarca.termo, base);
  });

  test("item guarda a oferta escolhida", async () => {
    const r = await chamar(ana, "POST", "/itens", {
      nome: "Micro-ondas com oferta",
      comodoId: cozinhaId,
      situacao: "ESCOLHIDO",
      valorPrevisto: 689.9,
      oferta: { loja: "Magazine Luiza", titulo: "Micro-ondas 32L Inox", preco: 689.9, link: "https://loja/2" },
    });
    assert.equal(r.statusCode, 201, r.body);
    assert.equal(r.json().ofertaEscolhida.loja, "Magazine Luiza");
    assert.equal(r.json().ofertaEscolhida.preco, 689.9);
    const id = r.json().id;
    assert.equal(await db().historicoPreco.count({ where: { itemId: id } }), 1);

    const lista = (await chamar(ana, "GET", `/orcamentos/${orcamentoId}/itens?busca=com oferta`)).json();
    assert.equal(lista[0].ofertaEscolhida.link, "https://loja/2");

    const sem = (await chamar(ana, "PATCH", `/itens/${id}`, { oferta: null })).json();
    assert.equal(sem.ofertaEscolhida, null);
    assert.equal((await chamar(ana, "POST", "/itens", { nome: "x", comodoId: cozinhaId, oferta: { loja: "a", titulo: "b", preco: 1, link: "não é link" } })).statusCode, 400);
    await chamar(ana, "DELETE", `/itens/${id}`);
  });

  test("backup: baixar, importar numa instalação nova e recuperar o acesso pelo e-mail", async () => {
    assert.equal((await chamar(dani, "GET", `/orcamentos/${orcamentoId}/backup`)).statusCode, 404, "só quem tem acesso baixa");
    const r = await chamar(ana, "GET", `/orcamentos/${orcamentoId}/backup`);
    assert.equal(r.statusCode, 200);
    assert.match(String(r.headers["content-disposition"]), /attachment; filename="planilex-/);
    const backup = r.json();
    assert.equal(backup.formato, "planilex-backup");
    assert.equal(backup.orcamentos.length, 1);
    const original = backup.orcamentos[0];
    const totalItens = original.comodos.reduce((s: number, c: { itens: unknown[] }) => s + c.itens.length, 0);
    assert.ok(totalItens > 0);
    assert.ok(original.pessoas.some((p: { email: string; papel: string }) => p.email === "ana@teste.com" && p.papel === "DONO"));
    const comOferta = original.comodos.flatMap((c: { itens: { ofertaEscolhida: string | null }[] }) => c.itens).filter((i: { ofertaEscolhida: string | null }) => i.ofertaEscolhida);

    // Arquivo que não é backup
    const ruim = await chamar(dani, "POST", "/orcamentos/importar", { formato: "outra-coisa" });
    assert.equal(ruim.statusCode, 400);
    assert.match(ruim.json().erro, /não é um backup do Planilex/);

    // Dani importa (instalação nova): vira DONO; ana e as outras pessoas viram convites com o mesmo papel
    original.pessoas.push({ email: "edu@teste.com", papel: "DONO" });
    const imp = await chamar(dani, "POST", "/orcamentos/importar", backup);
    assert.equal(imp.statusCode, 201, imp.body);
    const novoId = imp.json().orcamentos[0].id;
    assert.notEqual(novoId, orcamentoId);
    const atualDani = (await chamar(dani, "GET", "/orcamentos/atual")).json();
    assert.equal(atualDani.id, novoId);
    assert.equal(atualDani.papel, "DONO");
    assert.equal(atualDani.resumo.quantidadeItens, totalItens);
    assert.deepEqual(
      atualDani.comodos.map((c: { nome: string; limite: number }) => [c.nome, c.limite]),
      original.comodos.map((c: { nome: string; limite: number }) => [c.nome, c.limite]),
    );
    const itensNovos = (await chamar(dani, "GET", `/orcamentos/${novoId}/itens`)).json();
    assert.equal(itensNovos.filter((i: { ofertaEscolhida: unknown }) => i.ofertaEscolhida).length, comOferta.length, "oferta escolhida preservada");

    // Edu entra com o e-mail do backup e recupera o acesso como DONO
    const lista = (await chamar(edu, "GET", "/orcamentos")).json();
    assert.equal(lista.length, 1);
    assert.equal(lista[0].id, novoId);
    assert.equal(lista[0].papel, "DONO");
    // O orçamento original não mudou
    assert.equal((await chamar(ana, "GET", `/orcamentos/${orcamentoId}`)).json().resumo.quantidadeItens, totalItens);
  });

  test("excluir item", async () => {
    assert.equal((await chamar(carla, "DELETE", `/itens/${itemId}`)).statusCode, 404); // carla foi removida
    assert.equal((await chamar(ana, "DELETE", `/itens/${itemId}`)).statusCode, 204);
    assert.equal((await chamar(ana, "PATCH", `/itens/${itemId}`, { nome: "x" })).statusCode, 404);
  });
});
