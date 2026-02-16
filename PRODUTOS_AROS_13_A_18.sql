-- ============================================================
-- CATALOGO EXPANDIDO DE PNEUS (AROS 13 A 18)
-- Baseado na lista de medidas solicitada.
-- Idempotente: atualiza registros existentes (marca+modelo+medida)
-- e insere apenas os que ainda nao existem.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Normaliza categorias e temporadas legadas
UPDATE products
SET category = CASE
  WHEN lower(unaccent(category)) IN ('automovel', 'automoveis', 'passeio') THEN 'passeio'
  WHEN lower(unaccent(category)) IN ('suv', 'suv e 4x4') THEN 'suv'
  WHEN lower(unaccent(category)) IN ('caminhonete', 'caminhonetes') THEN 'caminhonete'
  WHEN lower(unaccent(category)) IN ('van', 'vans', 'utilitario', 'utilitarios') THEN 'van'
  WHEN lower(unaccent(category)) IN ('moto', 'motos') THEN 'moto'
  ELSE lower(unaccent(category))
END,
season = CASE
  WHEN lower(unaccent(season)) IN ('all season', 'all-season', 'allseason') THEN 'all-season'
  WHEN lower(unaccent(season)) IN ('verao', 'summer') THEN 'summer'
  WHEN lower(unaccent(season)) IN ('inverno', 'winter') THEN 'winter'
  ELSE lower(unaccent(season))
