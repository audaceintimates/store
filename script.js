// ====================================================================
// CONFIGURAÇÕES GLOBAIS
// ====================================================================

// 1. COLE AQUI A URL DO SEU WEB APP (APPS SCRIPT) - TERMINA EM /exec
const API_URL = 'https://script.google.com/macros/s/AKfycbyYqFl-fYUf04plIYnbLrU-aPqYpDR0zNPy0P-fMb6EqxJFTb7zmY9td-Kej-VinM5K/exec'; // <-- EDITE AQUI

// 2. SEU EMAIL DO FORMSUBMIT
const FORM_SUBMIT_EMAIL = 'micaelcomdeus123@gmail.com'; // <-- EDITE AQUI

// 3. SEU USUÁRIO DA INFINITEPAY
const INFINITEPAY_USER = 'audaces'; 

// URL base para redirecionamento do checkout (AJUSTE CONFORME O SEU NOVO REPOSITÓRIO)
const REDIRECT_BASE_URL = 'https://micaelnascimento2468.github.io/minha-loja-infinite/tela-de-agradecimento'; 

// ====================================================================
// ESTADO GLOBAL E ELEMENTOS
// ====================================================================

let produtosCatalogo = []; // Armazena todos os produtos carregados do Sheets
let carrinho = []; // [ { produtoId: 1, nome: 'Nome', precoCentavos: 10000, quantidade: 1, selecionado: true, variacao: 'Padrão' }, ... ]
let freteSelecionado = 'ENTREGA'; // Pode ser 'ENTREGA' ou 'RETIRADA'

const listaProdutosSection = document.getElementById('lista-produtos');
const modal = document.getElementById('modal-produto');
const detalhesProdutoDiv = document.getElementById('detalhes-produto');
const closeButton = document.querySelector('.close-button');
const checkoutForm = document.getElementById('checkout-form');

// Elementos de Design
const menuToggle = document.getElementById('menu-toggle');
const carrinhoToggle = document.getElementById('carrinho-toggle');
const sidebar = document.getElementById('sidebar');
const carrinhoContador = document.getElementById('carrinho-contador');
const mainContent = document.getElementById('main-content');
const carrinhoPage = document.getElementById('carrinho-page');
const carrinhoItensLista = document.getElementById('carrinho-itens-lista');
const carrinhoSubtotalValor = document.getElementById('carrinho-subtotal-valor');
const btnEntrega = document.getElementById('btn-entrega');
const btnRetirada = document.getElementById('btn-retirada');
const avisoFreteBalao = document.getElementById('aviso-frete-balao');
const btnFinalizarCompra = document.getElementById('btn-finalizar-compra');
const addCarrinhoBtn = document.getElementById('add-carrinho-btn');

// ====================================================================
// FUNÇÕES DE UTILIDADE E CÁLCULO
// ====================================================================

