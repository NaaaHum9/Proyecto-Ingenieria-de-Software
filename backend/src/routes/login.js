const express = require('express');
const db = require('../../db'); // Asegúrate de que esta conexión está bien configurada
const router = express.Router();

router.post('/', async (req, res) => {
    const { curp, contraseña } = req.body;

    // Validar entrada
    if (!curp || !contraseña) {
        return res.status(400).json({ success: false, message: 'CURP y contraseña son requeridos' });
    }

    try {
        // Tablas y roles que se van a consultar
        const queries = [
            { table: 'Administradores', role: 'administrador' },
            { table: 'Medicos', role: 'medico' },
            { table: 'Asistentes_Medicos', role: 'asistente_medico' },
            { table: 'Pacientes', role: 'paciente' },
        ];

        let user = null;

        // Verificar credenciales en cada tabla
        for (const query of queries) {
            const [result] = await db.query(
                `SELECT id, nombre, apellidos FROM ${query.table} WHERE curp = ? AND contraseña = ?`,
                [curp, contraseña]
            );

            if (result.length > 0) {
                // Usuario encontrado
                user = { ...result[0], rol: query.role };
                break; // Detener el bucle en la primera coincidencia
            }
        }

        // Si no se encontró usuario
        if (!user) {
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }

        // Retornar información del usuario encontrado
        return res.status(200).json({
            success: true,
            message: 'Login exitoso',
            data: user,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

module.exports = router;