END;

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
  runflat,
  featured,
  diameter_mm
) AS (
  VALUES
    ('Aeolus', 'EcoDrive', '145', '80', '13', '75', 'T', 249.90, 294.88, 21, 'https://chinesetrucktire.com/wp-content/uploads/2024/03/Aeolus-Tyres.jpg', 'passeio', false, false, 562.2),
    ('Atlas', 'Green HP', '155', '80', '13', '79', 'T', 249.90, 294.88, 28, 'https://www.tire-reviews.com/images/tyres/Atlas-Green-HP.png', 'passeio', false, false, 578.2),
    ('Barum', 'Brillantis 2', '165', '70', '13', '79', 'T', 257.90, 304.32, 35, 'https://www.tire-reviews.com/images/tyres/Barum-Brillantis-2.jpg', 'passeio', false, false, 561.2),
    ('Firestone', 'F-700', '165', '75', '13', '81', 'T', 302.90, 357.42, 42, 'https://www.firestone.com.br/content/dam/consumer/fst/shared/tires/f-series-f-700-plus/tilted.jpg', 'passeio', false, false, 577.7),
    ('Itaro', 'MH01', '175', '70', '13', '82', 'T', 253.90, 299.60, 49, 'https://www.pneus.org/offers/pneu-175-70-r13-itaro-mh01-82t.jpg', 'passeio', false, true, 575.2),
    ('Kenda', 'KR23', '175', '75', '13', '84', 'T', 288.90, 340.90, 56, 'https://kdpneus.vteximg.com.br/arquivos/ids/164318-1000-1000/kd-pneus-kenda-kr23_principal.jpg?v=635169533777030000', 'passeio', false, false, 594.0),
    ('Kumho', 'Solus KH17', '185', '60', '13', '80', 'H', 334.90, 395.18, 14, 'https://images.simpletire.com/images/q_auto/line-images/6453/6453-sidetread/kumho-solus-kh17.png', 'passeio', false, false, 552.2),
    ('Maxxis', 'MA307', '185', '70', '13', '86', 'T', 329.90, 389.28, 21, 'https://autolla.co/wp-content/uploads/llanta-maxxis-ma-307.jpg', 'passeio', false, false, 589.2),
    ('General Tire', 'Altimax Comfort', '195', '60', '13', '88', 'H', 380.90, 449.46, 28, 'https://www.generaltire.com.br/car/_jcr_content/root/container/text_and_image_copy_.coreimg.png/1678391734097/general-tire-pneus-on-road-altimax-grabber-gt-plus.png', 'passeio', false, false, 564.2),
    ('Aeolus', 'PrecisionAce 2', '165', '70', '14', '81', 'T', 267.90, 316.12, 35, 'https://chinesetrucktire.com/wp-content/uploads/2024/03/Aeolus-Tyres.jpg', 'passeio', false, false, 586.6),
    ('Hankook', 'Kinergy Eco2', '175', '65', '14', '82', 'T', 393.90, 464.80, 42, 'https://hankook.com.ar/wp-content/uploads/2024/10/K435_normal.png', 'passeio', false, false, 583.1),
    ('Ceat', 'SecuraDrive', '175', '70', '14', '84', 'T', 308.90, 364.50, 49, 'https://www.ceat.com/content/dam/ceat/website/v1-desk-securadrive-suv-4096x1320.png', 'passeio', false, false, 600.6),
    ('Continental', 'UltraContact', '185', '60', '14', '82', 'H', 469.90, 554.48, 56, 'https://www.continental-tires.com/content/dam/conti-tires-cms/continental/market-content/pt/folhetos-e-brochuras/UltraContact.pdf/_jcr_content/renditions/cq5dam.web.1280.1280.jpeg', 'passeio', false, true, 577.6),
    ('Kelly', 'Edge Touring 2', '185', '60', '14', '82', 'H', 374.90, 442.38, 14, 'https://www.goodyear.lat/images/tread/02005053344.png', 'passeio', false, true, 577.6),
    ('Goodyear', 'Assurance', '185', '65', '14', '86', 'H', 434.90, 513.18, 21, 'https://www.goodyear.com/dw/image/v2/BJQJ_PRD/on/demandware.static/-/Sites-Goodyear-Library/default/dw0106490d/GY/category-Page/hero-assurance.png?sw=720&sh=816&q=85&sm=fit', 'passeio', false, false, 596.1),
    ('BFGoodrich', 'Advantage', '185', '70', '14', '88', 'H', 459.90, 542.68, 28, 'https://storage.googleapis.com/tireclick/llantas/BFGOODRICHADVANTAGETOURING_COSTADO.jpg', 'passeio', false, false, 614.6),
    ('Formula', 'Energy', '195', '55', '14', '85', 'V', 410.90, 484.86, 35, 'https://www.tire-reviews.com/images/tyres/Formula-Formula-Energy.jpg', 'passeio', false, false, 570.1),
    ('Cooper', 'CS3 Touring', '195', '60', '14', '86', 'H', 450.90, 532.06, 42, 'https://images.simpletire.com/images/q_auto/line-images/8525/8525-sidetread/cooper-cs3-touring.png', 'passeio', false, false, 589.6),
    ('Bridgestone', 'Ecopia EP150', '195', '65', '14', '89', 'H', 500.90, 591.06, 49, 'https://assets.bridgestonetire.com/content/dam/consumer/bst/shared/tires/ecopia-ep150/tilted.png', 'passeio', false, false, 609.1),
    ('Maxxis', 'Bravo', '205', '70', '14', '95', 'T', 506.90, 598.14, 56, 'https://trucktirereviews.com/wp-content/uploads/2018/09/maxxis-bravo-at-771.jpg', 'suv', false, false, 642.6),
    ('Atlas', 'Green 4S', '185', '60', '15', '84', 'H', 404.90, 477.78, 14, 'https://padangos123.lt/images/galleries/1579092963_atlas-green-4s.jpg', 'passeio', false, false, 603.0),
    ('Ceat', 'EcoDrive', '185', '65', '15', '88', 'H', 419.90, 495.48, 21, 'https://www.pneus.org/offers/pneu-ceat-ecodrive.jpg', 'passeio', false, false, 621.5),
    ('Hankook', 'Ventus Prime3', '195', '55', '15', '85', 'V', 550.90, 650.06, 28, 'https://asset.hankooktire.com/content/dam/hankooktire/eu/product/pcr/k115/d_Keyvisual(export).jpg', 'passeio', false, false, 595.5),
    ('Barum', 'Bravuris 5HM', '195', '60', '15', '88', 'H', 460.90, 543.86, 35, 'https://www.barum.com.br/car/tyres/bravuris-5hm/_jcr_content/root/container/carousel_copy_copy_c/image_145245394.coreimg.png/1683651540694/barum--bravuris-5hm--productpicture--60--zz-stat-dim--195-65-r-15.png', 'passeio', false, false, 615.0),
    ('Michelin', 'Primacy 4', '195', '65', '15', '91', 'H', 640.90, 756.26, 42, 'https://dxm.contentcenter.michelin.com/api/wedia/dam/transform/b98rpyxf61b4xoqtwah1dw5zzh/4w-496_3528701126869_tire_michelin_primacy-all-season_235-slash-55-r19-101h_a_main_4-90_nopad.webp?t=resize&height=500', 'passeio', false, true, 634.5),
    ('Onyx', 'NY-806', '195', '65', '15', '91', 'H', 415.90, 490.76, 49, 'https://www.pneustiktak.com.br/wp-content/uploads/2024/03/ONYX-NY-806.jpg', 'passeio', false, true, 634.5),
    ('Goodyear', 'EfficientGrip', '205', '60', '15', '91', 'H', 566.90, 668.94, 56, 'https://www.goodyear.com.my/wp-content/uploads/EfficientGrip-2-min.png', 'passeio', false, false, 627.0),
    ('Continental', 'PowerContact 2', '205', '65', '15', '94', 'H', 601.90, 710.24, 14, 'https://www.continental-tires.com/adobe/dynamicmedia/deliver/dm-aid--6d1a8a72-dc5f-42eb-b984-181dcd0be2d0/2018-05-18-power-contact-2-picture.png?preferwebp=true&quality=85', 'passeio', false, false, 647.5),
    ('Cooper', 'Discoverer HTS', '215', '65', '15', '96', 'H', 667.90, 788.12, 21, 'https://www.coopertire.com/dw/image/v2/BJQJ_PRD/on/demandware.static/-/Sites-goodyear-master-catalog/default/dw1a706e1d/images/large/Discoverer_HT3_Side_24488.png?sw=900&sh=800&sm=fit&sfrm=jpg', 'suv', false, false, 660.5),
    ('BFGoodrich', 'Trail Terrain', '225', '70', '15', '100', 'T', 718.90, 848.30, 28, 'https://rerev.com/wp-content/uploads/BFGoodrich-Trail-Terrain-review.jpg', 'suv', false, false, 696.0),
    ('Kelly', 'Edge Touring', '195', '55', '16', '87', 'V', 620.90, 732.66, 35, 'https://www.goodyear.lat/images/tread/02005053344.png', 'passeio', false, false, 620.9),
    ('Firestone', 'F-600', '205', '55', '16', '91', 'V', 661.90, 781.04, 42, 'https://assets.firestonetire.com/content/dam/consumer/fst/shared/tires/f-series-f-600/tilted.jpg', 'passeio', false, true, 631.9),
    ('Bridgestone', 'Turanza ER300', '205', '55', '16', '91', 'V', 746.90, 881.34, 49, 'https://www.bridgestone.co.id/content/dam/bridgestone/consumer/bst/tires/models/turanza-er300/tilted.jpg/_jcr_content/renditions/cq5dam.web.1280.1280.jpeg', 'passeio', false, true, 631.9),
    ('Goodyear', 'EfficientGrip Performance', '205', '60', '16', '92', 'V', 701.90, 828.24, 56, 'https://www.goodyear.com.my/wp-content/uploads/EfficientGrip-2-min.png', 'passeio', false, false, 652.4),
    ('General Tire', 'Altimax One S', '205', '65', '16', '95', 'H', 651.90, 769.24, 14, 'https://www.generaltire-tyres.com/content/dam/conti-secondline-brands/generaltire/central-content/plt/factsheets/GENERALTIRES_AltimaxOne_PDF_EN_PLT.pdf/_jcr_content/renditions/cq5dam.web.1280.1280.jpeg', 'passeio', false, false, 672.9),
    ('Kumho', 'Ecsta HS52', '215', '55', '16', '93', 'V', 672.90, 794.02, 21, 'https://www.kumhotire.si/wp-content/uploads/2023/05/Kumho_GUT_Ecsta-HS52_AB102022_EN.png', 'passeio', false, false, 642.9),
    ('Hankook', 'Ventus Prime4', '215', '60', '16', '95', 'V', 702.90, 829.42, 28, 'https://asset.hankooktire.com/content/dam/hankooktire/vn/test-result/k135/Hankookprime4-k135_en.jpg', 'passeio', false, false, 664.4),
    ('Maxxis', 'Premitra HP5', '215', '65', '16', '98', 'H', 642.90, 758.62, 35, 'https://maxxis.pk/wp-content/uploads/2021/02/hp5-1.webp', 'passeio', false, false, 685.9),
    ('Continental', 'PremiumContact 6', '225', '50', '16', '92', 'W', 798.90, 942.70, 42, 'https://continentaltire.com/sites/default/files/styles/square_medium/public/media/image/2024-08/ct_webpage_premiumcontact6_sw_600x600_oe.png?itok=vYoMbTcH', 'passeio', false, false, 631.4),
    ('Pirelli', 'Cinturato P7', '225', '55', '16', '95', 'V', 798.90, 942.70, 49, 'https://tyre-assets.pirelli.com/dynamic_engine/assets/global/Cinturato-P7-1505470083092.png', 'passeio', false, false, 654.4),
    ('Bridgestone', 'Dueler H/P Sport', '235', '60', '16', '100', 'H', 869.90, 1026.48, 56, 'https://assets.bridgestonetire.com/content/dam/consumer/bst/shared/tires/dueler-hp-sport/front.jpg', 'suv', false, false, 688.4),
    ('Formula', 'Energy Plus', '205', '50', '17', '89', 'V', 751.90, 887.24, 14, 'https://www.tire-reviews.com/images/tyres/Formula-Formula-Energy.jpg', 'passeio', false, false, 637.8),
    ('Kelly', 'Edge Sport', '215', '50', '17', '91', 'V', 782.90, 923.82, 21, 'https://www.goodyear.lat/images/tread/02005053342.png', 'passeio', false, false, 647.8),
    ('Atlas', 'Sport Green 2', '215', '55', '17', '94', 'V', 722.90, 853.02, 28, 'https://www.tire-reviews.com/images/tyres/Atlas-Sport-Green-2.jpg', 'passeio', false, false, 668.3),
    ('Kumho', 'Ecowing ES31', '225', '45', '17', '91', 'W', 833.90, 984.00, 35, 'https://www.kumho.co.za/img/ecowing_es31-2.c4627ee2.webp', 'passeio', false, true, 634.3),
    ('Itaro', 'IT301', '225', '45', '17', '91', 'W', 773.90, 913.20, 42, 'https://i0.wp.com/itaro.com.br/wp-content/uploads/2021/04/IT301.png?fit=571%2C662&ssl=1&is-pending-load=1', 'passeio', false, true, 634.3),
    ('Pirelli', 'Cinturato P7', '225', '45', '17', '91', 'W', 938.90, 1107.90, 49, 'https://tyre-assets.pirelli.com/dynamic_engine/assets/global/Cinturato-P7-1505470083092.png', 'passeio', false, true, 634.3),
    ('Kelly', 'Edge Sport', '225', '45', '17', '91', 'W', 823.90, 972.20, 56, 'https://www.goodyear.lat/images/tread/02005053342.png', 'passeio', false, true, 634.3),
    ('Bridgestone', 'Turanza T005', '225', '45', '17', '91', 'W', 1068.90, 1261.30, 14, 'https://assets.bridgestonetire.com/content/dam/consumer/bst/shared/tires/turanza-t005/front.png', 'passeio', true, true, 634.3),
    ('Goodyear', 'Eagle Touring', '225', '50', '17', '94', 'V', 863.90, 1019.40, 21, 'https://www.goodyear.lat/images/perspective/01005053097.jpg', 'passeio', false, false, 656.8),
    ('Continental', 'ContiPowerContact', '225', '55', '17', '97', 'V', 898.90, 1060.70, 28, 'https://continentaltire.com/sites/default/files/styles/square_medium/public/media/image/2020-05/cont-procontact-p_4894_0.png?itok=bd_6tyBv', 'passeio', false, false, 679.3),
    ('Firestone', 'Firehawk 900', '235', '45', '17', '94', 'W', 864.90, 1020.58, 35, 'https://assets.firestonetire.com/content/dam/consumer/fst/shared/tires/firehawk-900-/tilted.jpg', 'passeio', false, false, 643.3),
    ('Cooper', 'Evolution CTT', '235', '55', '17', '99', 'V', 964.90, 1138.58, 42, 'https://www.coopertires.com.au/wp-content/uploads/2022/02/CTT-Featured-Image-700x460px.png', 'suv', false, false, 690.3),
    ('Hankook', 'Ventus S1 evo3', '245', '45', '17', '99', 'W', 905.90, 1068.96, 49, 'https://asset.hankooktire.com/content/dam/hankooktire/br/product/pcr/k127e/d_Keyvisual1-1.jpg', 'passeio', false, false, 652.3),
    ('BFGoodrich', 'All-Terrain T/A KO2', '265', '65', '17', '112', 'S', 1032.90, 1218.82, 56, 'https://cdn-fastly.autoguide.com/media/2023/11/21/15352/bfgoodrich-all-terrain-t-a-ko2-tire-review.jpg?size=720x845&nocrop=1', 'caminhonete', false, true, 776.3),
    ('Kumho', 'Ecsta PS71', '215', '45', '18', '93', 'W', 942.90, 1112.62, 14, 'https://www.tire-reviews.com/images/tyres/Kumho-Ecsta-PS71.png', 'passeio', false, false, 650.7),
    ('Bridgestone', 'Potenza Sport', '225', '40', '18', '92', 'Y', 1058.90, 1249.50, 21, 'https://assets.bridgestonetire.com/content/dam/consumer/bst/shared/tires/potenza-sport-as/front.jpg', 'passeio', false, false, 637.2),
    ('Goodyear', 'Eagle F1 Asymmetric', '225', '45', '18', '95', 'W', 1013.90, 1196.40, 28, 'https://www.goodyear.lat/images/perspective/01005053045.png', 'passeio', false, false, 659.7),
    ('Pirelli', 'P Zero', '235', '40', '18', '95', 'Y', 1089.90, 1286.08, 35, 'https://tyre24.pirelli.com/dynamic_engine/assets/global/Pzero-Nuovo-1505470072726.png', 'passeio', false, false, 645.2),
    ('Continental', 'ExtremeContact DWS06', '235', '45', '18', '98', 'W', 1069.90, 1262.48, 42, 'https://continentaltire.com/sites/default/files/styles/og_image/public/media/image/2021-01/CT21_ExtremeContactDWS06_Plus_1440x810_Marquee_2Artboard%203_1.jpg?itok=27ZqP5sL', 'passeio', false, false, 668.7),
    ('Hankook', 'Ventus S1 evo2 SUV', '235', '50', '18', '101', 'V', 1079.90, 1274.28, 49, 'https://asset.hankooktire.com/content/dam/hankooktire/au/product/suv/k137a/f/Contents_F_1-1015.jpg', 'suv', false, false, 692.2),
    ('Firestone', 'Firehawk Indy 500', '245', '40', '18', '97', 'Y', 1015.90, 1198.76, 56, 'https://assets.firestonetire.com/content/dam/consumer/fst/shared/tires/firehawk-indy-500/tilted.jpg', 'passeio', false, false, 653.2),
    ('Cooper', 'Zeon RS3-G1', '245', '45', '18', '100', 'W', 1050.90, 1240.06, 14, 'https://www.coopertire.ca/dw/image/v2/BJQJ_PRD/on/demandware.static/-/Sites-goodyear-master-catalog/default/dw3bc8e2cb/images/large/Zeon_RS3_G1_24508.png?sw=900&sh=800&sm=fit&sfrm=png', 'passeio', false, false, 677.7),
    ('Michelin', 'Primacy SUV+', '255', '45', '18', '103', 'Y', 1256.90, 1483.14, 21, 'https://dxm.contentcenter.michelin.com/api/wedia/dam/transform/b98rpyxf61b4qpngb9qrfxmeia/4w-989_3528702273791_tire_michelin_primacy-suv-plus_235-slash-60-r18-103v_a_main_5-quarterzoom_nopad.webp?t=resize&height=500', 'suv', false, true, 686.7),
    ('Bridgestone', 'Dueler A/T 001', '265', '60', '18', '110', 'T', 1182.90, 1395.82, 28, 'https://www.bridgestone.co.id/content/dam/bridgestone/consumer/bst/apac/th/Tires/Dueler/at_002/Dueler-AT002_side_resized.jpg', 'caminhonete', false, true, 775.2)

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
    ARRAY[
      format('Medida %s/%sR%s', width, profile, diameter),
      format('Diametro Externo %s mm', round(diameter_mm::numeric, 1)),
      format('Aro %s', diameter),
      format('Indice de Carga %s', load_index),
      format('Indice de Velocidade %s', speed_rating)
    ]::text[] AS features,
    category,
    'all-season'::text AS season,
    runflat,
    featured,
    format(
      '%s %s %s/%sR%s. Diametro externo aproximado: %s mm. Aplicacao: %s.',
      brand,
      model,
      width,
      profile,
      diameter,
      round(diameter_mm::numeric, 1),
      CASE
        WHEN category = 'caminhonete' THEN 'caminhonete/pick-up'
        WHEN category = 'suv' THEN 'SUV/4x4'
        ELSE 'passeio'
      END
    ) AS description
  FROM source_products
)
-- Atualiza itens existentes
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
  AND p.diameter = s.diameter;

