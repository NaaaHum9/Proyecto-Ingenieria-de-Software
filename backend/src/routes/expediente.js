const express = require('express');
const db = require('../../db');
const router = express.Router();
const validarRol = require('../middlewares/validarRol');

// Crear un expediente 
router.post('/', validarRol(['medico']), async (req, res) => {
    const { id: medico_id } = req.body; // ID del médico que realiza la acción
    const { paciente_id, diagnostico, medicamentos, signos_vitales, fecha } = req.body;

    // Validaciones iniciales
    if (!paciente_id || !diagnostico) {
        return res.status(400).json({
            success: false,
            message: 'Los campos paciente_id y diagnostico son obligatorios',
        });
    }

    try {
        // Verificar si el paciente existe
        const [paciente] = await db.query('SELECT * FROM Pacientes WHERE id = ?', [paciente_id]);
        if (paciente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'El paciente no existe',
            });
        }

        // Verificar si el paciente ya tiene un expediente médico
        const [historialExistente] = await db.query('SELECT * FROM Historial_Medico WHERE paciente_id = ?', [paciente_id]);
        if (historialExistente.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El paciente ya tiene un expediente médico registrado',
            });
        }

        // Insertar el historial médico
        const [result] = await db.query(
            'INSERT INTO Historial_Medico (paciente_id, medico_id, diagnostico, medicamentos, signos_vitales, fecha) VALUES (?, ?, ?, ?, ?, ?)',
            [
                paciente_id,
                medico_id,
                diagnostico,
                medicamentos || null,
                signos_vitales ? JSON.stringify(signos_vitales) : null,
                fecha || new Date(), // Fecha actual si no se proporciona
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Historial médico registrado exitosamente',
            data: { historial_id: result.insertId },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al registrar el historial médico',
        });
    }
});


// Mostrar expedientes
router.get('/', validarRol(['medico']), async (req, res) => {
    const { id: medico_id } = req.body; 
    const { paciente_id, nombre, apellidos, fecha } = req.query; 

    try {

        let query = `
            SELECT hm.id AS historial_id, p.id AS paciente_id, p.nombre, p.apellidos, hm.diagnostico, hm.medicamentos, hm.signos_vitales, hm.fecha
            FROM Historial_Medico hm
            INNER JOIN Pacientes p ON hm.paciente_id = p.id
            WHERE hm.medico_id = ?
        `;
        const queryParams = [medico_id];

        // Agregar filtros opcionales
        if (paciente_id) {
            query += ' AND p.id = ?';
            queryParams.push(paciente_id);
        }
        if (nombre) {
            query += ' AND p.nombre LIKE ?';
            queryParams.push(`%${nombre}%`);
        }
        if (apellidos) {
            query += ' AND p.apellidos LIKE ?';
            queryParams.push(`%${apellidos}%`);
        }
        if (fecha) {
            query += ' AND DATE(hm.fecha) = ?';
            queryParams.push(fecha);
        }


        const [expedientes] = await db.query(query, queryParams);

        // Verificar si hay resultados
        if (expedientes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontraron expedientes médicos',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Expedientes médicos obtenidos exitosamente',
            data: expedientes,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener los expedientes médicos',
        });
    }
});

//Modificar expediente
router.put('/:id', validarRol(['medico']), async (req, res) => {
    const { id: medico_id } = req.body; 
    const { id: historial_id } = req.params; 
    const { diagnostico, medicamentos, signos_vitales } = req.body;

    try {

        const [expediente] = await db.query('SELECT * FROM Historial_Medico WHERE id = ?', [historial_id]);
        if (expediente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'El expediente médico no existe',
            });
        }

        if (expediente[0].medico_id !== medico_id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para modificar este expediente médico',
            });
        }

        const updates = [];
        const updateParams = [];

        if (diagnostico) {
            updates.push('diagnostico = ?');
            updateParams.push(diagnostico);
        }
        if (medicamentos) {
            updates.push('medicamentos = ?');
            updateParams.push(medicamentos);
        }
        if (signos_vitales) {
            updates.push('signos_vitales = ?');
            updateParams.push(JSON.stringify(signos_vitales));
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionaron datos para actualizar',
            });
        }

        updateParams.push(historial_id);

        await db.query(`UPDATE Historial_Medico SET ${updates.join(', ')} WHERE id = ?`, updateParams);

        return res.status(200).json({
            success: true,
            message: 'Expediente médico actualizado exitosamente',
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar el expediente médico',
        });
    }
});


// Eliminar un expediene
router.delete('/:id', validarRol(['administrador']), async (req, res) => {
    const { id: historial_id } = req.params; 

    try {
       
        const [expediente] = await db.query('SELECT * FROM Historial_Medico WHERE id = ?', [historial_id]);
        if (expediente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'El expediente médico no existe',
            });
        }

        await db.query('DELETE FROM Historial_Medico WHERE id = ?', [historial_id]);

        return res.status(200).json({
            success: true,
            message: 'Expediente médico eliminado exitosamente',
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar el expediente médico',
        });
    }
});
module.exports = router;
