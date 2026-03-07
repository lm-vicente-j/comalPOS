CREATE TABLE `bill` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `description` text,
  `amount` float,
  `category` varchar(255),
  `date` date,
  `registered_by` int
);

CREATE TABLE `customer` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `customerName` varchar(255),
  `phone` varchar(255),
  `alias` varchar(255),
  `lastConsumption` date,
  `currentBalance` float,
  `registeredDate` date
);

CREATE TABLE `debtors` (
  `id` int PRIMARY KEY,
  `saleID` int,
  `customerID` int,
  `amount` float,
  `status` varchar(255)
);

CREATE TABLE `products` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255),
  `price` float
);

CREATE TABLE `recipes` (
  `productID` int,
  `supplyID` int,
  `quantityUsed` decimal,
  PRIMARY KEY (`productID`, `supplyID`)
);

CREATE TABLE `salary` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `userID` int,
  `amount` float,
  `payDate` date,
  `period` varchar(255)
);

CREATE TABLE `sale_items` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `saleID` int,
  `productID` int,
  `quantity` int,
  `unitPrice` float,
  `subtotal` float
);

CREATE TABLE `sales` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `total` decimal,
  `status` varchar(255),
  `source_type` varchar(255),
  `customerID` int,
  `placedBy` int,
  `createdAt` timestamp DEFAULT (now())
);

CREATE TABLE `supplies` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255),
  `measureUnit` varchar(255),
  `currentStock` float,
  `unitCost` float DEFAULT 0
);

CREATE TABLE `user` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `email` varchar(255),
  `name` varchar(255),
  `username` varchar(255),
  `pin` varchar(255),
  `password` varchar(255),
  `role` varchar(255),
  `active` boolean
);

ALTER TABLE `bill` ADD FOREIGN KEY (`registered_by`) REFERENCES `user` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `debtors` ADD FOREIGN KEY (`customerID`) REFERENCES `customer` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `debtors` ADD FOREIGN KEY (`saleID`) REFERENCES `sales` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `recipes` ADD FOREIGN KEY (`productID`) REFERENCES `products` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `recipes` ADD FOREIGN KEY (`supplyID`) REFERENCES `supplies` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `salary` ADD FOREIGN KEY (`userID`) REFERENCES `user` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `sale_items` ADD FOREIGN KEY (`productID`) REFERENCES `products` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `sale_items` ADD FOREIGN KEY (`saleID`) REFERENCES `sales` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `sales` ADD FOREIGN KEY (`customerID`) REFERENCES `customer` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `sales` ADD FOREIGN KEY (`placedBy`) REFERENCES `user` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