-- Insere somente o que nao existe
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
  runflat,
  featured,
  diameter_mm
) AS (
  VALUES
    ('Aeolus', 'EcoDrive', '145', '80', '13', '75', 'T', 249.90, 294.88, 21, 'https://chinesetrucktire.com/wp-content/uploads/2024/03/Aeolus-Tyres.jpg', 'passeio', false, false, 562.2),
    ('Atlas', 'Green HP', '155', '80', '13', '79', 'T', 249.90, 294.88, 28, 'https://www.tire-reviews.com/images/tyres/Atlas-Green-HP.png', 'passeio', false, false, 578.2),
    ('Barum', 'Brillantis 2', '165', '70', '13', '79', 'T', 257.90, 304.32, 35, 'https://www.tire-reviews.com/images/tyres/Barum-Brillantis-2.jpg', 'passeio', false, false, 561.2),
    ('Firestone', 'F-700', '165', '75', '13', '81', 'T', 302.90, 357.42, 42, 'https://www.firestone.com.br/content/dam/consumer/fst/shared/tires/f-series-f-700-plus/tilted.jpg', 'passeio', false, false, 577.7),
    ('Itaro', 'MH01', '175', '70', '13', '82', 'T', 253.90, 299.60, 49, 'https://www.pneus.org/offers/pneu-175-70-r13-itaro-mh01-82t.jpg', 'passeio', false, true, 575.2),
    ('Kenda', 'KR23', '175', '75', '13', '84', 'T', 288.90, 340.90, 56, 'https://kdpneus.vteximg.com.br/arquivos/ids/164318-1000-1000/kd-pneus-kenda-kr23_principal.jpg?v=635169533777030000', 'passeio', false, false, 594.0),
    ('Kumho', 'Solus KH17', '185', '60', '13', '80', 'H', 334.90, 395.18, 14, 'https://images.simpletire.com/images/q_auto/line-images/6453/6453-sidetread/kumho-solus-kh17.png', 'passeio', false, false, 552.2),
    ('Maxxis', 'MA307', '185', '70', '13', '86', 'T', 329.90, 389.28, 21, 'https://autolla.co/wp-content/uploads/llanta-maxxis-ma-307.jpg', 'passeio', false, false, 589.2),
    ('General Tire', 'Altimax Comfort', '195', '60', '13', '88', 'H', 380.90, 449.46, 28, 'https://www.generaltire.com.br/car/_jcr_content/root/container/text_and_image_copy_.coreimg.png/1678391734097/general-tire-pneus-on-road-altimax-grabber-gt-plus.png', 'passeio', false, false, 564.2),
    ('Aeolus', 'PrecisionAce 2', '165', '70', '14', '81', 'T', 267.90, 316.12, 35, 'https://chinesetrucktire.com/wp-content/uploads/2024/03/Aeolus-Tyres.jpg', 'passeio', false, false, 586.6),
    ('Hankook', 'Kinergy Eco2', '175', '65', '14', '82', 'T', 393.90, 464.80, 42, 'https://hankook.com.ar/wp-content/uploads/2024/10/K435_normal.png', 'passeio', false, false, 583.1),
    ('Ceat', 'SecuraDrive', '175', '70', '14', '84', 'T', 308.90, 364.50, 49, 'https://www.ceat.com/content/dam/ceat/website/v1-desk-securadrive-suv-4096x1320.png', 'passeio', false, false, 600.6),
    ('Continental', 'UltraContact', '185', '60', '14', '82', 'H', 469.90, 554.48, 56, 'https://www.continental-tires.com/content/dam/conti-tires-cms/continental/market-content/pt/folhetos-e-brochuras/UltraContact.pdf/_jcr_content/renditions/cq5dam.web.1280.1280.jpeg', 'passeio', false, true, 577.6),
    ('Kelly', 'Edge Touring 2', '185', '60', '14', '82', 'H', 374.90, 442.38, 14, 'https://www.goodyear.lat/images/tread/02005053344.png', 'passeio', false, true, 577.6),
    ('Goodyear', 'Assurance', '185', '65', '14', '86', 'H', 434.90, 513.18, 21, 'https://www.goodyear.com/dw/image/v2/BJQJ_PRD/on/demandware.static/-/Sites-Goodyear-Library/default/dw0106490d/GY/category-Page/hero-assurance.png?sw=720&sh=816&q=85&sm=fit', 'passeio', false, false, 596.1),
    ('BFGoodrich', 'Advantage', '185', '70', '14', '88', 'H', 459.90, 542.68, 28, 'https://storage.googleapis.com/tireclick/llantas/BFGOODRICHADVANTAGETOURING_COSTADO.jpg', 'passeio', false, false, 614.6),
    ('Formula', 'Energy', '195', '55', '14', '85', 'V', 410.90, 484.86, 35, 'https://www.tire-reviews.com/images/tyres/Formula-Formula-Energy.jpg', 'passeio', false, false, 570.1),
    ('Cooper', 'CS3 Touring', '195', '60', '14', '86', 'H', 450.90, 532.06, 42, 'https://images.simpletire.com/images/q_auto/line-images/8525/8525-sidetread/cooper-cs3-touring.png', 'passeio', false, false, 589.6),
    ('Bridgestone', 'Ecopia EP150', '195', '65', '14', '89', 'H', 500.90, 591.06, 49, 'https://assets.bridgestonetire.com/content/dam/consumer/bst/shared/tires/ecopia-ep150/tilted.png', 'passeio', false, false, 609.1),
    ('Maxxis', 'Bravo', '205', '70', '14', '95', 'T', 506.90, 598.14, 56, 'https://trucktirereviews.com/wp-content/uploads/2018/09/maxxis-bravo-at-771.jpg', 'suv', false, false, 642.6),
    ('Atlas', 'Green 4S', '185', '60', '15', '84', 'H', 404.90, 477.78, 14, 'https://padangos123.lt/images/galleries/1579092963_atlas-green-4s.jpg', 'passeio', false, false, 603.0),
    ('Ceat', 'EcoDrive', '185', '65', '15', '88', 'H', 419.90, 495.48, 21, 'https://www.pneus.org/offers/pneu-ceat-ecodrive.jpg', 'passeio', false, false, 621.5),
    ('Hankook', 'Ventus Prime3', '195', '55', '15', '85', 'V', 550.90, 650.06, 28, 'https://asset.hankooktire.com/content/dam/hankooktire/eu/product/pcr/k115/d_Keyvisual(export).jpg', 'passeio', false, false, 595.5),
    ('Barum', 'Bravuris 5HM', '195', '60', '15', '88', 'H', 460.90, 543.86, 35, 'https://www.barum.com.br/car/tyres/bravuris-5hm/_jcr_content/root/container/carousel_copy_copy_c/image_145245394.coreimg.png/1683651540694/barum--bravuris-5hm--productpicture--60--zz-stat-dim--195-65-r-15.png', 'passeio', false, false, 615.0),
    ('Michelin', 'Primacy 4', '195', '65', '15', '91', 'H', 640.90, 756.26, 42, 'https://dxm.contentcenter.michelin.com/api/wedia/dam/transform/b98rpyxf61b4xoqtwah1dw5zzh/4w-496_3528701126869_tire_michelin_primacy-all-season_235-slash-55-r19-101h_a_main_4-90_nopad.webp?t=resize&height=500', 'passeio', false, true, 634.5),
    ('Onyx', 'NY-806', '195', '65', '15', '91', 'H', 415.90, 490.76, 49, 'https://www.pneustiktak.com.br/wp-content/uploads/2024/03/ONYX-NY-806.jpg', 'passeio', false, true, 634.5),
    ('Goodyear', 'EfficientGrip', '205', '60', '15', '91', 'H', 566.90, 668.94, 56, 'https://www.goodyear.com.my/wp-content/uploads/EfficientGrip-2-min.png', 'passeio', false, false, 627.0),
    ('Continental', 'PowerContact 2', '205', '65', '15', '94', 'H', 601.90, 710.24, 14, 'https://www.continental-tires.com/adobe/dynamicmedia/deliver/dm-aid--6d1a8a72-dc5f-42eb-b984-181dcd0be2d0/2018-05-18-power-contact-2-picture.png?preferwebp=true&quality=85', 'passeio', false, false, 647.5),
    ('Cooper', 'Discoverer HTS', '215', '65', '15', '96', 'H', 667.90, 788.12, 21, 'https://www.coopertire.com/dw/image/v2/BJQJ_PRD/on/demandware.static/-/Sites-goodyear-master-catalog/default/dw1a706e1d/images/large/Discoverer_HT3_Side_24488.png?sw=900&sh=800&sm=fit&sfrm=jpg', 'suv', false, false, 660.5),
    ('BFGoodrich', 'Trail Terrain', '225', '70', '15', '100', 'T', 718.90, 848.30, 28, 'https://rerev.com/wp-content/uploads/BFGoodrich-Trail-Terrain-review.jpg', 'suv', false, false, 696.0),
    ('Kelly', 'Edge Touring', '195', '55', '16', '87', 'V', 620.90, 732.66, 35, 'https://www.goodyear.lat/images/tread/02005053344.png', 'passeio', false, false, 620.9),
    ('Firestone', 'F-600', '205', '55', '16', '91', 'V', 661.90, 781.04, 42, 'https://assets.firestonetire.com/content/dam/consumer/fst/shared/tires/f-series-f-600/tilted.jpg', 'passeio', false, true, 631.9),
    ('Bridgestone', 'Turanza ER300', '205', '55', '16', '91', 'V', 746.90, 881.34, 49, 'https://www.bridgestone.co.id/content/dam/bridgestone/consumer/bst/tires/models/turanza-er300/tilted.jpg/_jcr_content/renditions/cq5dam.web.1280.1280.jpeg', 'passeio', false, true, 631.9),
    ('Goodyear', 'EfficientGrip Performance', '205', '60', '16', '92', 'V', 701.90, 828.24, 56, 'https://www.goodyear.com.my/wp-content/uploads/EfficientGrip-2-min.png', 'passeio', false, false, 652.4),
    ('General Tire', 'Altimax One S', '205', '65', '16', '95', 'H', 651.90, 769.24, 14, 'https://www.generaltire-tyres.com/content/dam/conti-secondline-brands/generaltire/central-content/plt/factsheets/GENERALTIRES_AltimaxOne_PDF_EN_PLT.pdf/_jcr_content/renditions/cq5dam.web.1280.1280.jpeg', 'passeio', false, false, 672.9),
    ('Kumho', 'Ecsta HS52', '215', '55', '16', '93', 'V', 672.90, 794.02, 21, 'https://www.kumhotire.si/wp-content/uploads/2023/05/Kumho_GUT_Ecsta-HS52_AB102022_EN.png', 'passeio', false, false, 642.9),
    ('Hankook', 'Ventus Prime4', '215', '60', '16', '95', 'V', 702.90, 829.42, 28, 'https://asset.hankooktire.com/content/dam/hankooktire/vn/test-result/k135/Hankookprime4-k135_en.jpg', 'passeio', false, false, 664.4),
    ('Maxxis', 'Premitra HP5', '215', '65', '16', '98', 'H', 642.90, 758.62, 35, 'https://maxxis.pk/wp-content/uploads/2021/02/hp5-1.webp', 'passeio', false, false, 685.9),
    ('Continental', 'PremiumContact 6', '225', '50', '16', '92', 'W', 798.90, 942.70, 42, 'https://continentaltire.com/sites/default/files/styles/square_medium/public/media/image/2024-08/ct_webpage_premiumcontact6_sw_600x600_oe.png?itok=vYoMbTcH', 'passeio', false, false, 631.4),
    ('Pirelli', 'Cinturato P7', '225', '55', '16', '95', 'V', 798.90, 942.70, 49, 'https://tyre-assets.pirelli.com/dynamic_engine/assets/global/Cinturato-P7-1505470083092.png', 'passeio', false, false, 654.4),
    ('Bridgestone', 'Dueler H/P Sport', '235', '60', '16', '100', 'H', 869.90, 1026.48, 56, 'https://assets.bridgestonetire.com/content/dam/consumer/bst/shared/tires/dueler-hp-sport/front.jpg', 'suv', false, false, 688.4),
    ('Formula', 'Energy Plus', '205', '50', '17', '89', 'V', 751.90, 887.24, 14, 'https://www.tire-reviews.com/images/tyres/Formula-Formula-Energy.jpg', 'passeio', false, false, 637.8),
    ('Kelly', 'Edge Sport', '215', '50', '17', '91', 'V', 782.90, 923.82, 21, 'https://www.goodyear.lat/images/tread/02005053342.png', 'passeio', false, false, 647.8),
    ('Atlas', 'Sport Green 2', '215', '55', '17', '94', 'V', 722.90, 853.02, 28, 'https://www.tire-reviews.com/images/tyres/Atlas-Sport-Green-2.jpg', 'passeio', false, false, 668.3),
    ('Kumho', 'Ecowing ES31', '225', '45', '17', '91', 'W', 833.90, 984.00, 35, 'https://www.kumho.co.za/img/ecowing_es31-2.c4627ee2.webp', 'passeio', false, true, 634.3),
    ('Itaro', 'IT301', '225', '45', '17', '91', 'W', 773.90, 913.20, 42, 'https://i0.wp.com/itaro.com.br/wp-content/uploads/2021/04/IT301.png?fit=571%2C662&ssl=1&is-pending-load=1', 'passeio', false, true, 634.3),
    ('Pirelli', 'Cinturato P7', '225', '45', '17', '91', 'W', 938.90, 1107.90, 49, 'https://tyre-assets.pirelli.com/dynamic_engine/assets/global/Cinturato-P7-1505470083092.png', 'passeio', false, true, 634.3),
    ('Kelly', 'Edge Sport', '225', '45', '17', '91', 'W', 823.90, 972.20, 56, 'https://www.goodyear.lat/images/tread/02005053342.png', 'passeio', false, true, 634.3),
    ('Bridgestone', 'Turanza T005', '225', '45', '17', '91', 'W', 1068.90, 1261.30, 14, 'https://assets.bridgestonetire.com/content/dam/consumer/bst/shared/tires/turanza-t005/front.png', 'passeio', true, true, 634.3),
    ('Goodyear', 'Eagle Touring', '225', '50', '17', '94', 'V', 863.90, 1019.40, 21, 'https://www.goodyear.lat/images/perspective/01005053097.jpg', 'passeio', false, false, 656.8),
    ('Continental', 'ContiPowerContact', '225', '55', '17', '97', 'V', 898.90, 1060.70, 28, 'https://continentaltire.com/sites/default/files/styles/square_medium/public/media/image/2020-05/cont-procontact-p_4894_0.png?itok=bd_6tyBv', 'passeio', false, false, 679.3),
    ('Firestone', 'Firehawk 900', '235', '45', '17', '94', 'W', 864.90, 1020.58, 35, 'https://assets.firestonetire.com/content/dam/consumer/fst/shared/tires/firehawk-900-/tilted.jpg', 'passeio', false, false, 643.3),
    ('Cooper', 'Evolution CTT', '235', '55', '17', '99', 'V', 964.90, 1138.58, 42, 'https://www.coopertires.com.au/wp-content/uploads/2022/02/CTT-Featured-Image-700x460px.png', 'suv', false, false, 690.3),
    ('Hankook', 'Ventus S1 evo3', '245', '45', '17', '99', 'W', 905.90, 1068.96, 49, 'https://asset.hankooktire.com/content/dam/hankooktire/br/product/pcr/k127e/d_Keyvisual1-1.jpg', 'passeio', false, false, 652.3),
    ('BFGoodrich', 'All-Terrain T/A KO2', '265', '65', '17', '112', 'S', 1032.90, 1218.82, 56, 'https://cdn-fastly.autoguide.com/media/2023/11/21/15352/bfgoodrich-all-terrain-t-a-ko2-tire-review.jpg?size=720x845&nocrop=1', 'caminhonete', false, true, 776.3),
    ('Kumho', 'Ecsta PS71', '215', '45', '18', '93', 'W', 942.90, 1112.62, 14, 'https://www.tire-reviews.com/images/tyres/Kumho-Ecsta-PS71.png', 'passeio', false, false, 650.7),
    ('Bridgestone', 'Potenza Sport', '225', '40', '18', '92', 'Y', 1058.90, 1249.50, 21, 'https://assets.bridgestonetire.com/content/dam/consumer/bst/shared/tires/potenza-sport-as/front.jpg', 'passeio', false, false, 637.2),
    ('Goodyear', 'Eagle F1 Asymmetric', '225', '45', '18', '95', 'W', 1013.90, 1196.40, 28, 'https://www.goodyear.lat/images/perspective/01005053045.png', 'passeio', false, false, 659.7),
    ('Pirelli', 'P Zero', '235', '40', '18', '95', 'Y', 1089.90, 1286.08, 35, 'https://tyre24.pirelli.com/dynamic_engine/assets/global/Pzero-Nuovo-1505470072726.png', 'passeio', false, false, 645.2),
    ('Continental', 'ExtremeContact DWS06', '235', '45', '18', '98', 'W', 1069.90, 1262.48, 42, 'https://continentaltire.com/sites/default/files/styles/og_image/public/media/image/2021-01/CT21_ExtremeContactDWS06_Plus_1440x810_Marquee_2Artboard%203_1.jpg?itok=27ZqP5sL', 'passeio', false, false, 668.7),
    ('Hankook', 'Ventus S1 evo2 SUV', '235', '50', '18', '101', 'V', 1079.90, 1274.28, 49, 'https://asset.hankooktire.com/content/dam/hankooktire/au/product/suv/k137a/f/Contents_F_1-1015.jpg', 'suv', false, false, 692.2),
    ('Firestone', 'Firehawk Indy 500', '245', '40', '18', '97', 'Y', 1015.90, 1198.76, 56, 'https://assets.firestonetire.com/content/dam/consumer/fst/shared/tires/firehawk-indy-500/tilted.jpg', 'passeio', false, false, 653.2),
    ('Cooper', 'Zeon RS3-G1', '245', '45', '18', '100', 'W', 1050.90, 1240.06, 14, 'https://www.coopertire.ca/dw/image/v2/BJQJ_PRD/on/demandware.static/-/Sites-goodyear-master-catalog/default/dw3bc8e2cb/images/large/Zeon_RS3_G1_24508.png?sw=900&sh=800&sm=fit&sfrm=png', 'passeio', false, false, 677.7),
    ('Michelin', 'Primacy SUV+', '255', '45', '18', '103', 'Y', 1256.90, 1483.14, 21, 'https://dxm.contentcenter.michelin.com/api/wedia/dam/transform/b98rpyxf61b4qpngb9qrfxmeia/4w-989_3528702273791_tire_michelin_primacy-suv-plus_235-slash-60-r18-103v_a_main_5-quarterzoom_nopad.webp?t=resize&height=500', 'suv', false, true, 686.7),
    ('Bridgestone', 'Dueler A/T 001', '265', '60', '18', '110', 'T', 1182.90, 1395.82, 28, 'https://www.bridgestone.co.id/content/dam/bridgestone/consumer/bst/apac/th/Tires/Dueler/at_002/Dueler-AT002_side_resized.jpg', 'caminhonete', false, true, 775.2)

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
    ARRAY[
      format('Medida %s/%sR%s', width, profile, diameter),
      format('Diametro Externo %s mm', round(diameter_mm::numeric, 1)),
      format('Aro %s', diameter),
      format('Indice de Carga %s', load_index),
      format('Indice de Velocidade %s', speed_rating)
    ]::text[] AS features,
    category,
    'all-season'::text AS season,
    runflat,
    featured,
    format(
      '%s %s %s/%sR%s. Diametro externo aproximado: %s mm. Aplicacao: %s.',
      brand,
      model,
      width,
      profile,
      diameter,
      round(diameter_mm::numeric, 1),
      CASE
        WHEN category = 'caminhonete' THEN 'caminhonete/pick-up'
        WHEN category = 'suv' THEN 'SUV/4x4'
        ELSE 'passeio'
      END
    ) AS description
  FROM source_products
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

-- Verificacoes rapidas
SELECT COUNT(*) AS total_produtos_ativos
FROM products
WHERE deleted_at IS NULL;

SELECT diameter AS aro, COUNT(*) AS quantidade
FROM products
WHERE deleted_at IS NULL
  AND diameter IN ('13','14','15','16','17','18')
GROUP BY diameter
ORDER BY diameter::int;

-- ============================================================
-- CARGA COMPLEMENTAR: LISTA PNEUSTORE (CSV)
-- Fonte: C:/Users/Windows/Documents/lista_pneus_pneustore.csv
-- Observacao: preco e estoque nao vieram no CSV; valores iniciais definidos.
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
)
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
  AND p.diameter = s.diameter;

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
