const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// ---------------------------------------------------------------------------
// Connection pool
// ---------------------------------------------------------------------------
// Configured entirely from environment variables so the same code runs
// locally and in any deployment environment without code changes.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pawtrack',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // return DATE/DATETIME as strings, matching the old sqlite string-based reads the routes expect
});

// ---------------------------------------------------------------------------
// Schema (FROZEN — see project notes). 9 tables, created in FK-dependency
// order: users -> animals -> (sightings, medical_records, foster_placements)
// -> adoption_requests -> donation_drives -> donations -> expenses.
//
// All tables use InnoDB (MySQL 8 default engine, and the only engine that
// enforces foreign keys), utf8mb4 for full Unicode support.
// ---------------------------------------------------------------------------

const CREATE_USERS = `
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','moderator') NOT NULL DEFAULT 'user',
  phone VARCHAR(20),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const CREATE_ANIMALS = `
CREATE TABLE IF NOT EXISTS animals (
  animal_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150),
  species VARCHAR(50) NOT NULL,
  breed VARCHAR(100),
  age INT,
  gender VARCHAR(20),
  current_status ENUM('reported','under_care','fostered','available','adopted') NOT NULL DEFAULT 'reported',
  image_path VARCHAR(255),
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_animals_age CHECK (age IS NULL OR age >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const CREATE_SIGHTINGS = `
CREATE TABLE IF NOT EXISTS sightings (
  sighting_id INT AUTO_INCREMENT PRIMARY KEY,
  animal_id INT NOT NULL,
  reported_by INT,
  location VARCHAR(255) NOT NULL,
  notes TEXT,
  reported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by INT,
  verified_at DATETIME,
  assigned_to INT,
  assigned_at DATETIME,
  CONSTRAINT fk_sightings_animal FOREIGN KEY (animal_id) REFERENCES animals(animal_id) ON DELETE RESTRICT,
  CONSTRAINT fk_sightings_reported_by FOREIGN KEY (reported_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_sightings_verified_by FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_sightings_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const CREATE_MEDICAL_RECORDS = `
CREATE TABLE IF NOT EXISTS medical_records (
  record_id INT AUTO_INCREMENT PRIMARY KEY,
  animal_id INT NOT NULL,
  recorded_by INT,
  record_type ENUM('checkup','treatment','vaccination') NOT NULL,
  condition_notes TEXT,
  vet_name VARCHAR(150),
  record_date DATE NOT NULL,
  vaccine_name VARCHAR(150),
  next_due_date DATE,
  CONSTRAINT fk_medical_animal FOREIGN KEY (animal_id) REFERENCES animals(animal_id) ON DELETE RESTRICT,
  CONSTRAINT fk_medical_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const CREATE_FOSTER_PLACEMENTS = `
CREATE TABLE IF NOT EXISTS foster_placements (
  placement_id INT AUTO_INCREMENT PRIMARY KEY,
  animal_id INT NOT NULL,
  foster_user_id INT,
  start_date DATE NOT NULL,
  end_date DATE,
  status ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
  CONSTRAINT fk_foster_animal FOREIGN KEY (animal_id) REFERENCES animals(animal_id) ON DELETE RESTRICT,
  CONSTRAINT fk_foster_user FOREIGN KEY (foster_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT chk_foster_dates CHECK (end_date IS NULL OR end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const CREATE_ADOPTION_REQUESTS = `
CREATE TABLE IF NOT EXISTS adoption_requests (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  animal_id INT NOT NULL,
  user_id INT NOT NULL,
  reviewed_by INT,
  reason TEXT NOT NULL,
  phone VARCHAR(20),
  address VARCHAR(255),
  experience VARCHAR(10),
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  handover_date DATE,
  CONSTRAINT fk_adoption_animal FOREIGN KEY (animal_id) REFERENCES animals(animal_id) ON DELETE RESTRICT,
  CONSTRAINT fk_adoption_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_adoption_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const CREATE_DONATION_DRIVES = `
CREATE TABLE IF NOT EXISTS donation_drives (
  drive_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  target_amount DECIMAL(12,2) NOT NULL,
  deadline DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INT,
  animal_id INT,
  photo_path VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_drives_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_drives_animal FOREIGN KEY (animal_id) REFERENCES animals(animal_id) ON DELETE SET NULL,
  CONSTRAINT chk_drives_target CHECK (target_amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const CREATE_DONATIONS = `
CREATE TABLE IF NOT EXISTS donations (
  donation_id INT AUTO_INCREMENT PRIMARY KEY,
  drive_id INT NOT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  donated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('completed','simulated') NOT NULL DEFAULT 'simulated',
  CONSTRAINT fk_donations_drive FOREIGN KEY (drive_id) REFERENCES donation_drives(drive_id) ON DELETE RESTRICT,
  CONSTRAINT fk_donations_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
  CONSTRAINT chk_donations_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const CREATE_EXPENSES = `
CREATE TABLE IF NOT EXISTS expenses (
  expense_id INT AUTO_INCREMENT PRIMARY KEY,
  drive_id INT NOT NULL,
  recorded_by INT,
  medical_record_id INT,
  description VARCHAR(255),
  amount DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL,
  category ENUM('medical','food','shelter','other') NOT NULL,
  CONSTRAINT fk_expenses_drive FOREIGN KEY (drive_id) REFERENCES donation_drives(drive_id) ON DELETE RESTRICT,
  CONSTRAINT fk_expenses_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_expenses_medical_record FOREIGN KEY (medical_record_id) REFERENCES medical_records(record_id) ON DELETE SET NULL,
  CONSTRAINT chk_expenses_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

// Order matters: each table only references tables created before it.
const TABLE_STATEMENTS = [
  ['users', CREATE_USERS],
  ['animals', CREATE_ANIMALS],
  ['sightings', CREATE_SIGHTINGS],
  ['medical_records', CREATE_MEDICAL_RECORDS],
  ['foster_placements', CREATE_FOSTER_PLACEMENTS],
  ['adoption_requests', CREATE_ADOPTION_REQUESTS],
  ['donation_drives', CREATE_DONATION_DRIVES],
  ['donations', CREATE_DONATIONS],
  ['expenses', CREATE_EXPENSES],
];

// ---------------------------------------------------------------------------
// Seed data — adapted from the original CampusPaws db.js seed pattern.
// Posts/post_likes seeding is dropped entirely (those tables no longer exist).
// ---------------------------------------------------------------------------

async function seedUsers(conn) {
  const [[adminRow]] = await conn.query(`SELECT user_id FROM users WHERE email = ?`, ['admin@campuspaws.test']);
  if (!adminRow) {
    const hash = bcrypt.hashSync('Admin@123', 12);
    await conn.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'moderator')`,
      ['Campus Admin', 'admin@campuspaws.test', hash]
    );
  }

  const [[demoRow]] = await conn.query(`SELECT user_id FROM users WHERE email = ?`, ['demo@student.test']);
  if (!demoRow) {
    const hash = bcrypt.hashSync('Demo@123', 10);
    await conn.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')`,
      ['Alex Student', 'demo@student.test', hash]
    );
  }
}