function formatarReais(valorCentavos) {
    const valorReais = valorCentavos / 100;
    return valorReais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcularSubtotal() {
    let total = 0;
    carrinho.forEach(item => {
        if (item.selecionado) {
            total += item.precoCentavos * item.quantidade;
        }
    });
    carrinhoSubtotalValor.textContent = formatarReais(total);
    return total; // Retorna o valor em centavos
}

function atualizarContadorCarrinho() {
    const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    carrinhoContador.textContent = totalItens;
    carrinhoContador.style.display = totalItens > 0 ? 'block' : 'none';
    
    // Atualiza o estado do botão Finalizar Compra
    const itensSelecionados = carrinho.some(item => item.selecionado);
    btnFinalizarCompra.disabled = !itensSelecionados;
}


// ====================================================================
// LÓGICA DE CARREGAMENTO E RENDERIZAÇÃO
// ====================================================================

async function carregarProdutos() {
    listaProdutosSection.innerHTML = '<p>Carregando catálogo...</p>';
    try {
        const response = await fetch(API_URL);
        const produtos = await response.json(); 
        
        // Mapeia e armazena os produtos com um preço numérico já calculado
        produtosCatalogo = produtos.map(produto => {
            let precoLimpo = String(produto.PRECO).replace('R$', '').trim();
            let precoParaCalculo = precoLimpo.replace('.', '').replace(',', '.').trim(); 
            let precoNumerico = parseFloat(precoParaCalculo) || 0; 
            produto.precoEmCentavos = Math.round(precoNumerico * 100);
            return produto;
        });

        renderizarProdutos(produtosCatalogo);
    } catch (error) {
        console.error('Erro:', error);
        listaProdutosSection.innerHTML = '<p class="erro">❌ Erro ao carregar. Verifique a implantação do Apps Script.</p>';
    }
}

function renderizarProdutos(produtos) {
    if (!produtos || produtos.length === 0) {
        listaProdutosSection.innerHTML = '<p>Nenhum produto encontrado.</p>';
        return;
    }

    listaProdutosSection.innerHTML = ''; // Limpa o "Carregando"
    
    produtos.forEach(produto => {
        let precoTexto = String(produto.PRECO).replace('R$', '').trim();
        
        const card = document.createElement('div');
        card.className = 'produto-card';
        card.innerHTML = `
            <img src="${produto.IMAGEM_URL}" alt="${produto.NOME}" onerror="this.src='https://placehold.co/300x200?text=Sem+Imagem'">
            <h3>${produto.NOME}</h3>
            <div class="preco">R$ ${precoTexto}</div>
        `;
        // Agora abre o modal de detalhes, não o checkout
        card.addEventListener('click', () => abrirModalProduto(produto)); 
        listaProdutosSection.appendChild(card);
    });
}

// ====================================================================
// LÓGICA DO MODAL DETALHES (4.jpg)
// ====================================================================

let produtoAtualNoModal = null; // Para saber qual item adicionar ao carrinho

function abrirModalProduto(produto) {
    produtoAtualNoModal = produto;
    let precoTexto = String(produto.PRECO).replace('R$', '').trim();
    
    // Conteúdo Principal do Modal (4.jpg layout)
    detalhesProdutoDiv.innerHTML = `
        <img src="${produto.IMAGEM_URL}" alt="${produto.NOME}" onerror="this.src='https://placehold.co/300x300?text=Imagem'">
        <div class="modal-detalhes-info">
            <h2 class="detalhe-nome">${produto.NOME}</h2>
            <div class="detalhe-preco">R$ ${precoTexto}</div>
            <p class="detalhe-descricao">${produto.DESCRICAO}</p>
            
            <table class="tabela-variacoes">
                <tbody>
                    <tr><th>Quantidade</th><td id="td-quantidade">- 1 +</td></tr>
                </tbody>
            </table>
        </div>
    `;
    
    // Tratamento de Variações na Tabela
    const variacoesHTML = document.createElement('tbody');
    variacoesHTML.id = 'variacao-tbody';
    
    if (produto.VARIACOES && String(produto.VARIACOES).length > 1) {
        const opcoes = String(produto.VARIACOES).split(',').map(v => v.trim());
        
        // Assumimos que a primeira variação é COR e a segunda é TAMANHO, se houver mais de uma coluna no Sheets
        // Para simplificar, vamos usar uma única seleção aqui, como no seu código anterior.
        
        const select = document.createElement('select');
        select.name = 'Variacao_Escolhida';
        select.id = 'select-variacao';
        select.required = true;
        select.innerHTML = '<option value="">Selecione uma opção...</option>' + 
                           opcoes.map(op => `<option value="${op}">${op}</option>`).join('');

        variacoesHTML.innerHTML = `<tr><th>Opção (Cor/Tamanho)</th><td>${select.outerHTML}</td></tr>`;

    } else {
        // Se não houver variação, usamos 'Padrão'
        document.getElementById('td-quantidade').textContent = 'Padrão'; // Não é ideal, mas simplifica
    }

    // Adiciona as variações (se existirem) antes da linha de quantidade
    detalhesProdutoDiv.querySelector('.tabela-variacoes tbody').insertAdjacentElement('beforebegin', variacoesHTML);
    
    // Lógica simples de quantidade (assumindo 1 por padrão no modal)
    addCarrinhoBtn.onclick = adicionarAoCarrinho;

    modal.style.display = 'grid'; // Usando grid para o modal-content
}

function fecharModal() {
    modal.style.display = 'none';
    produtoAtualNoModal = null;
    document.getElementById('select-variacao')?.value = ''; // Reseta a seleção
}

// ====================================================================
// LÓGICA DO CARRINHO (Adicionar, Remover, Renderizar)
// ====================================================================

function adicionarAoCarrinho() {
    if (!produtoAtualNoModal) return;

    // Obtém a variação selecionada (Seletor simples)
    const selectVariacao = document.getElementById('select-variacao');
    const variacao = selectVariacao ? selectVariacao.value : 'Padrão';

    if (selectVariacao && !variacao) {
        alert("Por favor, selecione uma variação.");
        return;
    }

    const novoItem = {
        produtoId: produtoAtualNoModal.ID_PRODUTO,
        nome: produtoAtualNoModal.NOME,
        precoCentavos: produtoAtualNoModal.precoEmCentavos,
        quantidade: 1, // Fixado em 1, para simplificar o flow (pode ser expandido)
        selecionado: true,
        variacao: variacao,
        imagemUrl: produtoAtualNoModal.IMAGEM_URL
    };
    
    // Lógica para agrupar itens iguais (simplificada: agrupa por ID e VARIAÇÃO)
    const itemExistente = carrinho.find(item => 
        item.produtoId === novoItem.produtoId && 
        item.variacao === novoItem.variacao
    );

    if (itemExistente) {
        itemExistente.quantidade++;
    } else {
        carrinho.push(novoItem);
    }

    fecharModal();
    atualizarCarrinhoCompleto();
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    atualizarCarrinhoCompleto();
}

function toggleSelecao(index) {
    carrinho[index].selecionado = !carrinho[index].selecionado;
    atualizarCarrinhoCompleto();
}

function renderizarCarrinhoItens() {
    carrinhoItensLista.innerHTML = '<h2>Seu Carrinho</h2>';

    if (carrinho.length === 0) {
        carrinhoItensLista.innerHTML += '<p>O carrinho está vazio.</p>';
        return;
    }

    carrinho.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'carrinho-item';
        
        // Checkbox Estilizado (2.png)
        const checkbox = document.createElement('div');
        checkbox.className = `checkbox-carrinho ${item.selecionado ? 'checked' : ''}`;
        if (item.selecionado) {
            checkbox.innerHTML = '<i class="fa-solid fa-check"></i>';
        }
        checkbox.onclick = () => toggleSelecao(index);

        itemDiv.innerHTML = `
            <img src="${item.imagemUrl}" alt="${item.nome}" onerror="this.src='https://placehold.co/80x80?text=Sem+Imagem'">
            <div class="item-info">
                <h4>${item.nome} (${item.variacao})</h4>
                <p>R$ ${formatarReais(item.precoCentavos)}</p>
            </div>
            <span class="item-quantidade">- ${item.quantidade} +</span>
            <i class="fa-solid fa-trash-can" style="color: red; cursor: pointer;" onclick="removerDoCarrinho(${index})"></i>
        `;
        
        // Adiciona o checkbox de volta, pois o innerHTML o sobrescreve
        itemDiv.prepend(checkbox); 
        carrinhoItensLista.appendChild(itemDiv);
    });
}

