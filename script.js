// URL do seu Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbwmFW5JzBj_E1B5XeF3Cns2VPXCknFfUqKD9LUyW68-xkOsd2B2ypKInGLGOGmeZdoMsg/exec";

// URL base do InfinitePay
const INFINITE_BASE = "https://checkout.infinitepay.io/audaces?items=";
const STORE_URL = "https://audaceintimates.github.io/store/";

// Email do FormSubmit
const FORMSUBMIT_URL = "https://formsubmit.co/ajax/useaudaceintimates@gmail.com";

let allProducts = [];
let cart = [];
let currentProduct = null;
let currentImgIndex = 0;

// Elementos do DOM
const productsGrid = document.getElementById('products-grid');
const searchInput = document.getElementById('search-input');
const cartCount = document.getElementById('cart-count');
const sideMenu = document.getElementById('side-menu');
const categoryList = document.getElementById('category-list');
const overlay = document.getElementById('menu-overlay');

// 1. Inicialização e Busca de Dados
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    setupEventListeners();
});

async function fetchProducts() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        // Assume que a API retorna um array de objetos. 
        // Vamos normalizar os dados para garantir que as chaves funcionem
        allProducts = data.map(item => normalizeProduct(item));
        renderProducts(allProducts);
        renderCategories(allProducts);
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        productsGrid.innerHTML = '<p style="padding:20px; text-align:center;">Erro ao carregar produtos. Tente recarregar a página.</p>';
    }
}

// Normaliza as chaves da planilha (remove acentos, deixa minúsculo) para facilitar
function normalizeProduct(item) {
    // Função auxiliar para pegar valor independente se a chave é "Preço", "preço" ou "Preco"
    const getVal = (keys) => {
        for (let k of keys) {
            if (item[k] !== undefined) return item[k];
        }
        return "";
    };

    return {
        id: Math.random().toString(36).substr(2, 9), // ID temporário
        nome: getVal(["Nome", "nome", "NOME"]),
        categoria: getVal(["Categoria", "categoria"]),
        preco: getVal(["Preço", "Preco", "preco", "price"]),
        imagem: getVal(["Imagem", "imagem"]),
        descricao: getVal(["Descrição", "Descricao", "descricao"]),
        variacoes: getVal(["Variações", "Variacoes", "variacoes"]),
        estoque: parseInt(getVal(["Estoque", "estoque"])) || 0
    };
}

// 2. Renderização
function renderProducts(products) {
    productsGrid.innerHTML = "";
    products.forEach(prod => {
        const card = document.createElement('div');
        card.className = 'product-card';
        if (prod.estoque === 0) card.classList.add('sold-out');

        // Primeira imagem da lista
        const mainImg = prod.imagem.split(',')[0].trim();

        // Formatação do Preço
        const priceDisplay = formatCurrency(prod.preco);

        let soldOutHtml = prod.estoque === 0 ? 
            `<div class="sold-out-overlay"><div class="sold-out-text">ESGOTADO</div></div>` : '';

        card.innerHTML = `
            <div class="card-img-container">
                <img src="${mainImg}" alt="${prod.nome}">
                ${soldOutHtml}
            </div>
            <div class="product-info">
                <div class="product-name">${prod.nome}</div>
                <div class="product-price">${priceDisplay}</div>
            </div>
        `;

        card.addEventListener('click', () => openProductModal(prod));
        productsGrid.appendChild(card);
    });
}

function renderCategories(products) {
    const categories = [...new Set(products.map(p => p.categoria).filter(c => c))];
    categoryList.innerHTML = '<li onclick="filterCategory(\'all\')">Todas</li>';
    categories.forEach(cat => {
        const li = document.createElement('li');
        li.textContent = cat;
        li.onclick = () => filterCategory(cat);
        categoryList.appendChild(li);
    });
}

// 3. Filtros e Pesquisa
function filterCategory(cat) {
    closeMenu();
    if (cat === 'all') {
        renderProducts(allProducts);
    } else {
        renderProducts(allProducts.filter(p => p.categoria === cat));
    }
}

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p => p.nome.toLowerCase().includes(term));
    renderProducts(filtered);
});

