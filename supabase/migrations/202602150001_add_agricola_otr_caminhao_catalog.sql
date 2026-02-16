-- ============================================================
-- CARGA DE PRODUTOS: Agricola, OTR e Caminhao/Onibus
-- Data base de referencia de preco: 2026-02-15
-- Fonte: lista comercial consolidada enviada no projeto
-- Objetivo: inserir/atualizar produtos no catalogo (products)
-- Idempotente: atualiza existentes (brand+model+width+profile+diameter)
--              e insere novos quando nao existirem.
-- ============================================================

WITH source_products (
  brand,
  model,
  width,
  profile,
  diameter,
  load_index,
  speed_rating,
  price,
  old_price,
  stock,
  image,
  category,
  season,
  runflat,
  featured,
  source_store,
  source_link,
  segment
) AS (
  VALUES
    -- Agricola / OTR
    ('BKT', 'TR126 R1', '6', '', '14', '66', 'A6', 460.00, NULL::numeric, 12, 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop', 'agricola', 'all-season', false, true, 'Pneufree.com', 'https://chatgpt.com/?hints=search&q=Pneu+6-14+4+Lonas+66A6+TT+TR126+R1+BKT', 'agricola'),
    ('Pirelli', 'TD500 F2', '7.50', '', '16', '10PR', 'N/A', 866.76, NULL, 8, 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop', 'agricola', 'all-season', false, true, 'Bellenzier Pneus', 'https://chatgpt.com/?hints=search&q=PNEU7-50X16-10LP+Pneu+Dianteiro+Agr%C3%ADcola+7-50X16+10PR+F2+TD500+Pirelli', 'agricola'),
    ('JK Tyre', 'Implement F1 99 I-1', '11L', '', '15', '121', 'B', 490.00, NULL, 10, 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop', 'agricola', 'all-season', false, false, 'Pneufree.com', 'https://chatgpt.com/?hints=search&q=Pneu+11L-15+12+Lonas+121B+TL+Implement+F1+99+I-1+Jk+Tyre', 'agricola/implemento'),
    ('Century', 'R4 OTR', '10.5', '80', '18', '10PR', 'N/A', 1162.00, NULL, 7, 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop', 'otr', 'all-season', false, true, 'Pneus Tyres', 'https://chatgpt.com/?hints=search&q=Pneu+10.5%2F80-18+Century+R4+OTR+10+Lonas', 'otr (r4)'),
    ('Advance', 'R4C', '12', '', '16.5', '147', 'A2', 1867.46, NULL, 6, 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop', 'otr', 'all-season', false, true, 'PneuStore', 'https://chatgpt.com/?hints=search&q=Pneu+Advance+Aro+16.5+R4C+12-16.5+147A2+TL+14+Lonas', 'otr'),
    ('Forerunner', 'SKS-1', '16.5', '', '16.5', '12PR', 'N/A', 1078.92, NULL, 9, 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop', 'otr', 'all-season', false, false, 'SwG Comercio de Camaras de Ar', 'https://chatgpt.com/?hints=search&q=Pneu+OTR+Forerunner+16.5+12+PR+TL+SKS-1', 'otr'),
    ('Maggion', 'Lavoratore G2/L2', '14.00', '', '24', '16PR', 'N/A', 4793.00, NULL, 4, 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop', 'otr', 'all-season', false, true, 'Atacadao Pneus', 'https://chatgpt.com/?hints=search&q=Pneu+Maggion+Aro+24+Lavoratore+G2%2FL2+1400-24+16PR', 'otr'),
    ('Malhotra', 'L-3', '17.5', '', '25', '16PR', 'N/A', 3585.70, NULL, 4, 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop', 'otr', 'all-season', false, false, 'Bamaq Maquinas', 'https://chatgpt.com/?hints=search&q=PNEU+OTR+17.5-25+16PR+L-3+MALHOTRA', 'otr'),
    ('Titan', 'Earthmover Traction G2/L2', '20.5', '', '25', '16PR', 'N/A', 7822.13, NULL, 3, 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop', 'otr', 'all-season', false, true, 'PneuStore', 'https://chatgpt.com/?hints=search&q=Pneu+Titan+Aro+25+Earthmover+Traction+G2%2FL2+20.5-25+Tl+16+Lonas', 'otr pesado'),
    ('Firestone', 'SAT 23', '28L', '', '26', '14PR', 'N/A', 10089.00, NULL, 3, 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop', 'otr', 'all-season', false, true, 'Pneus Tyres', 'https://chatgpt.com/?hints=search&q=Pneu+28L-26+Firestone+Super+All+Traction+SAT+23+14+Lonas', 'tracao pesada'),

    -- Caminhao / Onibus
    ('Xbri', 'Robusto B4', '295', '80', '22.5', '152/149', 'M', 1589.40, NULL, 15, 'https://images.unsplash.com/photo-1519752594763-2637a58b35b5?w=400&h=400&fit=crop', 'onibus', 'all-season', false, true, 'PneuBest', 'https://chatgpt.com/?hints=search&q=Pneu+295%2F80R22.5+Aro+22.5+Xbri+Robusto+B4+18PR+152%2F149M', 'caminhao/onibus'),
    ('Pirelli', 'Pro-D Anteo', '275', '80', '22.5', '149/146', 'M', 1734.45, NULL, 14, 'https://images.unsplash.com/photo-1519752594763-2637a58b35b5?w=400&h=400&fit=crop', 'onibus', 'all-season', false, true, 'Bellenzier Pneus', 'https://chatgpt.com/?hints=search&q=Pneu+275%2F80R22.5+149%2F146M+Tl+Pro-D+Anteo+Pirelli', 'caminhao/onibus'),
    ('DRC', 'D851', '275', '80', '22.5', '149/146', 'L', 1833.23, NULL, 10, 'https://images.unsplash.com/photo-1519752594763-2637a58b35b5?w=400&h=400&fit=crop', 'onibus', 'all-season', false, false, 'PneuStore', 'https://chatgpt.com/?hints=search&q=Pneu+Drc+Aro+22.5+D851+275%2F80R22.5+149%2F146L+16+Lonas', 'caminhao/onibus'),
    ('Firestone', 'T831', '295', '80', '22.5', '152/148', 'G', 2799.00, NULL, 9, 'https://images.unsplash.com/photo-1519752594763-2637a58b35b5?w=400&h=400&fit=crop', 'caminhao', 'all-season', false, true, 'Pneus Tyres', 'https://chatgpt.com/?hints=search&q=Pneu+295%2F80R22.5+Firestone+T831+152%2F148G', 'caminhao'),
    ('Bridgestone', 'R269', '275', '80', '22.5', '149/146', 'L', 2829.00, NULL, 8, 'https://images.unsplash.com/photo-1519752594763-2637a58b35b5?w=400&h=400&fit=crop', 'onibus', 'all-season', false, true, 'Pneus Tyres', 'https://chatgpt.com/?hints=search&q=Pneu+275%2F80R22.5+149%2F146L+R269+Bridgestone', 'caminhao/onibus'),
    ('Continental', 'HDC1+', '275', '80', '22.5', '149/146', 'K', 2689.00, NULL, 8, 'https://images.unsplash.com/photo-1519752594763-2637a58b35b5?w=400&h=400&fit=crop', 'caminhao', 'all-season', false, true, 'Pneus Tyres', 'https://chatgpt.com/?hints=search&q=Pneu+275%2F80R22.5+Continental+HDC1%2B+149%2F146K+Misto+Borrachudo+16Lonas', 'caminhao (tracao/misto)'),
    ('Westlake', 'CR976A', '295', '80', '22.5', '152/149', 'M', 1779.46, NULL, 12, 'https://images.unsplash.com/photo-1519752594763-2637a58b35b5?w=400&h=400&fit=crop', 'onibus', 'all-season', false, false, 'PneuStore', 'https://chatgpt.com/?hints=search&q=Pneu+295%2F80R22.5+Liso+18+Lonas+152%2F149M+CR976A+Westlake', 'caminhao/onibus'),
    ('Pirelli', 'FR88', '295', '80', '22.5', '152/148', 'M', 3211.38, NULL, 6, 'https://images.unsplash.com/photo-1519752594763-2637a58b35b5?w=400&h=400&fit=crop', 'caminhao', 'all-season', false, true, 'DPaschoal', 'https://chatgpt.com/?hints=search&q=Pneu+Pirelli+Aro+22.5+FR88+295%2F80R22.5+152%2F148M', 'caminhao'),
    ('Xbri', 'Ecoplus B5', '295', '80', '22.5', '152/149', 'M', 1679.40, NULL, 11, 'https://images.unsplash.com/photo-1519752594763-2637a58b35b5?w=400&h=400&fit=crop', 'caminhao', 'all-season', false, true, 'PneuBest', 'https://chatgpt.com/?hints=search&q=Pneu+295%2F80R22.5+Xbri+Ecoplus+B5+18pr+152%2F149m', 'caminhao'),
    ('Pirelli', 'TR01', '295', '80', '22.5', '152/148', 'M', 3507.90, NULL, 5, 'https://images.unsplash.com/photo-1519752594763-2637a58b35b5?w=400&h=400&fit=crop', 'caminhao', 'all-season', false, true, 'DPaschoal', 'https://chatgpt.com/?hints=search&q=Pneu+Pirelli+Aro+22.5+Tr01+295%2F80R22.5+152%2F148M', 'caminhao'),
    ('Goodyear', 'Armor Max', '11.00', '', '22', '152/149', 'DH', 4252.90, NULL, 4, 'https://images.unsplash.com/photo-1519752594763-2637a58b35b5?w=400&h=400&fit=crop', 'caminhao', 'all-season', false, true, 'DPaschoal', 'https://chatgpt.com/?hints=search&q=Pneu+Aro+22+Goodyear+11.00R22+152%2F149Dh+Armor+Max+Otr', 'caminhao'),
    ('Steelmark', 'AGS', '275', '80', '22.5', 'N/A', 'N/A', 2154.33, NULL, 7, 'https://images.unsplash.com/photo-1519752594763-2637a58b35b5?w=400&h=400&fit=crop', 'onibus', 'all-season', false, false, 'Encruzilhada Pneus', 'https://chatgpt.com/?hints=search&q=Pneu+275%2F80r22.5+Steelmark+Ags', 'caminhao/onibus')
), prepared AS (
  SELECT
    brand,
    model,
    width,
    COALESCE(profile, '') AS profile,
    diameter,
    load_index,
    speed_rating,
    price,
    old_price,
    stock,
    image,
    ARRAY_REMOVE(
      ARRAY[
        CASE
          WHEN profile IS NULL OR profile = '' THEN format('Medida %s-%s', width, diameter)
          ELSE format('Medida %s/%sR%s', width, profile, diameter)
        END,
        format('Aro %s', diameter),
        format('Indice de Carga %s', load_index),
        format('Indice de Velocidade %s', speed_rating),
        format('Segmento %s', segment),
        format('Loja origem %s', source_store)
      ]::text[],
      NULL
    ) AS features,
    category,
    season,
    runflat,
    featured,
    CASE
      WHEN profile IS NULL OR profile = '' THEN
        format(
          '%s %s medida %s-%s. Segmento: %s. Preco de referencia coletado em 2026-02-15 na loja %s. Link: %s',
          brand,
          model,
          width,
          diameter,
          segment,
          source_store,
          source_link
        )
      ELSE
        format(
          '%s %s medida %s/%sR%s. Segmento: %s. Preco de referencia coletado em 2026-02-15 na loja %s. Link: %s',
          brand,
          model,
          width,
          profile,
          diameter,
          segment,
          source_store,
          source_link
        )
    END AS description
  FROM source_products
), updated AS (
  UPDATE products p
  SET
    load_index = s.load_index,
    speed_rating = s.speed_rating,
    price = s.price,
    old_price = s.old_price,
    stock = s.stock,
    image = COALESCE(s.image, p.image),
    features = s.features,
    category = s.category,
    season = s.season,
    runflat = s.runflat,
    featured = s.featured,
    description = s.description,
    updated_at = NOW(),
    deleted_at = NULL
  FROM prepared s
  WHERE p.brand = s.brand
    AND p.model = s.model
    AND p.width = s.width
    AND COALESCE(p.profile, '') = COALESCE(s.profile, '')
    AND p.diameter = s.diameter
  RETURNING p.id
), inserted AS (
  INSERT INTO products (
    brand,
    model,
    width,
    profile,
    diameter,
    load_index,
    speed_rating,
    price,
    old_price,
    stock,
    image,
    features,
    category,
    season,
    runflat,
    featured,
    description
  )
  SELECT
    s.brand,
    s.model,
    s.width,
    s.profile,
    s.diameter,
    s.load_index,
    s.speed_rating,
    s.price,
    s.old_price,
    s.stock,
    s.image,
    s.features,
    s.category,
    s.season,
    s.runflat,
    s.featured,
    s.description
  FROM prepared s
  WHERE NOT EXISTS (
    SELECT 1
    FROM products p
    WHERE p.brand = s.brand
      AND p.model = s.model
      AND p.width = s.width
      AND COALESCE(p.profile, '') = COALESCE(s.profile, '')
      AND p.diameter = s.diameter
      AND p.deleted_at IS NULL
  )
  RETURNING id
)
SELECT
  (SELECT COUNT(*) FROM source_products) AS total_itens_lote,
  (SELECT COUNT(*) FROM updated) AS total_itens_atualizados,
  (SELECT COUNT(*) FROM inserted) AS total_itens_inseridos,
  (
    (SELECT COUNT(*) FROM updated) +
    (SELECT COUNT(*) FROM inserted)
  ) AS total_itens_processados,
  (
    SELECT COUNT(*)
    FROM products p
    INNER JOIN prepared s
      ON p.brand = s.brand
      AND p.model = s.model
      AND p.width = s.width
      AND COALESCE(p.profile, '') = COALESCE(s.profile, '')
      AND p.diameter = s.diameter
    WHERE p.deleted_at IS NULL
  ) AS total_itens_ativos_no_catalogo_apos_carga;
