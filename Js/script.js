/* =========================================================
   SHOESFITNESS — JAVASCRIPT
   Interações: busca, carrinho, formulários e notificações.
   Observação: o carrinho é demonstrativo e fica salvo no navegador.
   ========================================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "shoesfitness-carrinho";
    const $ = (seletor, contexto = document) => contexto.querySelector(seletor);
    const $$ = (seletor, contexto = document) => [...contexto.querySelectorAll(seletor)];

    function lerCarrinho() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    function salvarCarrinho(carrinho) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(carrinho));
    }

    function mostrarNotificacao(mensagem, tipo = "sucesso") {
        let toast = $("#sf-toast");

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "sf-toast";
            toast.setAttribute("role", "status");
            toast.setAttribute("aria-live", "polite");
            document.body.appendChild(toast);
        }

        toast.textContent = mensagem;
        toast.dataset.tipo = tipo;
        toast.classList.add("visivel");

        clearTimeout(mostrarNotificacao.timer);
        mostrarNotificacao.timer = setTimeout(() => {
            toast.classList.remove("visivel");
        }, 3000);
    }

    function extrairPreco(card) {
        const textos = $$("h3, p", card).map(el => el.textContent.trim());
        const candidatos = textos.filter(texto => /R\$\s*[\d.]+,\d{2}/.test(texto));
        const texto = candidatos[candidatos.length - 1] || "R$ 0,00";
        const numero = Number(
            texto.replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", ".")
        );
        return Number.isFinite(numero) ? numero : 0;
    }

    function extrairNome(card) {
        const titulo = $("h3", card);
        return titulo ? titulo.textContent.trim() : "Produto ShoesFitness";
    }

    function prepararProdutos() {
        const secoes = [
            "#produtos", "#masculino", "#feminino",
            "#corrida", "#academia", "#casual", "#promocoes"
        ];

        secoes.forEach(seletor => {
            $$(`${seletor} td`).forEach(card => {
                const botao = $("button", card);
                const titulo = $("h3", card);

                if (!botao || !titulo || botao.dataset.sfPreparado) return;

                botao.dataset.sfPreparado = "true";
                botao.type = "button";
                botao.addEventListener("click", () => adicionarAoCarrinho(card));
            });
        });
    }

    function adicionarAoCarrinho(card) {
        const nome = extrairNome(card);
        const preco = extrairPreco(card);
        const seletorTamanho = $("select", card);
        const tamanho = seletorTamanho ? seletorTamanho.value : "";

        if (seletorTamanho && (!tamanho || tamanho === "Tamanho")) {
            mostrarNotificacao(`Selecione o tamanho do ${nome}.`, "erro");
            seletorTamanho.focus();
            return;
        }

        const carrinho = lerCarrinho();
        const chave = `${nome}::${tamanho}`;
        const existente = carrinho.find(item => item.chave === chave);

        if (existente) {
            existente.quantidade += 1;
        } else {
            carrinho.push({
                chave,
                nome,
                preco,
                tamanho,
                quantidade: 1
            });
        }

        salvarCarrinho(carrinho);
        atualizarCarrinho();
        mostrarNotificacao(`${nome} foi adicionado ao carrinho!`);
    }

    function criarPainelCarrinho() {
        if ($("#sf-carrinho")) return;

        const painel = document.createElement("aside");
        painel.id = "sf-carrinho";
        painel.setAttribute("aria-label", "Carrinho de compras");
        painel.setAttribute("aria-hidden", "true");
        painel.innerHTML = `
            <div class="sf-carrinho-cabecalho">
                <h2>Seu carrinho</h2>
                <button type="button" id="sf-fechar-carrinho" aria-label="Fechar carrinho">×</button>
            </div>
            <div id="sf-itens-carrinho"></div>
            <div class="sf-carrinho-rodape">
                <p>Total: <strong id="sf-total-carrinho">R$ 0,00</strong></p>
                <button type="button" id="sf-finalizar-compra">Finalizar compra</button>
            </div>
        `;
        document.body.appendChild(painel);

        $("#sf-fechar-carrinho").addEventListener("click", fecharCarrinho);
        $("#sf-finalizar-compra").addEventListener("click", () => {
            const itens = lerCarrinho();
            if (!itens.length) {
                mostrarNotificacao("Seu carrinho está vazio.", "erro");
                return;
            }
            mostrarNotificacao("Compra demonstrativa: conecte um sistema de pagamento para finalizar.", "erro");
        });

        const linkCarrinho = $$('a[href="#carrinho"]')[0];
        if (linkCarrinho) {
            linkCarrinho.addEventListener("click", event => {
                event.preventDefault();
                abrirCarrinho();
            });
        }
    }

    function atualizarCarrinho() {
        const carrinho = lerCarrinho();
        const quantidade = carrinho.reduce((soma, item) => soma + item.quantidade, 0);
        const link = $$('a[href="#carrinho"]')[0];

        if (link) {
            link.textContent = `🛒 Carrinho (${quantidade})`;
            link.setAttribute("aria-label", `Carrinho com ${quantidade} produtos`);
        }

        const lista = $("#sf-itens-carrinho");
        if (!lista) return;

        lista.innerHTML = "";

        if (!carrinho.length) {
            lista.innerHTML = '<p class="sf-carrinho-vazio">Seu carrinho está vazio.</p>';
        } else {
            carrinho.forEach(item => {
                const linha = document.createElement("div");
                linha.className = "sf-item-carrinho";

                const descricao = document.createElement("div");
                const nome = document.createElement("strong");
                nome.textContent = item.nome;
                const detalhes = document.createElement("small");
                detalhes.textContent = `${item.tamanho ? `Tamanho ${item.tamanho} · ` : ""}${item.quantidade} × ${formatarMoeda(item.preco)}`;
                descricao.append(nome, detalhes);

                const remover = document.createElement("button");
                remover.type = "button";
                remover.textContent = "Remover";
                remover.addEventListener("click", () => {
                    salvarCarrinho(lerCarrinho().filter(produto => produto.chave !== item.chave));
                    atualizarCarrinho();
                });

                linha.append(descricao, remover);
                lista.appendChild(linha);
            });
        }

        const total = carrinho.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
        const totalEl = $("#sf-total-carrinho");
        if (totalEl) totalEl.textContent = formatarMoeda(total);
    }

    function formatarMoeda(valor) {
        return valor.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function abrirCarrinho() {
        const painel = $("#sf-carrinho");
        if (!painel) return;
        painel.classList.add("aberto");
        painel.setAttribute("aria-hidden", "false");
        atualizarCarrinho();
    }

    function fecharCarrinho() {
        const painel = $("#sf-carrinho");
        if (!painel) return;
        painel.classList.remove("aberto");
        painel.setAttribute("aria-hidden", "true");
    }

    function configurarBusca() {
        const formulario = $("header form");
        const campo = $('header input[type="search"]');
        if (!formulario || !campo) return;

        campo.setAttribute("aria-label", "Buscar produtos");
        formulario.addEventListener("submit", event => {
            event.preventDefault();
            const termo = campo.value.trim().toLocaleLowerCase("pt-BR");

            if (!termo) {
                mostrarNotificacao("Digite o nome de um produto para pesquisar.", "erro");
                campo.focus();
                return;
            }

            let encontrados = 0;
            const cards = $$("#produtos td, #masculino td, #feminino td, #corrida td, #academia td, #casual td, #promocoes td");

            cards.forEach(card => {
                const corresponde = card.textContent.toLocaleLowerCase("pt-BR").includes(termo);
                card.hidden = !corresponde;
                if (corresponde) encontrados++;
            });

            $("#produtos").scrollIntoView({ behavior: "smooth" });
            mostrarNotificacao(
                encontrados
                    ? `${encontrados} produto(s) encontrado(s).`
                    : "Nenhum produto encontrado. Tente outro termo.",
                encontrados ? "sucesso" : "erro"
            );
        });

        campo.addEventListener("input", () => {
            if (!campo.value.trim()) {
                $$("#produtos td, #masculino td, #feminino td, #corrida td, #academia td, #casual td, #promocoes td")
                    .forEach(card => card.hidden = false);
            }
        });
    }

    function configurarFormularios() {
        const newsletter = $("#newsletter form");
        if (newsletter) {
            newsletter.addEventListener("submit", event => {
                event.preventDefault();
                const email = $('input[type="email"]', newsletter);
                if (!newsletter.checkValidity()) {
                    newsletter.reportValidity();
                    return;
                }
                mostrarNotificacao("Cadastro recebido! Obrigado por acompanhar a ShoesFitness.");
                newsletter.reset();
            });
        }

        const contato = $("#contato form");
        if (contato) {
            contato.addEventListener("submit", event => {
                event.preventDefault();
                if (!contato.checkValidity()) {
                    contato.reportValidity();
                    return;
                }
                mostrarNotificacao("Mensagem validada! Para receber mensagens de verdade, conecte este formulário a um backend.");
                contato.reset();
            });
        }
    }

    function configurarAtalhos() {
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") fecharCarrinho();
        });

        const conta = $$('a[href="#conta"]')[0];
        if (conta) {
            conta.addEventListener("click", event => {
                event.preventDefault();
                mostrarNotificacao("A área Minha Conta ainda não está disponível.", "erro");
            });
        }

        const ano = $("footer p");
        if (ano) ano.textContent = ano.textContent.replace(/©\s*\d{4}/, `© ${new Date().getFullYear()}`);
    }

    function adicionarEstilosDeInteracao() {
        const estilo = document.createElement("style");
        estilo.textContent = `
            #sf-toast {
                position: fixed; right: 22px; bottom: 22px; z-index: 3000;
                max-width: min(420px, calc(100vw - 32px)); padding: 14px 18px;
                border-radius: 10px; background: #171717; color: #fff;
                box-shadow: 0 8px 28px rgba(0,0,0,.22);
                opacity: 0; transform: translateY(12px); pointer-events: none;
                transition: opacity .25s ease, transform .25s ease;
            }
            #sf-toast.visivel { opacity: 1; transform: translateY(0); }
            #sf-toast[data-tipo="erro"] { border-left: 4px solid #ff4d00; }
            #sf-toast[data-tipo="sucesso"] { border-left: 4px solid #32a66a; }
            #sf-carrinho {
                position: fixed; z-index: 2500; top: 0; right: 0;
                width: min(420px, 100%); height: 100dvh; padding: 24px;
                display: flex; flex-direction: column; gap: 18px;
                background: #fff; box-shadow: -10px 0 35px rgba(0,0,0,.18);
                transform: translateX(105%); transition: transform .3s ease;
            }
            #sf-carrinho.aberto { transform: translateX(0); }
            .sf-carrinho-cabecalho, .sf-carrinho-rodape,
            .sf-item-carrinho { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
            .sf-carrinho-cabecalho h2 { margin: 0; color: #111; }
            #sf-fechar-carrinho { font-size: 28px; padding: 2px 12px; }
            #sf-itens-carrinho { flex: 1; overflow-y: auto; }
            .sf-item-carrinho { padding: 14px 0; border-bottom: 1px solid #eee; }
            .sf-item-carrinho div { display: grid; gap: 4px; }
            .sf-item-carrinho small { color: #666; }
            .sf-item-carrinho button { padding: 7px 10px; background: #333; }
            .sf-carrinho-rodape { border-top: 1px solid #eee; padding-top: 18px; flex-wrap: wrap; }
            .sf-carrinho-rodape p { margin: 0; font-size: 18px; }
            .sf-carrinho-vazio { color: #666; text-align: center; padding: 35px 0; }
            [hidden] { display: none !important; }
            @media (prefers-reduced-motion: reduce) {
                #sf-toast, #sf-carrinho { transition: none; }
            }
        `;
        document.head.appendChild(estilo);
    }

    function iniciar() {
        adicionarEstilosDeInteracao();
        criarPainelCarrinho();
        prepararProdutos();
        configurarBusca();
        configurarFormularios();
        configurarAtalhos();
        atualizarCarrinho();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar);
    } else {
        iniciar();
    }
})();

