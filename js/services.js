document.addEventListener("DOMContentLoaded", async () => {
  const serviceSection = document.querySelectorAll(".services-section")[1];
  if (!serviceSection) return;

  const container = serviceSection.querySelector(".container");
  if (!container) return;

  // Clear existing content
  container.innerHTML = `
    <div class="heading-block" style="margin-bottom: 30px; text-align: center;">
      <div class="pill-button is-service">[ Action Guide ]</div>
      <h2 class="section-heading is-service">Searchable Resource Directory</h2>
    </div>
    
    <div class="filter-container" style="display: flex; gap: 10px; margin-bottom: 30px; justify-content: center; flex-wrap: wrap;">
      <!-- Filters will go here -->
    </div>

    <div class="services-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
      <!-- Cards will go here -->
    </div>
  `;

  const filterContainer = container.querySelector(".filter-container");
  const gridContainer = container.querySelector(".services-grid");

  try {
    const res = await fetch("data/routes.json");
    if (!res.ok) throw new Error("Failed to load routes");
    const routes = await res.json();

    // Extract categories (departments)
    const departments = new Set();
    routes.forEach(route => {
      if (route.department) {
        const dept = route.department.split("—")[0].split("/")[0].trim();
        if (dept) departments.add(dept);
      }
    });

    const cats = ["All", ...Array.from(departments)];
    let activeCategory = "All";

    const renderFilters = () => {
      filterContainer.innerHTML = cats.map(cat => `
        <button class="filter-btn ${cat === activeCategory ? 'active' : ''}" data-cat="${cat}" style="
          padding: 8px 16px; 
          border-radius: 20px; 
          border: 1px solid #ddd; 
          background: ${cat === activeCategory ? '#0b1b36' : '#fff'};
          color: ${cat === activeCategory ? '#fff' : '#333'};
          cursor: pointer;
          transition: 0.3s;
          font-family: inherit;
        ">${cat}</button>
      `).join('');
      
      filterContainer.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          activeCategory = e.target.getAttribute("data-cat");
          renderFilters();
          renderCards();
        });
      });
    };

    const renderCards = () => {
      const filtered = routes.filter(r => {
        if (activeCategory === "All") return true;
        const dept = (r.department || "").split("—")[0].split("/")[0].trim();
        return dept === activeCategory;
      });

      gridContainer.innerHTML = filtered.map(r => `
        <div class="service-card" style="
          border: 1px solid #eaeaea; 
          border-radius: 12px; 
          padding: 20px; 
          background: #fff;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: transform 0.2s;
        " onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
          <h3 style="margin: 0; font-size: 1.2rem; color: #222;">${r.authority_name}</h3>
          <p style="margin: 0; font-size: 0.9rem; color: #666; flex-grow: 1;">
            <strong>Portal:</strong> <a href="${r.portal_url}" target="_blank" style="color: #007BFF; text-decoration: none;">${r.portal_name}</a><br/>
            <strong>Helpline:</strong> ${r.helpline || 'N/A'}<br/>
            <strong>Department:</strong> ${r.department}
          </p>
          <a href="${r.portal_url}" target="_blank" class="button is-secondary" style="
            display: inline-block; 
            text-align: center; 
            padding: 10px; 
            background: #f8f9fa; 
            color: #333; 
            border-radius: 6px; 
            text-decoration: none;
            font-weight: 500;
            border: 1px solid #ccc;
            transition: background 0.3s;
          " onmouseover="this.style.background='#e2e6ea'" onmouseout="this.style.background='#f8f9fa'">Visit Portal</a>
        </div>
      `).join('');
    };

    renderFilters();
    renderCards();

  } catch (err) {
    console.error(err);
    gridContainer.innerHTML = `<p style="color: red;">Failed to load services directory.</p>`;
  }
});
