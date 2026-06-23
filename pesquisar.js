function loadPesquisar() {
    const container = document.getElementById('tab-pesquisar');
    if (!container) return;

    if (document.getElementById('search-input')) {
        return;
    }

    container.innerHTML = `
        <h2>Pesquisar Produtos</h2>
        <div class="search-container" style="position: relative; margin-bottom: 30px; margin-top: 20px;">
            <input type="text" id="search-input" placeholder="Digite o nome do produto..." style="width: 100%; padding: 15px; font-size: 16px; border: 1px solid var(--border); border-radius: 8px;" oninput="handleSearch()">
            <div id="search-suggestions" style="position: absolute; width: 100%; background: var(--bg-color, #fff); border: 1px solid var(--border, #ccc); border-radius: 0 0 8px 8px; max-height: 250px; overflow-y: auto; z-index: 10; display: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></div>
        </div>
        <div id="search-results" class="grid-container"></div>
    `;
}

function handleSearch() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const suggestionsBox = document.getElementById('search-suggestions');
    const resultsGrid = document.getElementById('search-results');
    
    if (query.length === 0) {
        suggestionsBox.style.display = 'none';
        resultsGrid.innerHTML = '';
        return;
    }

    const matches = globalProducts.filter(p => p.productname && p.productname.toLowerCase().includes(query));

    suggestionsBox.innerHTML = '';
    if (matches.length > 0) {
        suggestionsBox.style.display = 'block';
        matches.forEach(prod => {
            const div = document.createElement('div');
            div.style.padding = '12px 15px';
            div.style.cursor = 'pointer';
            div.style.borderBottom = '1px solid var(--border, #eee)';
            div.style.opacity = '0.6';
            div.style.transition = 'opacity 0.2s';
            
            div.onmouseover = () => div.style.opacity = '1';
            div.onmouseout = () => div.style.opacity = '0.6';
            
            div.innerText = prod.productname;
            div.onclick = () => {
                document.getElementById('search-input').value = prod.productname;
                suggestionsBox.style.display = 'none';
                openProductPage(prod);
            };
            suggestionsBox.appendChild(div);
        });
    } else {
        suggestionsBox.style.display = 'none';
    }

    resultsGrid.innerHTML = '';
    matches.forEach(prod => {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.onclick = () => openProductPage(prod);
        
        const imgSrc = (prod.img && prod.img.length > 0 && prod.img[0] !== '') ? prod.img[0] : '';
        
        div.innerHTML = `
            <img src="${imgSrc}" alt="${prod.productname}">
            <h3>${prod.productname}</h3>
            <p class="price">R$ ${parseFloat(prod.price || 0).toFixed(2)}</p>
        `;
        resultsGrid.appendChild(div);
    });
}
