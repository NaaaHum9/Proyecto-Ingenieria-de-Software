const express = require('express');
const db = require('../../db');
const router = express.Router();
const validarRol = require('../middlewares/validarRol');

// Crear una nueva cita
router.post('/', validarRol(['paciente', 'asistente']), async (req, res) => {
    const { rol, id } = req.body; 
    const { paciente_id, medico_id, fecha, hora, notas } = req.body;

    // Validaciones iniciales
    if (!paciente_id || !medico_id || !fecha || !hora) {
        return res.status(400).json({
            success: false,
            message: 'Todos los campos (paciente_id, medico_id, fecha, hora) son obligatorios',
        });
    }

    try {
        // Validar que el médico esté disponible en el horario
        const [horarios] = await db.query(
            'SELECT * FROM Horarios WHERE medico_id = ?',
            [medico_id]
        );

        if (horarios.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El médico no tiene horarios configurados',
            });
        }

        // Validar que el médico no tenga una cita en ese horario
        const [citas] = await db.query(
            'SELECT * FROM Citas WHERE medico_id = ? AND fecha = ? AND hora = ?',
            [medico_id, fecha, hora]
        );

        if (citas.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El médico ya tiene una cita programada en esta fecha y hora',
            });
        }

        // Crear la cita
        const [result] = await db.query(
            'INSERT INTO Citas (paciente_id, medico_id, asistente_id, fecha, hora, estado, notas) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                paciente_id,
                medico_id,
                rol === 'asistente' ? id : null, // ID del asistente si aplica
                fecha,
                hora,
                'programada',
                notas || null,
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Cita programada exitosamente',
            data: { cita_id: result.insertId },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al programar la cita',
        });
    }
});

//Ver citas(adminis, pacientes y asistentes)
router.get('/', validarRol(['paciente', 'medico', 'asistente']), async (req, res) => {
    const { rol, id } = req.body; 
    const { medico_id, paciente_id, fecha, estado } = req.query; 

    try {
        let query = 'SELECT * FROM Citas WHERE 1=1'; 
        const queryParams = [];

        // Filtros según el rol
        if (rol === 'paciente') {
            // Paciente solo ve sus citas
            query += ' AND paciente_id = ?';
            queryParams.push(id);
        } else if (rol === 'medico') {
            // Médico solo ve sus citas
            query += ' AND medico_id = ?';
            queryParams.push(id);
        } else if (rol === 'asistente') {
            // Asistente puede ver citas de todos, aplicar filtros opcionales
            if (medico_id) {
                query += ' AND medico_id = ?';
                queryParams.push(medico_id);
            }
            if (paciente_id) {
                query += ' AND paciente_id = ?';
                queryParams.push(paciente_id);
            }
        }

        // Filtros comunes a todos los roles
        if (fecha) {
            query += ' AND fecha = ?';
            queryParams.push(fecha);
        }
        if (estado) {
            query += ' AND estado = ?';
            queryParams.push(estado);
        }

        // Ejecutar la consulta
        const [citas] = await db.query(query, queryParams);

        // Verificar si hay resultados
        if (citas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontraron citas con los filtros especificados',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Citas obtenidas exitosamente',
            data: citas,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las citas',
        });
    }
});

//Modificar citas
router.put('/:id', validarRol(['paciente', 'asistente']), async (req, res) => {
    const { rol, id: usuarioId } = req.body; // Rol e ID del usuario que hace la petición
    const { id: citaId } = req.params; // ID de la cita a modificar
    const { fecha, hora, estado, notas } = req.body; // Nuevos valores

    try {
        // Verificar si la cita existe
        const [cita] = await db.query('SELECT * FROM Citas WHERE id = ?', [citaId]);
        if (cita.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'La cita no existe',
            });
        }

        // Validar acceso según el rol
        if (rol === 'paciente' && cita[0].paciente_id !== usuarioId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para modificar esta cita',
            });
        }

        // Validar que no haya conflictos de horario si se modifica la fecha/hora
        if (fecha || hora) {
            const [conflicto] = await db.query(
                'SELECT * FROM Citas WHERE medico_id = ? AND fecha = ? AND hora = ? AND id != ?',
                [cita[0].medico_id, fecha || cita[0].fecha, hora || cita[0].hora, citaId]
            );

            if (conflicto.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El médico ya tiene una cita programada en esta fecha y hora',
                });
            }
        }

        // Actualizar la cita
        await db.query(
            'UPDATE Citas SET fecha = ?, hora = ?, estado = ?, notas = ? WHERE id = ?',
            [
                fecha || cita[0].fecha,
                hora || cita[0].hora,
                estado || cita[0].estado,
                notas || cita[0].notas,
                citaId,
            ]
        );

        return res.status(200).json({
            success: true,
            message: 'Cita actualizada exitosamente',
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al modificar la cita',
        });
    }
});



// Eliminar (cancelar) una cita
router.delete('/:id', validarRol(['paciente', 'asistente']), async (req, res) => {
    const { rol, id: usuarioId } = req.body; 
    const { id: citaId } = req.params; 

    try {

        const [cita] = await db.query('SELECT * FROM Citas WHERE id = ?', [citaId]);
        if (cita.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'La cita no existe',
            });
        }


        if (rol === 'paciente' && cita[0].paciente_id !== usuarioId) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para cancelar esta cita',
            });
        }

        await db.query('DELETE FROM Citas WHERE id = ?', [citaId]);

        return res.status(200).json({
            success: true,
            message: 'Cita cancelada exitosamente',
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al cancelar la cita',
        });
    }
});

module.exports = router;
