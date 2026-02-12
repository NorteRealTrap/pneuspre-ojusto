-- ============================================
-- EXEMPLOS DE PRODUTOS PARA INSERIR
-- ============================================
-- Execute este SQL no Supabase SQL Editor para adicionar produtos de teste
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Normaliza categorias e temporadas legadas ja inseridas
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

-- Pneus para passeio
INSERT INTO products (brand, model, width, profile, diameter, load_index, speed_rating, price, old_price, stock, image, features, category, season, runflat, featured, description)
VALUES
('Michelin', 'Pilot Sport 4', '225', '45', '17', '91', 'Y', 1299.90, 1599.90, 50, 'https://via.placeholder.com/400x300?text=Michelin+Pilot', ARRAY['Esportivo', 'Alto Desempenho', 'Aderencia'], 'passeio', 'summer', false, true, 'Pneu esportivo de alta performance para carros de passeio'),
('Pirelli', 'Cinturato P7', '205', '55', '16', '91', 'V', 899.90, 1099.90, 75, 'https://via.placeholder.com/400x300?text=Pirelli+Cinturato', ARRAY['Conforto', 'Durabilidade', 'Economia'], 'passeio', 'all-season', false, true, 'Pneu versatil para uso urbano e rodoviario'),
('Goodyear', 'EfficientGrip', '195', '65', '15', '91', 'H', 749.90, 899.90, 100, 'https://via.placeholder.com/400x300?text=Goodyear+Efficient', ARRAY['Economia', 'Conforto', 'Seguranca'], 'passeio', 'all-season', false, false, 'Pneu economico com excelente durabilidade'),
('Continental', 'EcoContact 6', '195', '65', '15', '91', 'H', 749.90, 899.90, 80, 'https://via.placeholder.com/400x300?text=Continental+Eco', ARRAY['Economia', 'Eco-friendly', 'Conforto'], 'passeio', 'all-season', false, false, 'Pneu economico e sustentavel'),
('Bridgestone', 'Turanza T005', '215', '60', '17', '96', 'H', 1099.90, 1299.90, 45, 'https://via.placeholder.com/400x300?text=Bridgestone+Turanza', ARRAY['Conforto', 'Seguranca', 'Durabilidade'], 'passeio', 'all-season', false, false, 'Pneu premium para conforto maximo'),
('Yokohama', 'Avid Ascend', '205', '55', '16', '91', 'V', 899.90, 1099.90, 60, 'https://via.placeholder.com/400x300?text=Yokohama+Avid', ARRAY['Conforto', 'Seguranca', 'Durabilidade'], 'passeio', 'all-season', false, false, 'Pneu de qualidade para uso geral');

-- Pneus para SUV e 4x4
INSERT INTO products (brand, model, width, profile, diameter, load_index, speed_rating, price, old_price, stock, image, features, category, season, runflat, featured, description)
VALUES
('Goodyear', 'Wrangler TrailRunner', '265', '70', '16', '112', 'S', 1599.90, 1899.90, 30, 'https://via.placeholder.com/400x300?text=Goodyear+Wrangler', ARRAY['Off-road', 'Tracao', 'Durabilidade'], 'suv', 'all-season', false, true, 'Pneu para SUV e 4x4 com excelente tracao'),
('Michelin', 'LTX M/S2', '265', '75', '16', '123', 'S', 1799.90, 2099.90, 25, 'https://via.placeholder.com/400x300?text=Michelin+LTX', ARRAY['Off-road', 'Carga Pesada', 'Durabilidade'], 'suv', 'all-season', false, true, 'Pneu robusto para SUV e caminhonetes'),
('Pirelli', 'Scorpion Verde', '235', '65', '17', '108', 'H', 1299.90, 1599.90, 40, 'https://via.placeholder.com/400x300?text=Pirelli+Scorpion', ARRAY['Conforto', 'Economia', 'Seguranca'], 'suv', 'all-season', false, false, 'Pneu versatil para SUV urbano'),
('Continental', 'CrossContact LX', '245', '70', '16', '111', 'S', 1499.90, 1799.90, 35, 'https://via.placeholder.com/400x300?text=Continental+Cross', ARRAY['Conforto', 'Tracao', 'Durabilidade'], 'suv', 'all-season', false, false, 'Pneu premium para SUV de luxo');

