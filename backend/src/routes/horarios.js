const express = require('express');
const db = require('../../db');
const router = express.Router();
const validarRol = require('../middlewares/validarRol');

// Consultar todos los horarios (administrador) o propios (médico)
router.get('/', validarRol(['administrador', 'medico']), async (req, res) => {
    const { rol, id } = req.body; // Obtener rol y id desde el cuerpo de la solicitud

    try {
        let query = '';
        let queryParams = [];

        if (rol === 'administrador') {
            // Administrador: Ver todos los horarios
            query = 'SELECT * FROM Horarios';
        } else if (rol === 'medico') {
            // Médico: Ver solo sus propios horarios
            query = 'SELECT * FROM Horarios WHERE medico_id = ?';
            queryParams.push(id); // ID del médico autenticado
        }

        // Ejecutar la consulta
        const [horarios] = await db.query(query, queryParams);

        if (horarios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontraron horarios',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Horarios obtenidos exitosamente',
            data: horarios,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al consultar horarios',
        });
    }
});

// Consultar horarios específicos de un médico (solo administradores)
router.get('/:id', validarRol(['administrador']), async (req, res) => {
    const { id } = req.params; 
    const { dia } = req.query; 

    try {
        let query = 'SELECT * FROM Horarios WHERE medico_id = ?';
        const queryParams = [id];

        if (dia) {
            query += ' AND dia = ?';
            queryParams.push(dia);
        }

        // Ejecutar la consulta
        const [horarios] = await db.query(query, queryParams);

        if (horarios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontraron horarios para el médico especificado',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Horarios obtenidos exitosamente',
            data: horarios,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al consultar horarios',
        });
    }
});

// Actualizar horarios de un médico (solo administradores)
router.put('/:id', validarRol(['administrador']), async (req, res) => {
    const { id } = req.params; // ID del médico
    const { rol, horarios } = req.body; // Rol y nuevos horarios

    // Validar que se pase el rol como administrador
    if (rol !== 'administrador') {
        return res.status(403).json({
            success: false,
            message: 'No tienes permiso para realizar esta acción. Solo los administradores pueden actualizar horarios.',
        });
    }

    // Validar que se proporcionen horarios
    if (!horarios || !Array.isArray(horarios) || horarios.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Debes proporcionar un arreglo de horarios válidos',
        });
    }

    try {
        // Verificar que el médico exista
        const [medico] = await db.query('SELECT id FROM Medicos WHERE id = ?', [id]);
        if (medico.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Médico no encontrado',
            });
        }

        // Eliminar horarios actuales del médico
        await db.query('DELETE FROM Horarios WHERE medico_id = ?', [id]);

        // Insertar los nuevos horarios
        const horarioInsertPromises = horarios.map(horario => {
            return db.query(
                'INSERT INTO Horarios (medico_id, dia, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)',
                [id, horario.dia, horario.hora_inicio, horario.hora_fin]
            );
        });
        await Promise.all(horarioInsertPromises);

        return res.status(200).json({
            success: true,
            message: 'Horarios actualizados exitosamente',
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar los horarios',
        });
    }
});

module.exports = router;
