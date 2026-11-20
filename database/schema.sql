CREATE DATABASE Batloung_Farm_Distributers;
USE Batloung_Farm_Distributers;

CREATE TABLE suppliers (
  supplier_id INT AUTO_INCREMENT PRIMARY KEY,
  business_name VARCHAR(100) NOT NULL UNIQUE,
  contact_person VARCHAR(80) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  province ENUM('Gauteng','Free State','KwaZulu-Natal','Western Cape','Eastern Cape','Limpopo','Mpumalanga','North West') NOT NULL,
  address VARCHAR(200) NOT NULL
);
CREATE TABLE fruits (
  fruit_id INT AUTO_INCREMENT PRIMARY KEY,
  fruit_name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE'
);
CREATE TABLE vendors (
  vendor_id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  location VARCHAR(100) NOT NULL,
  registration_date DATE NOT NULL DEFAULT (CURRENT_DATE)
);
CREATE TABLE purchases (
  purchase_id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL,
  purchase_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);
CREATE TABLE purchase_details (
  purchase_detail_id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT NOT NULL,
  fruit_id INT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost > 0),
  packaging_size ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchases(purchase_id) ON DELETE CASCADE,
  FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id)
);
CREATE TABLE sales (
  sale_id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  sale_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_status ENUM('PAID','PARTIALLY_PAID','UNPAID') NOT NULL DEFAULT 'UNPAID',
  payment_method ENUM('CASH','MOBILE_MONEY','CREDIT') NOT NULL DEFAULT 'CREDIT',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
);
CREATE TABLE sales_details (
  sales_detail_id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  fruit_id INT NOT NULL,
  packaging_size ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
  FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE,
  FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id)
);
-- One row per fruit AND packaging size; selling_price differs per size
CREATE TABLE stock (
  stock_id INT AUTO_INCREMENT PRIMARY KEY,
  fruit_id INT NOT NULL,
  packaging_size ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  available_quantity INT NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
  selling_price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  UNIQUE (fruit_id, packaging_size),
  FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id)
);

INSERT INTO suppliers (business_name,contact_person,phone,province,address) VALUES
('Highveld Orchards','Pieter van Wyk','+27 82 555 0101','Free State','Farm 12, Bethlehem'),
('Cape Sun Growers','Aisha Daniels','+27 83 555 0142','Western Cape','7 Vine Rd, Paarl'),
('Tropic Valley Farms','Sipho Dlamini','+27 71 555 0177','Limpopo','Plot 4, Tzaneen'),
('Natal Fresh Produce','Thandi Zulu','+27 84 555 0190','KwaZulu-Natal','22 Mill St, Pietermaritzburg');
INSERT INTO fruits (fruit_name,description) VALUES
('Apples','Crisp red apples'),('Bananas','Sweet ripe bananas'),('Oranges','Juicy navel oranges'),
('Mangoes','Tropical mangoes'),('Grapes','Seedless table grapes');
INSERT INTO vendors (vendor_name,phone,location,registration_date) VALUES
('Mpho Street Fruits','+266 5800 1111','Maseru Central','2026-01-15'),
('Lerato Fresh Stall','+266 5800 2222','Maseru West','2026-02-03'),
('Tebello Market','+266 5800 3333','Roma','2026-03-20'),
('Nthabiseng Veg & Fruit','+266 5800 4444','Mafeteng','2026-04-11');
INSERT INTO stock (fruit_id,packaging_size,available_quantity,selling_price)
SELECT f.fruit_id, s.sz,
  CASE WHEN f.fruit_id=5 AND s.sz='LARGE' THEN 4 ELSE 20+f.fruit_id*5 END,
  CASE s.sz WHEN 'SMALL' THEN 120 WHEN 'MEDIUM' THEN 200 ELSE 320 END
FROM fruits f CROSS JOIN (SELECT 'SMALL' sz UNION SELECT 'MEDIUM' UNION SELECT 'LARGE') s;
INSERT INTO purchases (supplier_id,purchase_date,total_amount) VALUES (1,'2026-11-01 09:00',7000),(3,'2026-11-05 10:30',5600);
INSERT INTO purchase_details (purchase_id,fruit_id,quantity,unit_cost,packaging_size) VALUES
(1,1,20,200,'LARGE'),(1,1,30,100,'MEDIUM'),(2,4,20,180,'LARGE'),(2,2,40,50,'SMALL');
INSERT INTO sales (vendor_id,sale_date,payment_status,payment_method,total_amount,amount_paid) VALUES
(1,'2026-11-10 08:00','PAID','CASH',1000,1000),(2,'2026-11-12 11:00','PARTIALLY_PAID','MOBILE_MONEY',1360,500),
(3,'2026-11-15 14:00','UNPAID','CREDIT',720,0),(1,'2026-11-18 09:30','PAID','MOBILE_MONEY',1240,1240);
INSERT INTO sales_details (sale_id,fruit_id,packaging_size,quantity,unit_price) VALUES
(1,1,'LARGE',2,320),(1,2,'SMALL',3,120),(2,4,'LARGE',3,320),(2,3,'MEDIUM',2,200),
(3,5,'MEDIUM',2,200),(3,2,'LARGE',1,320),(4,1,'MEDIUM',4,200),(4,3,'SMALL',2,120),(4,4,'LARGE',1,320);