// 4. Modal de Produto
const modal = document.getElementById('product-modal');
const modalImg = document.getElementById('modal-img');
const modalTitle = document.getElementById('modal-title');
const modalPrice = document.getElementById('modal-price');
const modalDesc = document.getElementById('modal-desc');
const modalVar = document.getElementById('modal-variation');
const modalQty = document.getElementById('modal-qty');
const btnAddCart = document.getElementById('add-to-cart-btn');
const btnBuyNow = document.getElementById('buy-now-btn');
const soldOutMsg = document.getElementById('sold-out-msg');
const stockDisplay = document.getElementById('stock-display');

function openProductModal(prod) {
    currentProduct = prod;
    currentImgIndex = 0;
    
    // Imagens
    const images = prod.imagem.split(',').map(s => s.trim());
    modalImg.src = images[0];
    
    // Navegação Imagens
    document.querySelector('.prev-btn').onclick = () => {
        currentImgIndex = (currentImgIndex - 1 + images.length) % images.length;
        modalImg.src = images[currentImgIndex];
    };
    document.querySelector('.next-btn').onclick = () => {
        currentImgIndex = (currentImgIndex + 1) % images.length;
        modalImg.src = images[currentImgIndex];
    };

    modalTitle.textContent = prod.nome;
    modalPrice.textContent = formatCurrency(prod.preco);
    modalDesc.textContent = prod.descricao;
    stockDisplay.textContent = `Estoque: ${prod.estoque}`;

    // Variações
    modalVar.innerHTML = "";
    if (prod.variacoes) {
        prod.variacoes.split(',').forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.trim();
            opt.textContent = v.trim();
            modalVar.appendChild(opt);
        });
    }

    // Lógica de Estoque
    if (prod.estoque === 0) {
        btnAddCart.style.display = 'none';
        btnBuyNow.style.display = 'none';
        soldOutMsg.style.display = 'block';
    } else {
        btnAddCart.style.display = 'block';
        btnBuyNow.style.display = 'block';
        soldOutMsg.style.display = 'none';
        modalQty.max = prod.estoque;
        modalQty.value = 1;
    }

    modal.classList.remove('hidden');
}

// Ações do Modal
btnAddCart.onclick = () => {
    addToCart(currentProduct, modalVar.value, parseInt(modalQty.value));
    modal.classList.add('hidden');
    openCart();
};

btnBuyNow.onclick = () => {
    cart = []; // Limpa carrinho anterior se for "Comprar Agora"
    addToCart(currentProduct, modalVar.value, parseInt(modalQty.value));
    modal.classList.add('hidden');
    openCart();
    document.getElementById('finalize-cart-btn').click(); // Vai direto pro checkout
};

// 5. Carrinho
function addToCart(prod, variation, qty) {
    const existing = cart.find(item => item.id === prod.id && item.variation === variation);
    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({
            id: prod.id,
            name: prod.nome,
            priceRaw: prod.preco,
            priceInt: parsePriceToInt(prod.preco),
            variation: variation,
            qty: qty,
            img: prod.imagem.split(',')[0]
        });
    }
    updateCartUI();
}