function atualizarCarrinhoCompleto() {
    renderizarCarrinhoItens();
    calcularSubtotal();
    atualizarContadorCarrinho();
}

// ====================================================================
// LÓGICA DE NAVEGAÇÃO E CHECKOUT (Entrega/Retirada)
// ====================================================================

function mostrarPaginaPrincipal() {
    mainContent.classList.remove('hidden');
    carrinhoPage.classList.add('hidden');
    sidebar.classList.remove('open');
}

function mostrarCarrinho() {
    mainContent.classList.add('hidden');
    carrinhoPage.classList.remove('hidden');
    sidebar.classList.remove('open');
    atualizarCarrinhoCompleto();
    // Garante que o balão de frete esteja no estado correto ao abrir
    if (freteSelecionado === 'ENTREGA') {
        avisoFreteBalao.classList.remove('hidden');
        btnEntrega.classList.add('active');
        btnRetirada.classList.remove('active');
    } else {
        avisoFreteBalao.classList.add('hidden');
        btnEntrega.classList.remove('active');
        btnRetirada.classList.add('active');
    }
}

// Handlers de Clique nos Botões de Frete
btnEntrega.addEventListener('click', () => {
    freteSelecionado = 'ENTREGA';
    btnEntrega.classList.add('active');
    btnRetirada.classList.remove('active');
    avisoFreteBalao.classList.remove('hidden'); // Mostra o balão (3.jpg)
    atualizarContadorCarrinho();
});

