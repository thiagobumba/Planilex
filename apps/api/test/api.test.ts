// Testes de ponta a ponta da API contra um PostgreSQL de teste.
// Uso: TEST_DATABASE_URL=postgresql://... npm test -w @planilex/api
// O banco precisa estar com as migrações aplicadas. NUNCA aponte para o banco real.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.log("TEST_DATABASE_URL não definida: testes da API ignorados.");
  process.exit(0);
}
process.env.DATABASE_URL = url;

const { criarApp } = await import("../src/app.js");
const { definirVerificadorDeToken } = await import("../src/plugins/autenticacao.js");
const { db } = await import("../src/db.js");

// Nos testes, o "token" é o próprio id do usuário.
definirVerificadorDeToken(async (token) => (token.startsWith("u-") ? { id: token.slice(2) } : null));

const ana = randomUUID();
const beto = randomUUID();
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
    await db().orcamento.deleteMany({ where: { membros: { some: { usuarioId: { in: [ana, beto] } } } } });
    await db().$disconnect();
    await app.close();
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

  test("excluir item", async () => {
    assert.equal((await chamar(beto, "DELETE", `/itens/${itemId}`)).statusCode, 404);
    assert.equal((await chamar(ana, "DELETE", `/itens/${itemId}`)).statusCode, 204);
    assert.equal((await chamar(ana, "PATCH", `/itens/${itemId}`, { nome: "x" })).statusCode, 404);
  });
});