function updateCartUI() {
    cartCount.textContent = cart.reduce((acc, item) => acc + item.qty, 0);
    const cartList = document.getElementById('cart-items');
    cartList.innerHTML = "";
    
    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = (item.priceInt / 100) * item.qty;
        total += itemTotal;

        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div>
                <strong>${item.name}</strong> (${item.variation})<br>
                Qtd: <button onclick="changeQty(${index}, -1)">-</button> 
                ${item.qty} 
                <button onclick="changeQty(${index}, 1)">+</button>
            </div>
            <div>
                R$ ${itemTotal.toFixed(2).replace('.', ',')}
                <i class="fas fa-trash remove-item" onclick="removeItem(${index})"></i>
            </div>
        `;
        cartList.appendChild(div);
    });

    document.getElementById('cart-total').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function changeQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    updateCartUI();
}
function removeItem(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// 6. Checkout e Pagamento
const cartModal = document.getElementById('cart-modal');
const finalizeBtn = document.getElementById('finalize-cart-btn');
const checkoutFormContainer = document.getElementById('checkout-form-container');
const submitOrderBtn = document.getElementById('submit-order-btn');
const initialCartActions = document.getElementById('initial-cart-actions');
const deliveryInput = document.getElementById('delivery-method');
const freightWarning = document.getElementById('freight-warning');

finalizeBtn.onclick = () => {
    if (cart.length === 0) return alert("Seu carrinho está vazio!");
    initialCartActions.classList.add('hidden');
    checkoutFormContainer.classList.remove('hidden');
};

// Seleção de Entrega/Retirada
document.querySelectorAll('.delivery-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.delivery-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const type = btn.getAttribute('data-type');
        deliveryInput.value = type;
        
        if (type === 'entrega') {
            freightWarning.classList.remove('hidden');
        } else {
            freightWarning.classList.add('hidden');
        }
        submitOrderBtn.classList.remove('hidden');
    });
});

// Envio do Formulário + Redirecionamento
document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('customer-name').value;
    const email = document.getElementById('customer-email').value;
    const deliveryMethod = deliveryInput.value;

    submitOrderBtn.textContent = "Processando...";
    submitOrderBtn.disabled = true;

    // 1. Preparar Descrição do Pedido para o Email
    const orderDetails = cart.map(i => `${i.qty}x ${i.name} (${i.variation})`).join('\n');
    const totalVal = document.getElementById('cart-total').textContent;
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('_subject', `Novo Pedido: ${name}`);
    formData.append('message', `Cliente: ${name}\nEntrega: ${deliveryMethod}\nTotal: ${totalVal}\n\nItens:\n${orderDetails}`);
    formData.append('_captcha', 'false'); // Desativar captcha do formsubmit se configurado

    try {
        // 2. Enviar email via FormSubmit (AJAX)
        await fetch(FORMSUBMIT_URL, {
            method: 'POST',
            body: formData
        });

        // 3. Gerar Link InfinitePay SEM encoding nos caracteres especiais JSON
        // O formato exigido é estrito: items=[{"name":"X","price":100,"quantity":1},...]
        
        let jsonItems = cart.map(item => {
            return `{"name":"${item.name} - ${item.variation}","price":${item.priceInt},"quantity":${item.qty}}`;
        }).join(',');

        // Construção manual da string para evitar encodeURIComponent nos colchetes e chaves
        const finalUrl = `${INFINITE_BASE}[${jsonItems}]&redirect_url=${STORE_URL}`;

        console.log("Redirecionando para:", finalUrl);
        window.location.href = finalUrl;

    } catch (err) {
        alert("Houve um erro ao processar o pedido. Tente novamente.");
        submitOrderBtn.textContent = "Tentar Novamente";
        submitOrderBtn.disabled = false;
        console.error(err);
    }
});

// Funções Utilitárias
function formatCurrency(val) {
    // Se val for "79,00" ou 79.00, retorna "R$ 79,00"
    if (typeof val === 'number') return `R$ ${val.toFixed(2).replace('.', ',')}`;
    return `R$ ${val}`;
}

function parsePriceToInt(val) {
    // Converte "79,00" ou "R$ 79,00" para 7900 (inteiro)
    if (typeof val === 'number') return Math.round(val * 100);
    
    let clean = val.toString().replace('R$', '').trim();
    if (clean.includes(',')) {
        clean = clean.replace('.', '').replace(',', '.'); // Troca vírgula decimal por ponto
    }
    return Math.round(parseFloat(clean) * 100);
}

function setupEventListeners() {
    // Menu
    document.getElementById('menu-btn').onclick = () => {
        sideMenu.classList.add('open');
        overlay.classList.add('active');
    };
    document.getElementById('close-menu').onclick = closeMenu;
    overlay.onclick = () => {
        closeMenu();
        modal.classList.add('hidden');
        cartModal.classList.add('hidden');
    };

    // Carrinho
    document.getElementById('cart-btn').onclick = openCart;
    document.getElementById('close-cart-modal').onclick = () => cartModal.classList.add('hidden');

    // Fechar Modal Produto
    document.getElementById('close-product-modal').onclick = () => modal.classList.add('hidden');
}

function closeMenu() {
    sideMenu.classList.remove('open');
    overlay.classList.remove('active');
}
function openCart() {
    cartModal.classList.remove('hidden');
}