-- Pneus para caminhonete
INSERT INTO products (brand, model, width, profile, diameter, load_index, speed_rating, price, old_price, stock, image, features, category, season, runflat, featured, description)
VALUES
('Bridgestone', 'Dueler H/T 840', '265', '75', '16', '123', 'S', 1699.90, 1999.90, 20, 'https://via.placeholder.com/400x300?text=Bridgestone+Dueler', ARRAY['Carga Pesada', 'Durabilidade', 'Tracao'], 'caminhonete', 'all-season', false, true, 'Pneu LT para caminhonete com carga pesada'),
('Goodyear', 'Wrangler Workhorse', '245', '75', '16', '120', 'S', 1599.90, 1899.90, 28, 'https://via.placeholder.com/400x300?text=Goodyear+Workhorse', ARRAY['Carga Pesada', 'Durabilidade', 'Economia'], 'caminhonete', 'all-season', false, false, 'Pneu resistente para trabalho pesado'),
('Michelin', 'LTX A/T2', '265', '75', '16', '123', 'S', 1899.90, 2199.90, 22, 'https://via.placeholder.com/400x300?text=Michelin+LTX+AT', ARRAY['Off-road', 'Carga Pesada', 'Tracao'], 'caminhonete', 'all-season', false, false, 'Pneu all-terrain para caminhonete');

-- Pneus para van e utilitario
INSERT INTO products (brand, model, width, profile, diameter, load_index, speed_rating, price, old_price, stock, image, features, category, season, runflat, featured, description)
VALUES
('Bridgestone', 'Duravis R660', '205', '75', '16', '110', 'R', 899.90, 1099.90, 50, 'https://via.placeholder.com/400x300?text=Bridgestone+Duravis', ARRAY['Carga Pesada', 'Durabilidade', 'Economia'], 'van', 'all-season', false, true, 'Pneu comercial para van e utilitario'),
('Goodyear', 'Cargo Marathon', '215', '75', '16', '116', 'R', 999.90, 1199.90, 45, 'https://via.placeholder.com/400x300?text=Goodyear+Cargo', ARRAY['Carga Pesada', 'Durabilidade', 'Conforto'], 'van', 'all-season', false, false, 'Pneu para transporte comercial'),
('Continental', 'VanContact 100', '205', '75', '16', '110', 'R', 899.90, 1099.90, 40, 'https://via.placeholder.com/400x300?text=Continental+Van', ARRAY['Carga Pesada', 'Seguranca', 'Durabilidade'], 'van', 'all-season', false, false, 'Pneu premium para van comercial');

-- Pneus de inverno
INSERT INTO products (brand, model, width, profile, diameter, load_index, speed_rating, price, old_price, stock, image, features, category, season, runflat, featured, description)
VALUES
('Michelin', 'Alpin 5', '205', '55', '16', '91', 'H', 1199.90, 1499.90, 30, 'https://via.placeholder.com/400x300?text=Michelin+Alpin', ARRAY['Inverno', 'Seguranca', 'Tracao'], 'passeio', 'winter', false, true, 'Pneu de inverno com excelente tracao em neve'),
('Pirelli', 'Winter Sottozero 3', '205', '55', '16', '91', 'H', 1299.90, 1599.90, 25, 'https://via.placeholder.com/400x300?text=Pirelli+Winter', ARRAY['Inverno', 'Seguranca', 'Conforto'], 'passeio', 'winter', false, false, 'Pneu de inverno premium para seguranca maxima');

-- Pneus com RunFlat
INSERT INTO products (brand, model, width, profile, diameter, load_index, speed_rating, price, old_price, stock, image, features, category, season, runflat, featured, description)
VALUES
('Bridgestone', 'Turanza RFT', '225', '45', '17', '91', 'Y', 1599.90, 1899.90, 15, 'https://via.placeholder.com/400x300?text=Bridgestone+RFT', ARRAY['RunFlat', 'Seguranca', 'Performance'], 'passeio', 'all-season', true, true, 'Pneu RunFlat que continua rodando mesmo furado'),
('Michelin', 'Pilot Sport 4S RFT', '245', '40', '18', '97', 'Y', 1899.90, 2199.90, 12, 'https://via.placeholder.com/400x300?text=Michelin+RFT', ARRAY['RunFlat', 'Esportivo', 'Performance'], 'passeio', 'summer', true, false, 'Pneu esportivo RunFlat de alta performance');

-- Verificar produtos inseridos
SELECT COUNT(*) as total_produtos FROM products;
SELECT brand, model, category, price FROM products ORDER BY category, brand;
