// Variáveis para o controle do carrossel no modal
let modalImages = [];
let currentImageIndex = 0;

// 2. Renderiza os Cards de Produtos (Ajustado para pegar a primeira imagem da lista)
function renderProducts(products) {
    const container = document.getElementById('products-container');
    container.innerHTML = "";

    if(products.length === 0) {
        container.innerHTML = "<p style='padding:20px'>Nenhum produto encontrado.</p>";
        return;
    }

    products.forEach(product => {
        const nome = product.Nome || "Produto sem nome";
        
        // Pega apenas a primeira imagem para o card
        const todasImagens = (product.Imagem || "").split(',').map(img => img.trim());
        const imagemCapa = todasImagens[0] || "https://via.placeholder.com/300?text=Sem+Imagem"; 
        
        const price = parsePrice(product.Preco);
        const stock = getStock(product);
        const isSoldOut = stock <= 0;
        
        const card = document.createElement('div');
        card.className = `product-card ${isSoldOut ? 'sold-out' : ''}`;
        card.onclick = () => openProductModal(product);

        let soldOutBadge = isSoldOut ? '<div class="sold-out-badge">ESGOTADO</div>' : '';

        card.innerHTML = `
            ${soldOutBadge}
            <img src="${imagemCapa}" alt="${nome}" onerror="this.src='https://via.placeholder.com/300?text=Erro+Imagem'">
            <div class="product-info">
                <h3 class="product-name">${nome}</h3>
                <p class="product-price">R$ ${price.toFixed(2).replace('.', ',')}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

// 4. Modal de Produto (Ajustado para Carrossel)
function openProductModal(product) {
    currentProduct = product;
    // Prepara a lista de imagens
    modalImages = (product.Imagem || "").split(',').map(img => img.trim()).filter(img => img !== "");
    if (modalImages.length === 0) modalImages = ["https://via.placeholder.com/300"];
    currentImageIndex = 0;

    const modal = document.getElementById('product-modal');
    const body = document.getElementById('modal-body');
    
    const nome = product.Nome || "Produto";
    const desc = product.Descricao || "Sem descrição.";
    const price = parsePrice(product.Preco);
    const stock = getStock(product);
    const isSoldOut = stock <= 0;

    // HTML das variações e botões (mantido igual ao seu)
    let variationsHtml = product.Variacoes 
        ? `<label><strong>Opção:</strong></label><select id="modal-variation" class="variation-select">${product.Variacoes.toString().split(',').map(v => `<option value="${v.trim()}">${v.trim()}</option>`).join('')}</select>`
        : `<input type="hidden" id="modal-variation" value="Único">`;

    let buttonsHtml = isSoldOut 
        ? `<div class="sold-out-msg">PRODUTO ESGOTADO</div>`
        : `<div style="margin: 15px 0;"><label><strong>Quantidade:</strong></label><div style="display:flex; align-items:center; gap:10px; margin-top:5px;"><input type="number" id="modal-qty" value="1" min="1" max="${stock}" class="qty-input"><span style="font-size:12px; color:#666;">(Disp: ${stock})</span></div></div><div class="modal-actions"><button class="action-btn secondary" onclick="addToCartAndStay()">Adicionar ao Carrinho</button><button class="action-btn" onclick="buyNow()">Comprar Agora</button></div>`;

    // Estrutura do Carrossel
    let carouselHtml = `
        <div class="carousel-container">
            <img src="${modalImages[0]}" id="main-modal-img" class="modal-img">
            ${modalImages.length > 1 ? `
                <button class="carousel-prev" onclick="changeModalImage(-1)">&#10094;</button>
                <button class="carousel-next" onclick="changeModalImage(1)">&#10095;</button>
                <div class="carousel-dots" id="carousel-dots">
                    ${modalImages.map((_, i) => `<span class="dot ${i===0?'active':''}" onclick="setModalImage(${i})"></span>`).join('')}
                </div>
            ` : ''}
        </div>
    `;

    body.innerHTML = `
        ${carouselHtml}
        <h2>${nome}</h2>
        <h3 style="margin: 10px 0;">R$ ${price.toFixed(2).replace('.', ',')}</h3>
        <p style="color:#666; font-size: 14px; margin-bottom: 15px;">${desc}</p>
        ${variationsHtml}
        ${buttonsHtml}
    `;
    
    modal.style.display = "block";
}

// Funções de controle do carrossel
function changeModalImage(step) {
    currentImageIndex += step;
    if (currentImageIndex >= modalImages.length) currentImageIndex = 0;
    if (currentImageIndex < 0) currentImageIndex = modalImages.length - 1;
    updateModalImage();
}

function setModalImage(index) {
    currentImageIndex = index;
    updateModalImage();
}

function updateModalImage() {
    const imgElement = document.getElementById('main-modal-img');
    imgElement.src = modalImages[currentImageIndex];
    
    // Atualiza as bolinhas (dots)
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentImageIndex);
    });
}
