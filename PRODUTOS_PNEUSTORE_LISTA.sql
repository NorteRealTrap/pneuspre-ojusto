-- ============================================================
-- CARGA DE PRODUTOS: LISTA PNEUSTORE
-- Fonte: C:/Users/Windows/Documents/lista_pneus_pneustore.csv
-- Data: 2026-02-14
-- Idempotente: atualiza existentes e insere apenas novos.
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
    ('Michelin', 'Pilot Street 2', '90', '90', '18', '57', 'S', 359.90, 424.68, 20, 'https://www.pneustore.com.br/medias/sys_master/images/images/hc8/h3c/9551028586526/pneu-moto-michelin-aro-18-pilot-street-2-90-90-18-57s-tl-reinf-dianteiro-traseiro-1.jpg', 'moto', 'all-season', false, true, 'TL (sem camara)', 'Dianteiro/Traseiro'),
    ('Maggion', 'ST6', '90', '90', '18', '51', 'P', 219.90, 259.48, 26, 'https://www.pneustore.com.br/medias/sys_master/images/images/hfd/h53/9551161589790/pneu-moto-maggion-aro-18-st6-90-90-18-51p-tt-traseiro-1.jpg', 'moto', 'all-season', false, false, 'TT (com camara)', 'Traseiro'),
    ('Maggion', 'Predator MR5 TT', '90', '90', '18', '57', 'P', 239.90, 283.08, 24, 'https://www.pneustore.com.br/medias/sys_master/images/images/hf6/h5b/9551110176798/pneu-moto-maggion-aro-18-predator-mr5-90-90-18-57p-tt-traseiro-1.jpg', 'moto', 'all-season', false, false, 'TT (com camara)', 'Traseiro'),
    ('Maggion', 'Predator MR5 TL', '90', '90', '18', '57', 'P', 249.90, 294.88, 22, 'https://www.pneustore.com.br/medias/sys_master/images/images/hfe/hae/9551119220766/pneu-moto-maggion-aro-18-predator-mr5-90-90-18-57p-tl-traseiro-1.jpg', 'moto', 'all-season', false, false, 'TL (sem camara)', 'Traseiro'),
    ('Maggion', 'Winner', '90', '90', '18', '57', 'P', 229.90, 271.28, 25, 'https://www.pneustore.com.br/medias/sys_master/images/images/hf3/h2d/9551115841566/pneu-moto-maggion-aro-18-winner-90-90-18-57p-tl-traseiro-1.jpg', 'moto', 'all-season', false, false, 'TL (sem camara)', 'Traseiro'),
    ('Itaro', 'IT203 Kit 4', '185', '65', '15', '88', 'H', 1419.90, 1675.48, 14, 'https://www.pneustore.com.br/medias/sys_master/images/images/h40/h2c/9099126800414/jogo-4-pneus-itaro-aro-15-it203-185-65r15-88h-1.jpg', 'passeio', 'all-season', false, true, 'radial', ''),
    ('Firestone', 'F-600 Kit 4', '175', '70', '14', '84', 'T', 1519.90, 1793.48, 12, 'https://www.pneustore.com.br/medias/sys_master/images/images/he4/h5b/9441842135070/jogo-4-pneus-firestone-aro-14-f-600-175-70r14-84t-1.jpg', 'passeio', 'all-season', false, true, 'radial', ''),
    ('Itaro', 'IT203 Kit 4', '205', '55', '16', '91', 'V', 1899.90, 2241.88, 10, 'https://www.pneustore.com.br/medias/sys_master/images/images/hb9/h36/9099130339358/jogo-4-pneus-itaro-aro-16-it203-205-55r16-91v-1.jpg', 'passeio', 'all-season', false, true, 'radial', ''),
    ('Itaro', 'IT203 Kit 4', '195', '55', '15', '85', 'V', 1699.90, 2005.88, 11, 'https://www.pneustore.com.br/medias/sys_master/images/images/hb3/he7/9099127586846/jogo-4-pneus-itaro-aro-15-it203-195-55r15-85v-1.jpg', 'passeio', 'all-season', false, false, 'radial', ''),
    ('Speedmax', 'SPM203 Kit 4', '205', '55', '16', '91', 'V', 1799.90, 2123.88, 13, 'https://www.pneustore.com.br/medias/sys_master/images/images/h95/hef/9248919879710/jogo-4-pneus-speedmax-aro-16-spm203-205-55r16-91v-1.jpg', 'passeio', 'all-season', false, true, 'radial', '')
), prepared AS (
  SELECT
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
    ARRAY_REMOVE(
      ARRAY[
        format('Medida %s/%sR%s', width, profile, diameter),
        format('Indice de Carga %s', load_index),
        format('Indice de Velocidade %s', speed_rating),
        CASE WHEN mounting_type <> '' THEN format('Montagem %s', mounting_type) END,
        CASE WHEN position <> '' THEN format('Posicao %s', position) END,
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
    image = s.image,
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
    AND p.profile = s.profile
    AND p.diameter = s.diameter
  RETURNING p.id
)
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
    AND p.profile = s.profile
    AND p.diameter = s.diameter
    AND p.deleted_at IS NULL
);

SELECT COUNT(*) AS total_itens_lista_pneustore
FROM products
WHERE deleted_at IS NULL
  AND (
    (brand = 'Michelin' AND model = 'Pilot Street 2' AND width = '90' AND profile = '90' AND diameter = '18')
    OR (brand = 'Maggion' AND model = 'ST6' AND width = '90' AND profile = '90' AND diameter = '18')
    OR (brand = 'Maggion' AND model = 'Predator MR5 TT' AND width = '90' AND profile = '90' AND diameter = '18')
    OR (brand = 'Maggion' AND model = 'Predator MR5 TL' AND width = '90' AND profile = '90' AND diameter = '18')
    OR (brand = 'Maggion' AND model = 'Winner' AND width = '90' AND profile = '90' AND diameter = '18')
    OR (brand = 'Itaro' AND model = 'IT203 Kit 4' AND width = '185' AND profile = '65' AND diameter = '15')
    OR (brand = 'Firestone' AND model = 'F-600 Kit 4' AND width = '175' AND profile = '70' AND diameter = '14')
    OR (brand = 'Itaro' AND model = 'IT203 Kit 4' AND width = '205' AND profile = '55' AND diameter = '16')
    OR (brand = 'Itaro' AND model = 'IT203 Kit 4' AND width = '195' AND profile = '55' AND diameter = '15')
    OR (brand = 'Speedmax' AND model = 'SPM203 Kit 4' AND width = '205' AND profile = '55' AND diameter = '16')
  );
