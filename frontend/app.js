// JS State
let allData      = [];
let filteredData = [];
let currentPage  = 1;
const TOTAL_PAGES    = 2;
const RECIPES_PER_PAGE = 15;

// Chart.js instances
const charts = {};

// Constant colour palette
const PALETTE = [
  '#1976D2', '#388E3C', '#F57C00', '#7B1FA2',
  '#C62828', '#00838F', '#558B2F', '#AD1457',
];


//Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  document.getElementById('searchInput').addEventListener('input',  applyFilters);
  document.getElementById('dietFilter').addEventListener('change', applyFilters);
});

// CSV Data loading
function loadData() {
  Papa.parse('../All_Diets.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete(results) {
      allData      = results.data.filter(r => r.Diet_type && r.Recipe_name);
      filteredData = [...allData];
      bootstrap();
    },
    error(err) {
      hideLoading();
      console.error('Failed to load All_Diets.csv:', err);
      showApiResult(
        '<strong>Could not load All_Diets.csv.</strong> ' +
        'Please serve the project from a local HTTP server (e.g. VS Code Live Server) ' +
        'so the browser can fetch the CSV from the parent directory.'
      );
    },
  });
}

function bootstrap() {
  populateDietFilter();
  renderAllCharts();
  hideLoading();
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

//Populate diet filter dropdown
function populateDietFilter() {
  const dietTypes = [...new Set(allData.map(r => r.Diet_type).filter(Boolean))].sort();
  const select = document.getElementById('dietFilter');
  dietTypes.forEach(diet => {
    const opt = document.createElement('option');
    opt.value       = diet;
    opt.textContent = capitalize(diet);
    select.appendChild(opt);
  });
}

// Filters
function applyFilters() {
  const search   = document.getElementById('searchInput').value.toLowerCase().trim();
  const dietVal  = document.getElementById('dietFilter').value;

  filteredData = allData.filter(r => {
    const matchDiet   = dietVal === 'all' || r.Diet_type === dietVal;
    const matchSearch = !search
      || (r.Diet_type   && r.Diet_type.toLowerCase().includes(search))
      || (r.Recipe_name && r.Recipe_name.toLowerCase().includes(search));
    return matchDiet && matchSearch;
  });

  renderAllCharts();
  clearApiResult();
}

// Render all charts
function renderAllCharts() {
  renderBarChart();
  renderScatterChart();
  renderHeatmapChart();
  renderPieChart();
}

//average macro stats by diet
function getAvgMacrosByDiet(data) {
  const grouped = {};
  data.forEach(r => {
    if (!r.Diet_type) return;
    if (!grouped[r.Diet_type]) grouped[r.Diet_type] = { p: [], c: [], f: [] };
    if (r['Protein(g)'] != null) grouped[r.Diet_type].p.push(r['Protein(g)']);
    if (r['Carbs(g)']  != null) grouped[r.Diet_type].c.push(r['Carbs(g)']);
    if (r['Fat(g)']    != null) grouped[r.Diet_type].f.push(r['Fat(g)']);
  });

  const result = {};
  Object.entries(grouped).forEach(([diet, g]) => {
    result[diet] = {
      protein: avg(g.p),
      carbs:   avg(g.c),
      fat:     avg(g.f),
    };
  });
  return result;
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// Helper function for the pearson correlation for the heatmap chart
function pearsonCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = avg(x.slice(0, n));
  const my = avg(y.slice(0, n));
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const ex = x[i] - mx;
    const ey = y[i] - my;
    num += ex * ey;
    dx  += ex * ex;
    dy  += ey * ey;
  }
  const denom = Math.sqrt(dx) * Math.sqrt(dy);
  return denom === 0 ? 0 : num / denom;
}

// Bar Chart
function renderBarChart() {
  const macros = getAvgMacrosByDiet(filteredData);
  const labels = Object.keys(macros);

  destroyChart('bar');
  charts.bar = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Protein (g)', data: labels.map(d => +macros[d].protein.toFixed(1)), backgroundColor: 'rgba(25, 118, 210, 0.75)' },
        { label: 'Carbs (g)',   data: labels.map(d => +macros[d].carbs.toFixed(1)),   backgroundColor: 'rgba(255, 152, 0,  0.75)' },
        { label: 'Fat (g)',     data: labels.map(d => +macros[d].fat.toFixed(1)),     backgroundColor: 'rgba(229, 57, 53,  0.75)' },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 9 }, boxWidth: 10 } } },
      scales: {
        x: { ticks: { font: { size: 8 } } },
        y: { ticks: { font: { size: 8 } } },
      },
    },
  });
}

