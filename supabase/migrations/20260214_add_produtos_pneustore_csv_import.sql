-- ============================================================
-- CARGA DE PRODUTOS: CSV (pneustore) - 2026-02-14
-- Origem: lista enviada no chat (carro kit 4 + moto unidade)
-- Objetivo: inserir/atualizar produtos no catálogo (tabela products)
-- Idempotente: atualiza existentes (brand+model+width+profile+diameter)
--              e insere novos quando não existirem.
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
  mounting_type,
  position
) AS (
  VALUES
    -- Carro | Kit 4
    ('Itaro', 'IT203 Kit 4', '185', '65', '15', '88', 'H', 1419.90, 1675.48, 14, 'https://www.pneustore.com.br/medias/sys_master/images/images/h27/hca/9099131912222/jogo-4-pneus-itaro-aro-15-it203-185-65r15-88h-1.jpg', 'passeio', 'all-season', false, true, 'radial', ''),
    ('Itaro', 'IT203 Kit 4', '195', '55', '15', '85', 'V', 1699.90, 2005.88, 11, 'https://www.pneustore.com.br/medias/sys_master/images/images/hb3/he7/9099127586846/jogo-4-pneus-itaro-aro-15-it203-195-55r15-85v-1.jpg', 'passeio', 'all-season', false, false, 'radial', ''),
    ('Itaro', 'IT203 Kit 4', '205', '55', '16', '91', 'V', 1899.90, 2241.88, 10, 'https://www.pneustore.com.br/medias/sys_master/images/images/hb9/h36/9099130339358/jogo-4-pneus-itaro-aro-16-it203-205-55r16-91v-1.jpg', 'passeio', 'all-season', false, true, 'radial', ''),

    ('Firestone', 'F-600 Kit 4', '175', '70', '14', '84', 'T', 1519.90, 1793.48, 12, 'https://www.pneustore.com.br/medias/sys_master/images/images/he4/h5b/9441842135070/jogo-4-pneus-firestone-aro-14-f-600-175-70r14-84t-1.jpg', 'passeio', 'all-season', false, true, 'radial', ''),
    ('Firestone', 'F-600 Kit 4', '195', '55', '15', '85', 'H', 1699.90, 2005.88, 11, 'https://www.pneustore.com.br/medias/sys_master/images/images/h7e/h27/9280583139358/jogo-4-pneus-firestone-aro-15-f-600-195-55r15-85h-1.jpg', 'passeio', 'all-season', false, false, 'radial', ''),
    ('Firestone', 'F-600 Kit 4', '205', '55', '16', '91', 'V', 1799.90, 2123.88, 13, 'https://www.pneustore.com.br/medias/sys_master/images/images/hc7/h55/9280580091934/jogo-4-pneus-firestone-aro-16-f-600-205-55r16-91v-1.jpg', 'passeio', 'all-season', false, true, 'radial', ''),

    ('Goodyear', 'Eagle Sport 2 Kit 4', '205', '55', '16', '91', 'V', 1999.90, 2359.88, 10, 'https://www.pneustore.com.br/medias/sys_master/images/images/h03/hca/9441843707934/jogo-4-pneus-goodyear-aro-16-eagle-sport-2-205-55r16-91v-1.jpg', 'passeio', 'all-season', false, true, 'radial', ''),

    ('Bridgestone', 'Ecopia EP150 Kit 4', '205', '55', '16', '91', 'V', 2099.90, 2477.88, 10, 'https://www.pneustore.com.br/medias/sys_master/images/images/h22/ha6/10230919856158/jogo-4-pneus-bridgestone-aro-16-ecopia-ep150-205-55r16-91v-1.jpg', 'passeio', 'all-season', false, true, 'radial', ''),

    ('Pirelli', 'Cinturato P1 Plus Kit 4', '205', '55', '16', '91', 'V', 2199.90, 2595.88, 10, 'https://www.pneustore.com.br/medias/sys_master/images/images/he2/h70/9169375264798/jogo-4-pneus-pirelli-aro-16-cinturato-p1-plus-205-55r16-91v-1.jpg', 'passeio', 'all-season', false, true, 'radial', ''),

    ('Ceat', 'EcoDrive Kit 4', '175', '70', '14', '88', 'T', 1399.90, 1651.88, 12, 'https://www.pneustore.com.br/medias/sys_master/images/images/h67/ha0/9870321156126/jogo-4-pneus-ceat-aro-14-ecodrive-175-70r14-88t-xl-1.jpg', 'passeio', 'all-season', false, false, 'radial', ''),

    ('Barum by Continental', 'Bravuris 5HM Kit 4', '175', '70', '14', '88', 'T', 1499.90, 1769.88, 12, 'https://www.pneustore.com.br/medias/sys_master/images/images/h18/h94/9494076653598/jogo-4-pneus-barum-by-continental-aro-14-bravuris-5hm-175-70r14-88t-1.jpg', 'passeio', 'all-season', false, false, 'radial', ''),

    ('Kumho', 'Sense KR26 Kit 4', '175', '70', '14', '84', 'T', 1299.90, 1533.88, 12, 'https://www.pneustore.com.br/medias/sys_master/images/images/hbb/h4e/8860131360798/jogo-de-4-pneus-kumho-aro-14-kr26-175-70r14-84t-1.jpg', 'passeio', 'all-season', false, false, 'radial', ''),

    ('Michelin', 'Primacy 4+ Kit 4', '225', '45', '17', '94', 'W', 3299.90, 3893.48, 8, 'https://www.pneustore.com.br/medias/sys_master/images/images/h35/he9/9706264518686/jogo-4-pneus-michelin-aro-17-primacy-4-225-45r17-94w-xl-1.jpg', 'passeio', 'all-season', false, true, 'radial', ''),

    -- Moto | Unidade
    ('Maggion', 'Winner', '90', '90', '18', '57', 'P', 229.90, 271.28, 25, 'https://www.pneustore.com.br/medias/sys_master/images/images/h7d/h48/8859845683230/pneu-de-moto-maggion-winner-90-90-18-57p-tl-traseiro-1.jpg', 'moto', 'all-season', false, false, 'TL (sem camara)', 'Traseiro'),
    ('Maggion', 'Winner', '100', '90', '18', '56', 'P', 239.90, 283.08, 24, 'https://www.pneustore.com.br/medias/sys_master/images/images/h60/hbf/9551140356126/pneu-moto-maggion-aro-18-winner-100-90-18-56p-tl-traseiro-1.jpg', 'moto', 'all-season', false, false, 'TL (sem camara)', 'Traseiro'),
    ('Maggion', 'Sportissimo', '110', '70', '17', '54', 'H', 269.90, 318.48, 18, 'https://www.pneustore.com.br/medias/sys_master/images/images/h4d/h19/9551126200350/pneu-moto-maggion-aro-17-sportissimo-110-70-17-54h-tl-dianteiro-1.jpg', 'moto', 'all-season', false, false, 'TL (sem camara)', 'Dianteiro'),

    ('Michelin', 'Pilot Street 2', '100', '90', '18', '62', 'S', 359.90, 424.68, 20, 'https://www.pneustore.com.br/medias/sys_master/images/images/h8a/h84/9035433115678/pneu-moto-michelin-aro-18-pilot-street-2-100-90-18-62s-tl-dianteiro-traseiro-1.jpg', 'moto', 'all-season', false, true, 'TL (sem camara)', 'Dianteiro/Traseiro'),
    ('Michelin', 'Pilot Street', '110', '70', '17', '54', 'H', 399.90, 471.88, 18, 'https://www.pneustore.com.br/medias/sys_master/images/images/h4c/hf4/8859834744862/pneu-de-moto-michelin-aro-17-pilot-street-110-70-17-54h-tl-tt-dianteiro-1.jpg', 'moto', 'all-season', false, false, 'TL/TT', 'Dianteiro'),
    ('Michelin', 'Pilot Street 2', '110', '70', '17', '59', 'S', 419.90, 495.48, 16, 'https://www.pneustore.com.br/medias/sys_master/images/images/h8c/h41/9076561149982/pneu-moto-michelin-aro-17-pilot-street-2-110-70-17-59s-tl-dianteiro-1.jpg', 'moto', 'all-season', false, false, 'TL (sem camara)', 'Dianteiro'),

    ('Pirelli', 'Sport Demon', '100', '80', '17', '52', 'S', 449.90, 530.88, 14, 'https://www.pneustore.com.br/medias/sys_master/images/images/h97/hbf/8859723614238/pneu-de-moto-pirelli-aro-17-sport-demon-100-80-17-52s-tl-dianteiro-1.jpg', 'moto', 'all-season', false, false, 'TL (sem camara)', 'Dianteiro'),
    ('Pirelli', 'Super City', '100', '90', '18', '56', 'P', 379.90, 448.28, 14, 'https://www.pneustore.com.br/medias/sys_master/images/images/h65/hf8/8859548155934/pneu-de-moto-pirelli-aro-18-super-city-100-90-18-56p-tl-traseiro-1.jpg', 'moto', 'all-season', false, false, 'TL (sem camara)', 'Traseiro'),
    ('Pirelli', 'Diablo Rosso II', '110', '70', '17', '54', 'H', 699.90, 825.88, 10, 'https://www.pneustore.com.br/medias/sys_master/images/images/h5a/h6a/9483593646110/pneu-moto-pirelli-aro-17-diablo-rosso-ii-110-70r17-54h-tl-traseiro-1.jpg', 'moto', 'all-season', false, true, 'TL (sem camara)', 'Dianteiro'),

    ('Levorin', 'Matrix', '80', '100', '14', '49', 'L', 199.90, 235.88, 20, 'https://www.pneustore.com.br/medias/sys_master/images/images/hc7/h4f/8859909259294/pneu-de-moto-levorin-aro-14-matrix-80-10014-49l-tt-traseiro-1.jpg', 'moto', 'all-season', false, false, 'TT (com camara)', 'Traseiro'),
    ('Speedmax', 'SPM-M10', '80', '100', '14', '49', 'L', 189.90, 224.08, 20, 'https://www.pneustore.com.br/medias/sys_master/images/images/h57/hbb/9346802352158/pneu-moto-speedmax-aro-14-spm-m10-80-100-14-49l-tt-traseiro-1.jpg', 'moto', 'all-season', false, false, 'TT (com camara)', 'Traseiro'),
    ('Rinaldi', 'PD29', '80', '100', '14', '49', 'L', 209.90, 247.68, 18, 'https://www.pneustore.com.br/medias/sys_master/images/images/h92/hf5/8859957690398/pneu-de-moto-rinaldi-aro-14-pd29-80-100-14-49l-tt-traseiro-1.jpg', 'moto', 'all-season', false, false, 'TT (com camara)', 'Traseiro'),

    -- Medidas em polegadas (2.75-18)
    -- Observacao: a coluna products.profile no banco esta NOT NULL.
    -- Para esse tipo de medida, gravamos profile como string vazia ('') e tratamos como "sem perfil".
    ('Taiga', 'V250', '2.75', '', '18', '42', 'P', 169.90, 200.48, 16, 'https://www.pneustore.com.br/medias/sys_master/images/images/he8/ha5/9061875351582/pneu-moto-taiga-aro-18-v250-2-75-18-42p-tt-dianteiro-1.jpg', 'moto', 'all-season', false, false, 'TT (com camara)', 'Dianteiro'),
    ('Speedmax', 'Faster', '2.75', '', '18', '50', 'P', 179.90, 212.28, 16, NULL, 'moto', 'all-season', false, false, 'TT (com camara)', 'Dianteiro/Traseiro')
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
    COALESCE(
      NULLIF(image, ''),
      'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop'
    ) AS image,
    ARRAY_REMOVE(
      ARRAY[
        CASE
          WHEN profile IS NULL OR profile = '' THEN format('Medida %s-%s', width, diameter)
          ELSE format('Medida %s/%sR%s', width, profile, diameter)
        END,
        format('Indice de Carga %s', load_index),
        format('Indice de Velocidade %s', speed_rating),
        CASE WHEN mounting_type IS NOT NULL AND mounting_type <> '' THEN format('Montagem %s', mounting_type) END,
        CASE WHEN position IS NOT NULL AND position <> '' THEN format('Posicao %s', position) END,
        CASE WHEN category = 'moto' THEN 'Aplicacao moto' ELSE 'Kit com 4 pneus' END
      ]::text[],
      NULL
    ) AS features,
    category,
    season,
    runflat,
    featured,
    CASE
      WHEN category = 'moto' THEN
        CASE
          WHEN profile IS NULL OR profile = '' THEN
            format(
              '%s %s %s-%s para moto. Montagem: %s. Posicao: %s.',
              brand,
              model,
              width,
              diameter,
              mounting_type,
              COALESCE(NULLIF(position, ''), 'Dianteiro/Traseiro')
            )
          ELSE
            format(
              '%s %s %s/%sR%s para moto. Montagem: %s. Posicao: %s.',
              brand,
              model,
              width,
              profile,
              diameter,
              mounting_type,
              COALESCE(NULLIF(position, ''), 'Dianteiro/Traseiro')
            )
        END
      ELSE
        format(
          '%s %s %s/%sR%s. Kit com 4 pneus para carro (montagem %s).',
          brand,
          model,
          width,
          profile,
          diameter,
          mounting_type
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
-- Relatorio da carga executada (sem lista manual de OR).
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
