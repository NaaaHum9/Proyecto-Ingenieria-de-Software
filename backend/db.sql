CREATE DATABASE MediSched;
USE MediSched;

-- Tabla: Administradores
CREATE TABLE Administradores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    curp VARCHAR(20) NOT NULL UNIQUE,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    email VARCHAR(100) NOT NULL,
    estado BOOLEAN DEFAULT TRUE, -- Activo por defecto
    contraseña VARCHAR(255) NOT NULL -- Contraseña hash
);

-- Tabla: Médicos
CREATE TABLE Medicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    curp VARCHAR(20) NOT NULL UNIQUE,
    especialidad VARCHAR(100) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    email VARCHAR(100) NOT NULL,
    estado BOOLEAN DEFAULT TRUE, -- Activo por defecto
    contraseña VARCHAR(255) NOT NULL -- Contraseña hash
);

-- Tabla: Horarios
CREATE TABLE Horarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medico_id INT NOT NULL, -- Relación con un médico
    dia ENUM('lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo') NOT NULL,
    hora_inicio TIME NOT NULL, -- Hora de inicio
    hora_fin TIME NOT NULL, -- Hora de fin
    FOREIGN KEY (medico_id) REFERENCES Medicos(id) ON DELETE CASCADE
);

-- Tabla: Asistentes Médicos
CREATE TABLE Asistentes_Medicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    curp VARCHAR(20) NOT NULL UNIQUE,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    email VARCHAR(100) NOT NULL,
    medico_id INT DEFAULT NULL, -- Relación con un médico
    estado BOOLEAN DEFAULT TRUE, -- Activo por defecto
    contraseña VARCHAR(255) NOT NULL, -- Contraseña hash
    FOREIGN KEY (medico_id) REFERENCES Medicos(id) ON DELETE SET NULL
);

-- Tabla: Pacientes
CREATE TABLE Pacientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    curp VARCHAR(20) NOT NULL UNIQUE,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(15) NOT NULL,
    email VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    estado BOOLEAN DEFAULT TRUE, -- Activo por defecto
    medico_id INT DEFAULT NULL, -- Médico asignado
    FOREIGN KEY (medico_id) REFERENCES Medicos(id) ON DELETE SET NULL
);

-- Tabla: Citas
CREATE TABLE Citas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    medico_id INT NOT NULL,
    asistente_id INT DEFAULT NULL, -- Asistente médico que gestionó la cita
    fecha DATE NOT NULL, -- Fecha de la cita
    hora TIME NOT NULL, -- Hora de la cita
    estado ENUM('programada', 'cancelada', 'reprogramada', 'tomada', 'no tomada') DEFAULT 'programada',
    notas TEXT DEFAULT NULL,
    FOREIGN KEY (paciente_id) REFERENCES Pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (medico_id) REFERENCES Medicos(id) ON DELETE CASCADE,
    FOREIGN KEY (asistente_id) REFERENCES Asistentes_Medicos(id) ON DELETE SET NULL
);

-- Tabla: Historial Médico
CREATE TABLE Historial_Medico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    medico_id INT NOT NULL,
    diagnostico TEXT NOT NULL,
    medicamentos TEXT DEFAULT NULL,
    signos_vitales JSON DEFAULT NULL, -- Signos vitales en formato JSON
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES Pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (medico_id) REFERENCES Medicos(id) ON DELETE CASCADE
);

INSERT INTO Administradores (nombre, apellidos, curp, direccion, telefono, email, estado, contraseña)
VALUES (
    'Juan', 
    'Pérez López', 
    'PELO900101HDFRRR02', 
    'Calle Falsa 123, Ciudad de México', 
    '5512345678',   
    'admin@medisched.com', 
    TRUE, 
    SHA2('Admin1234', 256) -- Contraseña: Admin1234 (hasheada con SHA-256)
);

INSERT INTO Medicos (nombre, apellidos, curp, especialidad, direccion, telefono, email, estado, contraseña)
VALUES
('María', 'Gómez Sánchez', 'GOSM870512MDFLLL03', 'Cardiología', 'Av. Reforma 456, Ciudad de México', '5556781234', 'mgomez@medisched.com', TRUE, SHA2('Medico1234', 256)),
('Carlos', 'Ramírez Flores', 'RAFLC850910HDFRRR01', 'Pediatría', 'Calle Insurgentes 789, Ciudad de México', '5598765432', 'cramirez@medisched.com', TRUE, SHA2('Medico1234', 256));

INSERT INTO Horarios (medico_id, dia, hora_inicio, hora_fin)
VALUES
(13, 'lunes', '09:00:00', '13:00:00'),
(13, 'miércoles', '10:00:00', '14:00:00'),
(14, 'martes', '08:00:00', '12:00:00'),
(14, 'jueves', '11:00:00', '15:00:00');


INSERT INTO Asistentes_Medicos (nombre, apellidos, curp, direccion, telefono, email, medico_id, estado, contraseña)
VALUES
('Laura', 'Hernández Torres', 'HETL930215MDFRRR05', 'Col. Roma Norte, CDMX', '5523456789', 'lhernandez@medisched.com', 13, TRUE, SHA2('Asistente123', 256)),
('Luis', 'Martínez Díaz', 'MADL910617HDFRRR02', 'Col. Condesa, CDMX', '5587654321', 'lmartinez@medisched.com', 14, TRUE, SHA2('Asistente123', 256));

INSERT INTO Pacientes (nombre, apellidos, curp, direccion, telefono, email, fecha_nacimiento, estado, medico_id)
VALUES
('Ana', 'López Ruiz', 'LORA950420MDFRRR09', 'Calle Palma 456, CDMX', '5512349876', 'alopez@medisched.com', '1995-04-20', TRUE, 13),
('Jorge', 'Núñez Fernández', 'NUFJ890101HDFRRR03', 'Calle Álamo 789, CDMX', '5545671234', 'jnunez@medisched.com', '1989-01-01', TRUE, 14);

INSERT INTO Citas (paciente_id, medico_id, asistente_id, fecha, hora, estado, notas)
VALUES
(7, 13, 7, '2025-01-10', '10:30:00', 'programada', 'Revisión general'),
(8, 14, 8, '2025-01-11', '09:00:00', 'programada', 'Consulta de seguimiento');

INSERT INTO Historial_Medico (paciente_id, medico_id, diagnostico, medicamentos, signos_vitales, fecha)
VALUES
(7, 13, 'Hipertensión arterial', 'Losartán 50mg', '{"presion": "140/90", "pulso": 80}', '2024-12-01 10:30:00'),
(8, 14, 'Infección respiratoria', 'Amoxicilina 500mg', '{"temperatura": 37.8, "frecuencia_respiratoria": 20}', '2024-12-05 09:15:00');