// Scatter plot chart
function renderScatterChart() {
  // Stratified sample: up to 40 points per diet type (max ~280 total)
  const grouped = {};
  filteredData.forEach(r => {
    if (!r.Diet_type) return;
    if (!grouped[r.Diet_type]) grouped[r.Diet_type] = [];
    grouped[r.Diet_type].push(r);
  });

  const datasets = Object.entries(grouped).map(([diet, rows], i) => ({
    label: capitalize(diet),
    data: rows.slice(0, 40)
      .filter(r => r['Protein(g)'] != null && r['Carbs(g)'] != null)
      .map(r => ({ x: r['Protein(g)'], y: r['Carbs(g)'] })),
    backgroundColor: PALETTE[i % PALETTE.length] + 'AA',
    pointRadius: 3,
  }));

  destroyChart('scatter');
  charts.scatter = new Chart(document.getElementById('scatterChart'), {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 9 }, boxWidth: 10 } } },
      scales: {
        x: { title: { display: true, text: 'Protein (g)', font: { size: 8 } }, ticks: { font: { size: 8 } } },
        y: { title: { display: true, text: 'Carbs (g)',   font: { size: 8 } }, ticks: { font: { size: 8 } } },
      },
    },
  });
}

// heatmap chart, I hated this part of the code
function renderHeatmapChart() {
  const valid = filteredData.filter(r =>
    r['Protein(g)'] != null && r['Carbs(g)'] != null && r['Fat(g)'] != null
  );

  const pArr = valid.map(r => r['Protein(g)']);
  const cArr = valid.map(r => r['Carbs(g)']);
  const fArr = valid.map(r => r['Fat(g)']);

  const keys    = ['Protein', 'Carbs', 'Fat'];
  const vectors = [pArr, cArr, fArr];

  // Build 3×3 correlation matrix
  const corrMatrix = vectors.map(a => vectors.map(b => pearsonCorrelation(a, b)));

  // Flatten into { x, y, v } for matrix chart
  const data = [];
  keys.forEach((_, xi) => {
    keys.forEach((__, yi) => {
      data.push({ x: xi, y: yi, v: corrMatrix[xi][yi] });
    });
  });

  // Colour: blue for positive, red for negative
  function heatColour(v) {
    const abs = Math.abs(v);
    if (v >= 0) return `rgba(25, 118, 210, ${0.15 + abs * 0.85})`;
    return `rgba(229, 57, 53, ${0.15 + abs * 0.85})`;
  }

  destroyChart('heatmap');
  charts.heatmap = new Chart(document.getElementById('heatmapChart'), {
    type: 'matrix',
    data: {
      datasets: [{
        label: 'Correlation',
        data,
        backgroundColor: ctx => heatColour(ctx.dataset.data[ctx.dataIndex]?.v ?? 0),
        borderColor: '#fff',
        borderWidth: 2,
        width:  ({ chart }) => ((chart.chartArea?.width  || 120) / keys.length) - 2,
        height: ({ chart }) => ((chart.chartArea?.height || 120) / keys.length) - 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: () => '',
            label: ctx => {
              const d = ctx.dataset.data[ctx.dataIndex];
              return `${keys[d.x]} vs ${keys[d.y]}: ${d.v.toFixed(3)}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          offset: true,
          min: -0.5,
          max: keys.length - 0.5,
          ticks: { stepSize: 1, callback: v => keys[v] ?? '', font: { size: 9 } },
          grid: { display: false },
        },
        y: {
          type: 'linear',
          offset: true,
          min: -0.5,
          max: keys.length - 0.5,
          ticks: { stepSize: 1, callback: v => keys[v] ?? '', font: { size: 9 } },
          grid: { display: false },
        },
      },
    },
  });
}

// pie chart thing
function renderPieChart() {
  const counts = {};
  filteredData.forEach(r => {
    if (!r.Diet_type) return;
    counts[r.Diet_type] = (counts[r.Diet_type] || 0) + 1;
  });

  const labels = Object.keys(counts);
  const data   = labels.map(d => counts[d]);

  destroyChart('pie');
  charts.pie = new Chart(document.getElementById('pieChart'), {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data, backgroundColor: PALETTE.slice(0, labels.length) }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 9 }, boxWidth: 10 } } },
    },
  });
}

// Chart Lifecycle helper
function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

// API buttons
function getNutritionalInsights() {
  const macros = getAvgMacrosByDiet(filteredData);
  if (!Object.keys(macros).length) { showApiResult('No data matches the current filter.'); return; }

  const rows = Object.entries(macros)
    .map(([diet, m]) =>
      `<span class="result-row"><b>${capitalize(diet)}</b>: Protein&nbsp;${m.protein.toFixed(1)}g &nbsp;|&nbsp; Carbs&nbsp;${m.carbs.toFixed(1)}g &nbsp;|&nbsp; Fat&nbsp;${m.fat.toFixed(1)}g</span>`
    ).join('');

  showApiResult(`<strong>Nutritional Insights (${Object.keys(macros).length} diet types)</strong>${rows}`);
}

function getRecipes() {
  const start  = (currentPage - 1) * RECIPES_PER_PAGE;
  const slice  = filteredData.slice(start, start + RECIPES_PER_PAGE);
  if (!slice.length) { showApiResult('No recipes found for the current filter / page.'); return; }

  const rows = slice
    .map(r => `<span class="result-row">${r.Recipe_name} <em>(${capitalize(r.Diet_type)})</em></span>`)
    .join('');

  showApiResult(`<strong>Recipes – Page ${currentPage} (showing ${slice.length} of ${filteredData.length})</strong>${rows}`);
}

function getClusters() {
  const clusters = {};
  filteredData.forEach(r => {
    if (!r.Diet_type) return;
    if (!clusters[r.Diet_type]) clusters[r.Diet_type] = 0;
    clusters[r.Diet_type]++;
  });

  if (!Object.keys(clusters).length) { showApiResult('No data matches the current filter.'); return; }

  const rows = Object.entries(clusters)
    .sort((a, b) => b[1] - a[1])
    .map(([diet, n]) => `<span class="result-row"><b>${capitalize(diet)}</b>: ${n} recipe${n !== 1 ? 's' : ''}</span>`)
    .join('');

  showApiResult(`<strong>Clusters by Diet Type (${filteredData.length} total recipes)</strong>${rows}`);
}

function showApiResult(html) {
  const el = document.getElementById('apiResult');
  el.innerHTML = html;
  el.classList.add('visible');
}

function clearApiResult() {
  const el = document.getElementById('apiResult');
  el.innerHTML = '';
  el.classList.remove('visible');
}

// OAuth login handlers
function startAzureLogin(provider) {
  showApiResult(`<strong>${provider} OAuth:</strong> Redirecting to ${provider} login...`);
  window.location.href = `/.auth/login/${provider.toLowerCase()}?post_login_redirect_url=/`;
}

document.getElementById('loginGoogle')?.addEventListener('click', () => {
  startAzureLogin('Google');
});

document.getElementById('loginGithub')?.addEventListener('click', () => {
  startAzureLogin('GitHub');
});

// 2FA verification handler
document.getElementById('verify2faBtn')?.addEventListener('click', () => {
  const code = document.getElementById('twofaInput').value.trim();

  if (!code) {
    showApiResult('Please enter a 2FA code before verifying.');
    return;
  }

  showApiResult(`<strong>2FA Verified:</strong> Code <em>${code}</em> accepted (simulated).`);
});

// Cloud resource cleanup handler
document.getElementById('cleanupBtn')?.addEventListener('click', () => {
  showApiResult('<strong>Cleanup started:</strong> Releasing unused cloud resources (simulated)...');

  setTimeout(() => {
    showApiResult('<strong>Cleanup complete:</strong> All unused resources have been removed (simulated).');
  }, 1500);
});

// Pagination - I dont know how this would work in the context of the project
function changePage(delta) {
  goToPage(currentPage + delta);
}

function goToPage(page) {
  if (page < 1 || page > TOTAL_PAGES) return;
  currentPage = page;

  for (let i = 1; i <= TOTAL_PAGES; i++) {
    const btn = document.getElementById(`pageBtn${i}`);
    if (btn) btn.classList.toggle('active', i === currentPage);
  }
  document.getElementById('prevBtn').disabled = currentPage === 1;
  document.getElementById('nextBtn').disabled = currentPage === TOTAL_PAGES;
}

// Misc helper functions
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