btnRetirada.addEventListener('click', () => {
    freteSelecionado = 'RETIRADA';
    btnEntrega.classList.remove('active');
    btnRetirada.classList.add('active');
    avisoFreteBalao.classList.add('hidden'); // Esconde o balão
    atualizarContadorCarrinho();
});


// ====================================================================
// SUBMISSÃO FINAL (FormSubmit e InfinitePay - Múltiplos Itens)
// ====================================================================

btnFinalizarCompra.addEventListener('click', (e) => {
    // 1. Filtra apenas os itens selecionados para a compra
    const itensParaCompra = carrinho.filter(item => item.selecionado);

    if (itensParaCompra.length === 0) {
        alert("Selecione pelo menos um item no carrinho para finalizar a compra.");
        return;
    }
    
    const totalEmCentavos = calcularSubtotal(); // Já calcula o subtotal dos selecionados

    // 2. Prepara o JSON para o InfinitePay (lista de itens)
    const infinitePayItems = itensParaCompra.map(item => ({
        "name": `${item.nome} (${item.variacao})`,
        "price": item.precoCentavos,
        "quantity": item.quantidade
    }));
    
    // Converte o array em string JSON (sem URL Encoding)
    const itemsJsonString = JSON.stringify(infinitePayItems);
    
    // 3. Monta o link final do InfinitePay
    const infinitePayLink = `https://checkout.infinitepay.io/${INFINITEPAY_USER}?items=${itemsJsonString}&redirect_url=${REDIRECT_BASE_URL}`;
    
    // 4. Prepara o FormSubmit (para enviar o pedido por email)
    
    // String detalhada dos itens para o email (FormSubmit)
    const listaProdutosEmail = itensParaCompra.map(item => 
        `${item.quantidade}x ${item.nome} (${item.variacao}) - ${formatarReais(item.precoCentavos * item.quantidade)}`
    ).join('\n');

    // Remove campos antigos do FormSubmit se existirem e adiciona os novos
    checkoutForm.innerHTML = `
        <input type="hidden" name="_next" value="${infinitePayLink}"> 
        <input type="hidden" name="_subject" value="NOVO PEDIDO AUDACE - Frete: ${freteSelecionado} - Total: ${formatarReais(totalEmCentavos)}">
        <input type="hidden" name="Tipo_Frete_Escolhido" value="${freteSelecionado}">
        <input type="hidden" name="Total_Pedido" value="${formatarReais(totalEmCentavos)}">
        <textarea name="Lista_Produtos_Detalhada" style="display:none;">${listaProdutosEmail}</textarea>
        
        <label for="nome">Nome Completo:</label><input type="text" id="nome-cliente" name="Nome_Cliente" required>
        <label for="email">E-mail (para confirmação):</label><input type="email" id="email-cliente" name="_replyto" required>
        <label for="telefone">Telefone:</label><input type="tel" id="telefone-cliente" name="Telefone_Cliente" required>
        <label for="endereco">Endereço:</label><textarea id="endereco-cliente" name="Endereco_Cliente" rows="3"></textarea>
    `;
    
    // Criar um modal/popup para preenchimento dos dados do cliente ANTES do submit
    // (Pela complexidade, vamos simplificar para submeter para o FormSubmit e depois redirecionar)
    
    // ** SIMPLIFICAÇÃO: Submeter o formulário com os campos de cliente no meio da página ou em um popup**
    // Para manter o foco no design, a submissão precisa ser manual após o clique do botão.
    
    // Por ser uma mudança estrutural enorme, vamos precisar de um segundo modal para os dados do cliente.
    
    // PARA TESTE RÁPIDO: Envie para o FormSubmit com dados fictícios
    // No entanto, para um fluxo de usuário real, é necessário coletar os dados!
    
    // *** DESAFIO DE FLUXO: COMO COLETAR OS DADOS DO CLIENTE? ***
    // Para simplificar, vou criar um novo modal rápido que aparece no final.
    
    // 5. Chamada de submissão do formulário
    // Criar um modal para os dados do cliente
    mostrarModalDadosCliente(infinitePayLink);
});

// ====================================================================
// NOVO MODAL: DADOS DO CLIENTE (Para FormSubmit)
// ====================================================================

