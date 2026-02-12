import './TireMarquee.css';

const TIRE_BRANDS = [
  {
    name: 'Michelin',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Michelin_logo.svg',
  },
  {
    name: 'Goodyear',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Goodyear_logo.svg/1200px-Goodyear_logo.svg.png',
  },
  {
    name: 'Pirelli',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Pirelli_logo.svg',
  },
  {
    name: 'Continental',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Continental_AG_2014_logo.svg',
  },
  {
    name: 'Bridgestone',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Bridgestone_logo.svg',
  },
  {
    name: 'Yokohama',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Yokohama_Rubber_Company_logo.svg',
  },
  {
    name: 'Dunlop',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Dunlop_Tires_logo.svg/1024px-Dunlop_Tires_logo.svg.png',
  },
  {
    name: 'Firestone',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Firestone_Tire_%26_Rubber_Company_logo.svg/1280px-Firestone_Tire_%26_Rubber_Company_logo.svg.png',
  },
  {
    name: 'Hankook',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Hankook_Tire_logo.svg/1200px-Hankook_Tire_logo.svg.png',
  },
  {
    name: 'Cooper',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Cooper_Tire_%26_Rubber_Company_Logo.svg/1200px-Cooper_Tire_%26_Rubber_Company_Logo.svg.png',
  },
  {
    name: 'Maxxis',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Maxxis_Logo.svg/1200px-Maxxis_Logo.svg.png',
  },
  {
    name: 'Toyo',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Toyo_Tires_logo.svg/1200px-Toyo_Tires_logo.svg.png',
  },
  {
    name: 'Kumho',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Kumho_Tire_Company_Ltd._logo.svg/1024px-Kumho_Tire_Company_Ltd._logo.svg.png',
  },
  {
    name: 'Nexen',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Nexen_Tire_company_logo.svg/1024px-Nexen_Tire_company_logo.svg.png',
  },
  {
    name: 'Vredestein',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Vredestein_logo.svg/1024px-Vredestein_logo.svg.png',
  },
];

export function TireMarquee() {
  return (
    <section className="tire-marquee-section">
      <div className="tire-marquee-container">
        <h2 className="tire-marquee-title">Marcas Parceiras</h2>
        <p className="tire-marquee-subtitle">As melhores marcas de pneus do mercado em um só lugar</p>
        
        <div className="tire-marquee-wrapper">
          <div className="tire-marquee">
            {TIRE_BRANDS.map((brand, index) => (
              <div key={`${brand.name}-1-${index}`} className="tire-marquee-item">
                <img
                  src={brand.logo}
                  alt={`Logo ${brand.name}`}
                  className="tire-marquee-logo"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.opacity = '0.5';
                  }}
                />
              </div>
            ))}
            {/* Duplicar para efeito contínuo */}
            {TIRE_BRANDS.map((brand, index) => (
              <div key={`${brand.name}-2-${index}`} className="tire-marquee-item">
                <img
                  src={brand.logo}
                  alt={`Logo ${brand.name}`}
                  className="tire-marquee-logo"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.opacity = '0.5';
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
