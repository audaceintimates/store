// Link da sua API Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbwmFW5JzBj_E1B5XeF3Cns2VPXCknFfUqKD9LUyW68-xkOsd2B2ypKInGLGOGmeZdoMsg/exec";

// E-mail para receber notificações (FormSubmit)
const NOTIFICATION_EMAIL = "useaudaceintimates@gmail.com";

// Estado da Aplicação
let allProducts = [];
let cart = [];
let shippingMethod = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    
    // Evento de pesquisa
    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allProducts.filter(p => (p.Nome || '').toLowerCase().includes(term));
            renderProducts(filtered);
        });
    }

    // Menu hamburguer
    const menuBtn = document.getElementById('menu-btn');
    if(menuBtn) {
        menuBtn.addEventListener('click', () => {
            document.getElementById("side-menu").style.width = "250px";
        });
    }
});

function closeMenu() {
    document.getElementById("side-menu").style.width = "0";
}

// 1. Busca dados da Planilha
async function fetchProducts() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        console.log("Dados recebidos da planilha:", data);

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Planilha vazia ou formato incorreto.");
        }

        allProducts = data;
        renderProducts(allProducts);
        renderCategories(allProducts);

    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        document.getElementById('products-container').innerHTML = `
            <div style="text-align:center; padding: 20px;">
                <p>Não foi possível carregar os produtos.</p>
                <p style="font-size: 12px; color: red;">Erro: ${error.message}</p>
            </div>`;
    }
}

// Função auxiliar para tratar preços
function parsePrice(priceValue) {
    if (typeof priceValue === 'number') return priceValue;
    if (!priceValue) return 0;
    let stringPrice = priceValue.toString().replace('R$', '').replace(/\s/g, '').replace(',', '.');
    return parseFloat(stringPrice) || 0;
}

// Função auxiliar para verificar estoque
function getStock(product) {
    // Se a coluna Estoque não existir ou estiver vazia, assumimos que tem estoque (ou coloque 0 se preferir)
    if (product.Estoque === undefined || product.Estoque === "" || product.Estoque === null) {
        return 999; // Infinito se não preenchido
    }
    return parseInt(product.Estoque);
}

