function loadCategorias() {
    const container = document.getElementById('tab-categorias');
    if (!container) return;

    // Ajuste: Só aborta a função se o grid já existir E estiver preenchido com as categorias
    if (document.getElementById('categorias-grid') && document.getElementById('categorias-grid').children.length > 0) {
        return; 
    }

    container.innerHTML = `
        <div id="categorias-main">
            <h2>Categorias</h2>
            <div id="categorias-grid" class="grid-container" style="display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); margin-top: 20px;"></div>
        </div>
        <div id="categoria-produtos" class="hidden">
            <button onclick="voltarCategorias()" class="btn mb-2" style="margin-bottom: 20px;">&larr; Voltar às Categorias</button>
            <h2 id="categoria-titulo"></h2>
            <div id="categoria-produtos-grid" class="grid-container"></div>
        </div>
    `;

    const grid = document.getElementById('categorias-grid');
    
    // Ajuste: Forçamos a conversão para String. Isso evita que a página quebre caso a categoria na planilha seja um número inteiro.
    const categories = [...new Set(globalProducts.map(p => String(p.category || '')).filter(c => c.trim() !== ''))];

    if (categories.length === 0) {
        grid.innerHTML = '<p>Nenhuma categoria encontrada.</p>';
        return;
    }

    categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'category-card card';
        div.style.cursor = 'pointer';
        div.style.padding = '20px';
        div.style.textAlign = 'center';
        div.style.border = '1px solid var(--border)';
        div.style.borderRadius = '8px';
        div.onclick = () => showCategoryProducts(cat);
        div.innerHTML = `<h3>${cat}</h3>`;
        grid.appendChild(div);
    });
}

function showCategoryProducts(category) {
    document.getElementById('categorias-main').classList.add('hidden');
    const prodContainer = document.getElementById('categoria-produtos');
    prodContainer.classList.remove('hidden');
    document.getElementById('categoria-titulo').innerText = category;

    const grid = document.getElementById('categoria-produtos-grid');
    grid.innerHTML = '';

    // Ajuste: Forçamos p.category para String na hora de filtrar, para garantir que as variáveis combinem perfeitamente
    const filtered = globalProducts.filter(p => String(p.category || '') === category);
    
    if (filtered.length === 0) {
        grid.innerHTML = '<p>Nenhum produto nesta categoria.</p>';
        return;
    }

    filtered.forEach(prod => {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.onclick = () => openProductPage(prod);
        
        const imgSrc = (prod.img && prod.img.length > 0 && prod.img[0] !== '') ? prod.img[0] : '';
        
        div.innerHTML = `
            <img src="${imgSrc}" alt="${prod.productname}">
            <h3>${prod.productname}</h3>
            <p class="price">R$ ${parseFloat(prod.price || 0).toFixed(2)}</p>
        `;
        grid.appendChild(div);
    });
}

function voltarCategorias() {
    document.getElementById('categorias-main').classList.remove('hidden');
    document.getElementById('categoria-produtos').classList.add('hidden');
}
