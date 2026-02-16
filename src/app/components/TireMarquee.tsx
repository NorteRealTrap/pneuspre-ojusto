import { useEffect, useRef } from 'react';
import './TireMarquee.css';

const BASE_TIRE_BRANDS = [
  {
    name: 'Michelin',
    logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Michelin_Wordmark.svg',
  },
  {
    name: 'Pirelli',
    logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pirelli%20-%20logo%20full%20%28Italy%2C%201997%29.svg',
  },
  {
    name: 'Goodyear',
    logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Goodyear_logo.png',
  },
  {
    name: 'Continental',
    logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Continental_logo.svg',
  },
  {
    name: 'Bridgestone',
    logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bridgestone_logo_full_color.svg',
  },
  {
    name: 'Yokohama',
    logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Yokohama_Tire_new_logo.svg',
  },
];

const CYCLE_REPEATS = 4;
const TIRE_BRANDS = Array.from({ length: CYCLE_REPEATS }, () => BASE_TIRE_BRANDS).flat();

export function TireMarquee() {
  const marqueeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const marquee = marqueeRef.current;
    if (!marquee) return;
    const firstContainer = marquee.querySelector<HTMLDivElement>('.hero-stores_logos-container');

    let frameId = 0;
    let lastTs = performance.now();
    let progress = 0;
    let loopWidth = 0;
    const speedPxPerSecond = 32; // ajuste fino de velocidade do loop

    const updateBounds = () => {
      const next = firstContainer?.getBoundingClientRect().width ?? 0;
      if (!next || !Number.isFinite(next)) {
        loopWidth = 0;
        return;
      }

      if (loopWidth > 0) {
        const ratio = progress / loopWidth;
        loopWidth = next;
        progress = ratio * loopWidth;
      } else {
        loopWidth = next;
        progress = 0;
      }
    };

    const render = () => {
      if (!loopWidth) return;
      marquee.style.transform = `translate3d(${-progress}px, 0, 0)`;
    };

    const animate = (ts: number) => {
      if (!loopWidth) {
        updateBounds();
        lastTs = ts;
        frameId = requestAnimationFrame(animate);
        return;
      }

      const dt = Math.min(64, ts - lastTs);
      lastTs = ts;

      // Loop infinito continuo sem salto visual.
      progress = (progress + (speedPxPerSecond * dt) / 1000) % loopWidth;
      render();

      frameId = requestAnimationFrame(animate);
    };

    updateBounds();
    render();

    const resizeObserver = new ResizeObserver(() => {
      updateBounds();
      render();
    });
    resizeObserver.observe(firstContainer ?? marquee);

    const images = Array.from(marquee.querySelectorAll('img'));
    const onImageReady = () => {
      updateBounds();
      render();
    };

    images.forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', onImageReady);
        img.addEventListener('error', onImageReady);
      }
    });

    const handleResize = () => {
      updateBounds();
      render();
    };

    window.addEventListener('resize', handleResize);
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      images.forEach((img) => {
        img.removeEventListener('load', onImageReady);
        img.removeEventListener('error', onImageReady);
      });
    };
  }, []);

  const renderLogos = (instance: 'A' | 'B') =>
    TIRE_BRANDS.map((brand, index) => (
      <div key={`${instance}-${brand.name}-${index}`} className="hero-stores_logo-item">
        <img
          src={brand.logo}
          loading="eager"
          decoding="async"
          alt={`Logo ${brand.name}`}
          className="hero-stores_logos-images"
          onError={(event) => {
            event.currentTarget.style.opacity = '0.35';
          }}
        />
      </div>
    ));

  return (
    <section className="hero-stores-section">
      <div className="container hero-stores-content">
        <h2 className="hero-stores-title">Marcas Parceiras</h2>
        <p className="hero-stores-subtitle">As melhores marcas de pneus do mercado em um so lugar</p>
      </div>

      <div className="hero-stores-logos-shell">
        <div id="marquee" ref={marqueeRef} className="hero-stores_logos-marquee" aria-label="Marcas parceiras">
          <div className="hero-stores_logos-container">{renderLogos('A')}</div>
          <div className="hero-stores_logos-container" aria-hidden="true">
            {renderLogos('B')}
          </div>
        </div>
      </div>
    </section>
  );
}