function mostrarModalDadosCliente(infinitePayLink) {
    const dadosClienteModal = document.createElement('div');
    dadosClienteModal.className = 'modal';
    dadosClienteModal.id = 'modal-dados-cliente';
    
    dadosClienteModal.innerHTML = `
        <div class="modal-content" style="grid-template-columns: 1fr; max-width: 450px;">
            <span class="close-button">&times;</span>
            <h3 style="text-align: center;">Seus Dados de Contato</h3>
            <p style="text-align: center; font-size: 0.9em; color: #555;">Precisamos dos seus dados para a entrega e o acompanhamento do pedido.</p>
            
            <form id="dados-cliente-form">
                <label for="nome-cliente-input">Nome Completo:</label>
                <input type="text" id="nome-cliente-input" required>

                <label for="email-cliente-input">E-mail:</label>
                <input type="email" id="email-cliente-input" required>

                <label for="telefone-cliente-input">Telefone:</label>
                <input type="tel" id="telefone-cliente-input" required>

                <label for="endereco-cliente-input">Endereço (Para Entrega/Contato):</label>
                <textarea id="endereco-cliente-input" rows="3" required></textarea>

                <button type="submit" class="btn-comprar" style="width: 100%; margin-top: 15px;">PAGAR COM INFINITEPAY</button>
            </form>
        </div>
    `;

    document.body.appendChild(dadosClienteModal);
    dadosClienteModal.style.display = 'block';

    // Lógica para fechar o modal
    dadosClienteModal.querySelector('.close-button').onclick = () => dadosClienteModal.remove();
    dadosClienteModal.addEventListener('click', (e) => { 
        if (e.target === dadosClienteModal) dadosClienteModal.remove(); 
    });

    // Lógica de Submissão
    document.getElementById('dados-cliente-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        // 1. Preenche o formulário oculto do FormSubmit
        const nome = document.getElementById('nome-cliente-input').value;
        const email = document.getElementById('email-cliente-input').value;
        const telefone = document.getElementById('telefone-cliente-input').value;
        const endereco = document.getElementById('endereco-cliente-input').value;

        // Adiciona os campos de dados do cliente ao formulário de checkout
        const totalEmCentavos = calcularSubtotal();
        const itensParaCompra = carrinho.filter(item => item.selecionado);

        const listaProdutosEmail = itensParaCompra.map(item => 
            `${item.quantidade}x ${item.nome} (${item.variacao}) - ${formatarReais(item.precoCentavos * item.quantidade)}`
        ).join('\n');
        
        // Configura o formulário antes de submeter
        checkoutForm.innerHTML = `
            <input type="hidden" name="_next" value="${infinitePayLink}"> 
            <input type="hidden" name="_subject" value="NOVO PEDIDO AUDACE - Frete: ${freteSelecionado} - Total: ${formatarReais(totalEmCentavos)}">
            <input type="hidden" name="Tipo_Frete_Escolhido" value="${freteSelecionado}">
            <input type="hidden" name="Total_Pedido" value="${formatarReais(totalEmCentavos)}">
            <textarea name="Lista_Produtos_Detalhada" style="display:none;">${listaProdutosEmail}</textarea>
            <input type="hidden" name="Nome_Cliente" value="${nome}">
            <input type="hidden" name="_replyto" value="${email}">
            <input type="hidden" name="Telefone_Cliente" value="${telefone}">
            <textarea name="Endereco_Cliente" style="display:none;">${endereco}</textarea>
        `;

        // 2. Submete o FormSubmit (Isso abrirá uma nova aba com o checkout da InfinitePay)
        checkoutForm.submit();

        // 3. Remove o modal dos dados do cliente
        dadosClienteModal.remove();
    });
}

// ====================================================================
// EVENT LISTENERS E INICIALIZAÇÃO
// ====================================================================

// Navegação
menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
carrinhoToggle.addEventListener('click', mostrarCarrinho);
// Ao clicar no menu, escondemos o carrinho
document.getElementById('menu-categorias').addEventListener('click', mostrarPaginaPrincipal); 

// Fechamento de modal (Detalhes)
closeButton.addEventListener('click', fecharModal);
window.addEventListener('click', (e) => { 
    if (e.target === modal) {
        fecharModal(); 
    }
});

// Inicialização
carregarProdutos();