// 2. Renderiza os Cards de Produtos
function renderProducts(products) {
    const container = document.getElementById('products-container');
    container.innerHTML = "";

    if(products.length === 0) {
        container.innerHTML = "<p style='padding:20px'>Nenhum produto encontrado.</p>";
        return;
    }

    products.forEach(product => {
        const nome = product.Nome || "Produto sem nome";
        const imagem = product.Imagem || "https://via.placeholder.com/300?text=Sem+Imagem"; 
        const rawPrice = product.Preco; 
        const price = parsePrice(rawPrice);
        const stock = getStock(product);
        const isSoldOut = stock <= 0;
        
        const card = document.createElement('div');
        card.className = `product-card ${isSoldOut ? 'sold-out' : ''}`;
        
        // Se estiver esgotado, abre o modal mas com aviso, ou não faz nada? 
        // Vamos permitir abrir para ver detalhes, mas avisar.
        card.onclick = () => openProductModal(product);

        let soldOutBadge = isSoldOut ? '<div class="sold-out-badge">ESGOTADO</div>' : '';

        card.innerHTML = `
            ${soldOutBadge}
            <img src="${imagem}" alt="${nome}" onerror="this.src='https://via.placeholder.com/300?text=Erro+Imagem'">
            <div class="product-info">
                <h3 class="product-name">${nome}</h3>
                <p class="product-price">R$ ${price.toFixed(2).replace('.', ',')}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

// 3. Renderiza o Menu de Categorias
function renderCategories(products) {
    const categories = [...new Set(products.map(p => p.Categoria))].filter(c => c && c.trim() !== '');
    const list = document.getElementById('category-list');
    list.innerHTML = "";

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.innerText = cat;
        btn.className = 'cat-btn';
        btn.onclick = () => {
            filterCategory(cat);
            closeMenu();
        };
        list.appendChild(btn);
    });
}

function filterCategory(category) {
    if(category === 'all') {
        renderProducts(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.Categoria === category);
        renderProducts(filtered);
    }
    closeMenu();
}

// 4. Modal de Produto
let currentProduct = null;

function openProductModal(product) {
    currentProduct = product;
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('modal-body');
    
    const nome = product.Nome || "Produto";
    const imagem = product.Imagem || "https://via.placeholder.com/300";
    const desc = product.Descricao || "Sem descrição.";
    const price = parsePrice(product.Preco);
    const stock = getStock(product);
    const isSoldOut = stock <= 0;

    // Tratamento das variações
    let variationsHtml = '';
    if(product.Variacoes) {
        const vars = product.Variacoes.toString().split(',').map(v => v.trim());
        variationsHtml = `
            <label><strong>Opção:</strong></label>
            <select id="modal-variation" class="variation-select">
                ${vars.map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>
        `;
    } else {
         variationsHtml = `<input type="hidden" id="modal-variation" value="Único">`;
    }

    // Botões (desabilitar se esgotado)
    let buttonsHtml = '';
    if (isSoldOut) {
        buttonsHtml = `
            <div style="width:100%; background:red; color:white; padding:10px; text-align:center; border-radius:5px; margin-top:10px;">
                PRODUTO ESGOTADO
            </div>`;
    } else {
        buttonsHtml = `
        <div style="margin: 15px 0;">
            <label><strong>Quantidade:</strong></label>
            <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">
                <input type="number" id="modal-qty" value="1" min="1" max="${stock}" class="qty-input" style="width:60px; padding:8px;">
                <span style="font-size:12px; color:#666;">(Disp: ${stock})</span>
            </div>
        </div>
        <div class="modal-actions">
            <button class="action-btn secondary" onclick="addToCartAndStay()">Adicionar ao Carrinho</button>
            <button class="action-btn" onclick="buyNow()">Comprar Agora</button>
        </div>`;
    }

    body.innerHTML = `
        <img src="${imagem}" class="modal-img">
        <h2>${nome}</h2>
        <h3 style="margin: 10px 0;">R$ ${price.toFixed(2).replace('.', ',')}</h3>
        <p style="color:#666; font-size: 14px; margin-bottom: 15px;">${desc}</p>
        ${variationsHtml}
        ${buttonsHtml}
    `;
    
    modal.style.display = "block";
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = "none";
}

// 5. Lógica do Carrinho
function addToCart(isBuyNow = false) {
    const qtyInput = document.getElementById('modal-qty');
    const qty = parseInt(qtyInput.value) || 1;
    const stock = getStock(currentProduct);

    if (qty > stock) {
        alert("Quantidade indisponível em estoque!");
        return;
    }
    
    const variationSelect = document.getElementById('modal-variation');
    const variation = variationSelect ? variationSelect.value : 'Padrão';
    const price = parsePrice(currentProduct.Preco);
    const nome = currentProduct.Nome || "Item";

    const item = {
        name: nome,
        price: price,
        image: currentProduct.Imagem,
        variation: variation,
        qty: qty
    };

    const existing = cart.find(i => i.name === item.name && i.variation === item.variation);
    if(existing) {
        if(existing.qty + qty > stock) {
            alert("Você já tem a quantidade máxima deste item no carrinho.");
            return;
        }
        existing.qty += qty;
    } else {
        cart.push(item);
    }

    updateCartCount();
    closeProductModal();

    if(isBuyNow) {
        openCart();
    } else {
        const btn = document.querySelector('.cart-icon');
        btn.style.transform = "scale(1.2)";
        setTimeout(() => btn.style.transform = "scale(1)", 200);
    }
}

function addToCartAndStay() { addToCart(false); }
function buyNow() { addToCart(true); }

function updateCartCount() {
    document.getElementById('cart-count').innerText = cart.reduce((acc, item) => acc + item.qty, 0);
}

function openCart() {
    const modal = document.getElementById('cart-modal');
    renderCartItems();
    modal.style.display = "block";
    
    // Reseta visualização do checkout
    document.getElementById('checkout-btn').style.display = "none";
    document.getElementById('shipping-message').style.display = "none";
    document.getElementById('customer-form').style.display = "none";
    shippingMethod = null;
}

function closeCart() {
    document.getElementById('cart-modal').style.display = "none";
}

function renderCartItems() {
    const container = document.getElementById('cart-items');
    container.innerHTML = "";
    let total = 0;

    if(cart.length === 0) {
        container.innerHTML = "<p>Seu carrinho está vazio.</p>";
        document.getElementById('cart-total').innerText = "R$ 0,00";
        return;
    }

    cart.forEach((item, index) => {
        total += item.price * item.qty;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p style="font-size:12px; color:#666;">Var: ${item.variation}</p>
                <p>R$ ${item.price.toFixed(2).replace('.', ',')}</p>
            </div>
            <div class="cart-controls">
                <button onclick="changeQty(${index}, -1)">-</button>
                <span style="margin:0 10px;">${item.qty}</span>
                <button onclick="changeQty(${index}, 1)">+</button>
            </div>
        `;
        container.appendChild(div);
    });

    document.getElementById('cart-total').innerText = "R$ " + total.toFixed(2).replace('.', ',');
}

function changeQty(index, delta) {
    cart[index].qty += delta;
    if(cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    renderCartItems();
    updateCartCount();
}

// 6. Checkout e FormSubmit
function selectShipping(method) {
    if(cart.length === 0) return alert("Carrinho vazio!");

    shippingMethod = method;
    const msg = document.getElementById('shipping-message');
    const form = document.getElementById('customer-form');
    const btn = document.getElementById('checkout-btn');

    // Mostra formulário e botão
    form.style.display = "block";
    btn.style.display = "block";

    if(method === 'entrega') {
        msg.style.display = "block";
        msg.innerHTML = '<p>Cálculo do frete será combinado via WhatsApp.</p>';
    } else {
        msg.style.display = "block";
        msg.innerHTML = '<p>Você escolheu <strong>Retirada</strong>. Entraremos em contato para combinar horário.</p>';
    }
    
    form.scrollIntoView({ behavior: 'smooth' });
}

function submitOrder() {
    if(cart.length === 0) return alert("Carrinho vazio!");
    
    // Captura dados do formulário
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const email = document.getElementById('cust-email').value;
    const address = document.getElementById('cust-address').value;

    if(!name || !phone || !email || !address) {
        return alert("Por favor, preencha todos os dados (Nome, Telefone, E-mail e Endereço).");
    }

    // Bloqueia botão para evitar duplo clique
    const btn = document.getElementById('checkout-btn');
    btn.innerText = "Processando...";
    btn.disabled = true;

    // Prepara resumo do pedido para o E-mail
    let orderSummary = cart.map(item => 
        `- ${item.name} (${item.variation}) | Qtd: ${item.qty} | R$ ${(item.price * item.qty).toFixed(2)}`
    ).join('\n');

    let totalVal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    // Dados para o FormSubmit (AJAX)
    const formData = {
        _subject: "Novo Pedido - Audace Intimates",
        _template: "table", // Formato bonito no email
        Cliente: name,
        Telefone: phone,
        Email: email,
        Entrega: shippingMethod.toUpperCase(),
        Endereco: address,
        Total_Compra: `R$ ${totalVal.toFixed(2)}`,
        Produtos: orderSummary
    };

    // Envia para o FormSubmit
    fetch(`https://formsubmit.co/ajax/${NOTIFICATION_EMAIL}`, {
        method: "POST",
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Email enviado com sucesso", data);
        // Se deu certo, redireciona para o InfinitePay
        redirectToPayment();
    })
    .catch(error => {
        console.error("Erro ao enviar email", error);
        // Mesmo se der erro no email, tenta redirecionar para não perder a venda
        alert("Houve um erro ao notificar o pedido, mas vamos prosseguir para o pagamento.");
        redirectToPayment();
    });
}

function redirectToPayment() {
    // Monta link do InfinitePay
    const itemsStrings = cart.map(item => {
        const priceInt = Math.round(item.price * 100);
        const cleanName = (item.name + " - " + item.variation).replace(/"/g, ''); 
        return `{"name":"${cleanName}","price":${priceInt},"quantity":${item.qty}}`;
    });

    const itemsPayload = itemsStrings.join(',');
    const baseUrl = "https://checkout.infinitepay.io/audaces";
    // Link de retorno para o WhatsApp para confirmar
    const redirectUrl = "https://wa.me/5549914014398?text=Ol%C3%A1!%20Acabei%20de%20pagar%20meu%20pedido%20no%20site.";
    
    const finalLink = `${baseUrl}?items=[${itemsPayload}]&redirect_url=${redirectUrl}`;
    
    window.location.href = finalLink;
}

// Fechar modais ao clicar fora
window.onclick = function(event) {
    if (event.target.className === 'modal') {
        event.target.style.display = "none";
    }
}
