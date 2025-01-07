const express = require("express");
const bodyParser = require("body-parser");
const pool = require("./db");
const loginRoutes = require("./src/routes/login");
const pacientesRoutes = require("./src/routes/pacientes");
const trabajadoresRoutes = require("./src/routes/trabajadores");
const horariosRoutes = require("./src/routes/horarios");
const citasRoutes = require("./src/routes/citas");
const expedienteRoutes = require("./src/routes/expediente");

const app = express();

// Middleware
app.use(bodyParser.json());

// Rutas
app.use("/login", loginRoutes);
app.use("/pacientes", pacientesRoutes);
app.use("/trabajadores", trabajadoresRoutes);
app.use("/horarios", horariosRoutes);
app.use("/citas", citasRoutes);
app.use("/expediente", expedienteRoutes);

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

pool.getConnection()
    .then(() => console.log("Conexión a la base de datos exitosa"))
    .catch(err => console.error("Error al conectar a la base de datos", err));