async function seedAnimals(conn) {
  const [[{ cnt }]] = await conn.query(`SELECT COUNT(*) AS cnt FROM animals`);
  if (cnt > 0) return;

  // current_status is derived from the old health_status/vaccination_status/
  // up_for_adoption fields, which no longer exist in the frozen schema:
  //   "Cannot be adopted" (needs treatment)  -> under_care
  //   "Up for adoption"                       -> available
  //   "Adopted"                               -> adopted
  const animals = [
    ['Milo', 'dog', 'Golden Retriever', 2, 'Male', 'available', '/uploads/milo.jpg', 'Milo is a friendly and playful golden boy who loves fetch and cuddles. Found near the main library.'],
    ['Luna', 'cat', 'Persian', 1, 'Female', 'available', '/uploads/luna.jpg', 'Luna is a gentle Persian princess with the most expressive eyes. She loves sunny windowsills.'],
    ['Bruno', 'dog', 'Labrador', 4, 'Male', 'under_care', '/uploads/bruno.jpeg', 'Bruno is currently receiving medical treatment. He is friendly but needs care before adoption.'],
    ['Simba', 'cat', 'Siamese', 3, 'Male', 'adopted', '/uploads/Simba.webp', 'Simba found his forever home! He was a chatty, affectionate Siamese who loved attention.'],
    ['Choco', 'dog', 'Doodle', 1, 'Female', 'available', '/uploads/choco.jpg', 'Choco is an energetic doodle puppy who loves to run and play. Very social with people.'],
    ['Sheru', 'dog', 'Indian Pariah', 3, 'Male', 'available', '/uploads/sheru.webp', 'Sheru is the classic campus dog — loyal, smart, and incredibly affectionate once he trusts you.'],
    ['Bella', 'cat', 'Mixed', 2, 'Female', 'available', '/uploads/bella.jpg', 'Bella is a sweet mixed breed cat who loves chin scratches and sleeping in warm spots.'],
    ['Charlie', 'dog', 'Beagle', 5, 'Male', 'under_care', '/uploads/charlie.jpg', 'Charlie needs ongoing treatment for a leg injury. Not available for adoption yet.'],
    ['Rocky', 'dog', 'Bulldog', 4, 'Male', 'available', '/uploads/rocky.jpg', 'Rocky is a calm, lovable bulldog who gets along well with everyone. Low energy, high affection.'],
    ['Moti', 'dog', 'Pomeranian', 1, 'Male', 'available', '/uploads/moti.jpg', 'Moti is a tiny ball of fluff with enormous personality. He will steal your heart immediately.'],
    ['Nala', 'cat', 'Ragdoll', 2, 'Female', 'available', '/uploads/nala.jpg', 'Nala is a gorgeous ragdoll cat who goes limp with affection when you pick her up.'],
    ['Raja', 'dog', 'German Shepherd', 6, 'Male', 'under_care', '/uploads/Raja.avif', 'Raja is a senior shepherd being treated for arthritis. He deserves so much love.'],
    ['Maya', 'cat', 'Bombay', 2, 'Female', 'available', '/uploads/maya.jpg', 'Maya is a sleek black cat with bright golden eyes. She is curious and playful.'],
    ['Cooper', 'dog', 'Dachshund', 3, 'Male', 'available', '/uploads/cooper.jpg', 'Cooper the Dachshund is brave despite his short legs. He loves exploring every corner of campus.'],
    ['Ginger', 'cat', 'Maine Coon', 2, 'Female', 'available', '/uploads/ginger.png', 'Ginger is a fluffy Maine Coon who loves being brushed and sitting on laps during study sessions.'],
    ['Sparky', 'dog', 'Pug', 2, 'Male', 'available', '/uploads/sparky.jpg', 'Sparky is the happiest pug on campus. His wrinkled face and curly tail will make your day.'],
    ['Buddy', 'dog', 'Golden Retriever', 3, 'Male', 'available', '/uploads/buddy.jpg', 'Buddy is a certified good boy. He is trained, gentle, and absolutely loves children.'],
    ['Tiger', 'dog', 'Mixed', 2, 'Male', 'available', '/uploads/tiger.avif', 'Tiger got his name for his bold stripes. He is playful, energetic, and loves tug-of-war.'],
    ['Zara', 'cat', 'Oriental', 2, 'Female', 'available', '/uploads/zara.webp', 'Zara is an elegant Oriental cat with large ears and a slim figure. Very affectionate.'],
    ['Juno', 'cat', 'Ragdoll', 1, 'Female', 'available', '/uploads/juno.avif', 'Juno is a baby ragdoll kitten with the most striking blue eyes. She loves to cuddle.'],
  ];

  const sql = `INSERT INTO animals (name, species, breed, age, gender, current_status, image_path, description)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  for (const a of animals) {
    await conn.query(sql, a);
  }
}

async function seedDonationDrives(conn) {
  const [[{ cnt }]] = await conn.query(`SELECT COUNT(*) AS cnt FROM donation_drives`);
  if (cnt > 0) return;

  // raised_amount is intentionally NOT seeded/stored — it is always computed
  // at query time as SUM(donations.amount) for the drive (see donations route).
  const [[admin]] = await conn.query(`SELECT user_id FROM users WHERE email = ?`, ['admin@campuspaws.test']);
  const createdBy = admin ? admin.user_id : null;

  await conn.query(
    `INSERT INTO donation_drives (title, description, target_amount, deadline, is_active, created_by, photo_path) VALUES
     (?, ?, ?, ?, ?, ?, ?),
     (?, ?, ?, ?, ?, ?, ?),
     (?, ?, ?, ?, ?, ?, ?)`,
    [
      'Emergency Vet Fund', 'Help us provide urgent medical care for injured and sick campus strays. Every rupee helps us cover vet bills, medicines, and emergency surgeries.', 50000, '2026-06-30', 1, createdBy, '/uploads/drive1.jpeg',
      'Campus Shelter Build', 'Help us build a proper shelter near the hostels where animals can rest safely, especially during monsoons and cold nights.', 80000, '2026-07-31', 1, createdBy, '/uploads/drive2.jpg',
      'Vaccination Drive 2026', 'Fund our annual vaccination camp to vaccinate 50+ campus animals against rabies and distemper. Protect animals and humans alike.', 25000, '2026-05-15', 1, createdBy, '/uploads/vaccination drive animal.jpg',
    ]
  );
}

async function initDb() {
  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    for (const [name, ddl] of TABLE_STATEMENTS) {
      await conn.query(ddl);
      console.log(`[db] ensured table: ${name}`);
    }

    await seedUsers(conn);
    await seedAnimals(conn);
    await seedDonationDrives(conn);

    console.log('[db] MySQL schema ready and seed data checked.');
  } finally {
    conn.release();
  }
}

initDb().catch((err) => {
  console.error('[db] Failed to initialize database:', err);
  process.exit(1);
});

module.exports = pool;
