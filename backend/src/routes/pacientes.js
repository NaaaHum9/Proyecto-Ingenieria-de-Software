const express = require('express');
const db = require('../../db');
const router = express.Router();
const validarRol = require('../middlewares/validarRol'); 

// Crear paciente (solo administradores)
router.post('/', validarRol(['administrador']), async (req, res) => {
    const {
        nombre,
        apellidos,
        curp,
        direccion,
        telefono,
        email,
        fecha_nacimiento,
        contraseña,
    } = req.body;

    // Validar campos obligatorios
    if (!nombre || !apellidos || !curp || !direccion || !telefono || !email || !fecha_nacimiento || !contraseña) {
        return res.status(400).json({
            success: false,
            message: 'Todos los campos son obligatorios',
        });
    }

    try {
        // Verificar que el CURP no esté duplicado
        const [curpExists] = await db.query(
            'SELECT id FROM Pacientes WHERE curp = ?',
            [curp]
        );

        if (curpExists.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El CURP ya está registrado',
            });
        }

        // Insertar el paciente en la base de datos
        const [result] = await db.query(
            `INSERT INTO Pacientes 
            (nombre, apellidos, curp, direccion, telefono, email, fecha_nacimiento, contraseña) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre, apellidos, curp, direccion, telefono, email, fecha_nacimiento, contraseña]
        );

        // Devolver respuesta exitosa
        return res.status(201).json({
            success: true,
            message: 'Paciente creado exitosamente',
            data: {
                id: result.insertId,
                nombre,
                apellidos,
                curp,
            },
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al crear el paciente',
        });
    }
});

//ver pacientes(solo medicos y admins)
router.get('/', validarRol(['administrador', 'medico']), async (req, res) => {
    const { nombre, apellidos, curp, medico_id } = req.query; // Filtros opcionales

    try {
        let query = 'SELECT * FROM Pacientes WHERE 1=1';
        const params = [];

        // Filtros dinámicos
        if (nombre) {
            query += ' AND nombre LIKE ?';
            params.push(`%${nombre}%`);
        }

        if (apellidos) {
            query += ' AND apellidos LIKE ?';
            params.push(`%${apellidos}%`);
        }

        if (curp) {
            query += ' AND curp = ?';
            params.push(curp);
        }

        if (medico_id) {
            query += ' AND medico_id = ?';
            params.push(medico_id);
        }

        // Ejecutar consulta
        const [result] = await db.query(query, params);

        return res.status(200).json({
            success: true,
            message: 'Lista de pacientes obtenida exitosamente',
            data: result,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener la lista de pacientes',
        });
    }
});

//actualizar paciente(solo admins)
router.put('/:id', validarRol(['administrador']), async (req, res) => {
    const { id } = req.params; 
    const { nombre, apellidos, curp, direccion, telefono, email, fecha_nacimiento, estado } = req.body;

    // Validar entrada
    if (!id || (!nombre && !apellidos && !curp && !direccion && !telefono && !email && !fecha_nacimiento && estado === undefined)) {
        return res.status(400).json({
            success: false,
            message: 'Debe proporcionar al menos un campo para actualizar',
        });
    }

    try {
        // Verificar que el paciente exista
        const [pacienteExists] = await db.query('SELECT * FROM Pacientes WHERE id = ?', [id]);
        if (pacienteExists.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado',
            });
        }

        // Verificar si el CURP ya existe en otro paciente
        if (curp) {
            const [curpExists] = await db.query('SELECT id FROM Pacientes WHERE curp = ? AND id != ?', [curp, id]);
            if (curpExists.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'El CURP ya está registrado para otro paciente',
                });
            }
        }

        // Actualizar el paciente
        const updateQuery = `
            UPDATE Pacientes
            SET nombre = COALESCE(?, nombre),
                apellidos = COALESCE(?, apellidos),
                curp = COALESCE(?, curp),
                direccion = COALESCE(?, direccion),
                telefono = COALESCE(?, telefono),
                email = COALESCE(?, email),
                fecha_nacimiento = COALESCE(?, fecha_nacimiento),
                estado = COALESCE(?, estado)
            WHERE id = ?
        `;
        await db.query(updateQuery, [nombre, apellidos, curp, direccion, telefono, email, fecha_nacimiento, estado, id]);

        // Obtener el paciente actualizado
        const [updatedPaciente] = await db.query('SELECT * FROM Pacientes WHERE id = ?', [id]);

        return res.status(200).json({
            success: true,
            message: 'Paciente actualizado exitosamente',
            data: updatedPaciente[0],
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar el paciente',
        });
    }
});


// Eliminar/desactivar paciente (solo adminis)
router.delete('/:id', validarRol(['administrador']), async (req, res) => {
    const { id } = req.params;

    try {
        // Verificar que el paciente exista
        const [pacienteExists] = await db.query('SELECT * FROM Pacientes WHERE id = ?', [id]);
        if (pacienteExists.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado',
            });
        }

        // Eliminar de la abse dde datos
        await db.query('DELETE FROM Pacientes WHERE id = ?', [id]);


        return res.status(200).json({
            success: true,
            message: 'Paciente eliminado exitosamente',
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar el paciente',
        });
    }
});

module.exports = router;
