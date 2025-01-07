const express = require('express');
const db = require('../../db'); 
const router = express.Router();
const validarRol = require('../middlewares/validarRol'); 

// Crear trabajador (solo adminis)
router.post('/', validarRol(['administrador']), async (req, res) => {
    const {
        rol, // Rol del usuario que hace la solicitud
        tipo_trabajador, // Tipo de trabajador a crear: medico o asistente
        nombre,
        apellidos,
        curp,
        direccion,
        telefono,
        email,
        contraseña,
        especialidad,
        medico_id,
        horario
    } = req.body;

    // Validar entrada
    if (!tipo_trabajador || !nombre || !apellidos || !curp || !direccion || !telefono || !email || !contraseña) {
        return res.status(400).json({
            success: false,
            message: 'Todos los campos obligatorios deben estar completos',
        });
    }

    // Validar tipo_trabajador
    if (!['medico', 'asistente'].includes(tipo_trabajador)) {
        return res.status(400).json({
            success: false,
            message: "El tipo de trabajador debe ser 'medico' o 'asistente'",
        });
    }

    try {
        // Verificar que el CURP no esté duplicado
        const [curpExists] = await db.query(
            'SELECT id FROM Medicos WHERE curp = ? UNION SELECT id FROM Asistentes_Medicos WHERE curp = ?',
            [curp, curp]
        );

        if (curpExists.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El CURP ya está registrado para otro trabajador',
            });
        }

        let result;
        if (tipo_trabajador === 'medico') {
            // Validar campos específicos para médicos
            if (!especialidad || !horario || horario.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar la especialidad y al menos un horario para el médico',
                });
            }

            // Insertar médico
            [result] = await db.query(
                `INSERT INTO Medicos (nombre, apellidos, curp, direccion, telefono, email, contraseña, especialidad)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [nombre, apellidos, curp, direccion, telefono, email, contraseña, especialidad]
            );

            const medicoId = result.insertId;

            // Insertar horarios
            for (const h of horario) {
                const { dia, hora_inicio, hora_fin } = h;

                if (!dia || !hora_inicio || !hora_fin || hora_inicio >= hora_fin) {
                    return res.status(400).json({
                        success: false,
                        message: 'El horario debe tener día, hora_inicio < hora_fin y valores válidos',
                    });
                }

                await db.query(
                    `INSERT INTO Horarios (medico_id, dia, hora_inicio, hora_fin)
                     VALUES (?, ?, ?, ?)`,
                    [medicoId, dia, hora_inicio, hora_fin]
                );
            }
        } else if (tipo_trabajador === 'asistente') {
            // Insertar asistente médico
            [result] = await db.query(
                `INSERT INTO Asistentes_Medicos (nombre, apellidos, curp, direccion, telefono, email, contraseña, medico_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [nombre, apellidos, curp, direccion, telefono, email, contraseña, medico_id || null]
            );
        }

        return res.status(201).json({
            success: true,
            message: 'Trabajador creado exitosamente',
            data: {
                id: result.insertId,
                nombre,
                apellidos,
                tipo_trabajador,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al crear el trabajador',
        });
    }
});


// Obtener lista de trabajadores (solo adminis)
router.get('/', validarRol(['administrador']), async (req, res) => {
    const { nombre, apellidos, curp, rol, especialidad } = req.query;

    try {
        let query = '';
        let queryParams = [];

        if (rol === 'medico') {

            query = `
                SELECT id, nombre, apellidos, curp, 'medico' AS rol, especialidad
                FROM Medicos
                WHERE 1=1
            `;

            if (nombre) {
                query += ' AND nombre LIKE ?';
                queryParams.push(`%${nombre}%`);
            }
            if (apellidos) {
                query += ' AND apellidos LIKE ?';
                queryParams.push(`%${apellidos}%`);
            }
            if (curp) {
                query += ' AND curp LIKE ?';
                queryParams.push(`%${curp}%`);
            }
            if (especialidad) {
                query += ' AND especialidad LIKE ?';
                queryParams.push(`%${especialidad}%`);
            }
        } else if (rol === 'asistente') {

            query = `
                SELECT id, nombre, apellidos, curp, 'asistente' AS rol, NULL AS especialidad
                FROM Asistentes_Medicos
                WHERE 1=1
            `;

            if (nombre) {
                query += ' AND nombre LIKE ?';
                queryParams.push(`%${nombre}%`);
            }
            if (apellidos) {
                query += ' AND apellidos LIKE ?';
                queryParams.push(`%${apellidos}%`);
            }
            if (curp) {
                query += ' AND curp LIKE ?';
                queryParams.push(`%${curp}%`);
            }
        } else {
            // Si no se filtra por rol, combinar médicos y asistentes
            const medicoQuery = `
                SELECT id, nombre, apellidos, curp, 'medico' AS rol, especialidad
                FROM Medicos
                WHERE 1=1
            `;
            const asistenteQuery = `
                SELECT id, nombre, apellidos, curp, 'asistente' AS rol, NULL AS especialidad
                FROM Asistentes_Medicos
                WHERE 1=1
            `;

            query = `(${medicoQuery}) UNION ALL (${asistenteQuery})`;

            if (nombre) {
                query += ' AND nombre LIKE ?';
                queryParams.push(`%${nombre}%`);
            }
            if (apellidos) {
                query += ' AND apellidos LIKE ?';
                queryParams.push(`%${apellidos}%`);
            }
            if (curp) {
                query += ' AND curp LIKE ?';
                queryParams.push(`%${curp}%`);
            }
        }


        const [workers] = await db.query(query, queryParams);

        // Verificar si hay resultados
        if (workers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontraron trabajadores con los filtros proporcionados',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lista de trabajadores obtenida exitosamente',
            data: workers,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener la lista de trabajadores',
        });
    }
});

//Modificar o acxtualizar trbajador(solo admins)
router.put('/:id', validarRol(['administrador']), async (req, res) => {
    const { id } = req.params; // ID del trabajador a actualizar
    const { rol, trabajador, ...campos } = req.body; // rol del usuario y tipo de trabajador (medico/asistente)

    try {
        // Validar el rol del usuario que realiza la solicitud
        if (rol !== 'administrador') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para realizar esta acción',
            });
        }

        // Validar el tipo de trabajador
        if (!trabajador || !['medico', 'asistente'].includes(trabajador)) {
            return res.status(400).json({
                success: false,
                message: "El tipo de trabajador debe ser 'medico' o 'asistente'",
            });
        }

        // Determinar la tabla correspondiente
        const tableName = trabajador === 'medico' ? 'Medicos' : 'Asistentes_Medicos';

        // Verificar si el trabajador existe
        const [worker] = await db.query(`SELECT id FROM ${tableName} WHERE id = ?`, [id]);
        if (!worker.length) {
            return res.status(404).json({
                success: false,
                message: 'Trabajador no encontrado',
            });
        }

        // Construir la consulta dinámica
        const updates = [];
        const params = [];

        Object.keys(campos).forEach((campo) => {
            if (campo !== 'rol' && campo !== 'trabajador') {
                updates.push(`${campo} = ?`);
                params.push(campos[campo]);
            }
        });

        params.push(id);

        // Ejecutar la consulta de actualización
        const query = `UPDATE ${tableName} SET ${updates.join(', ')} WHERE id = ?`;
        await db.query(query, params);

        return res.status(200).json({
            success: true,
            message: 'Trabajador actualizado exitosamente',
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar el trabajador',
        });
    }
});

//eliminar trabajador(solo admins)
router.delete('/:id', validarRol(['administrador']), async (req, res) => {
    const { id } = req.params; 
    const { rol, trabajador } = req.body; 

    try {
       
        if (rol !== 'administrador') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para realizar esta acción',
            });
        }

   
        if (!trabajador || !['medico', 'asistente'].includes(trabajador)) {
            return res.status(400).json({
                success: false,
                message: "El tipo de trabajador debe ser 'medico' o 'asistente'",
            });
        }


        const tableName = trabajador === 'medico' ? 'Medicos' : 'Asistentes_Medicos';

        // Verificar si el trabajador existe
        const [worker] = await db.query(`SELECT id FROM ${tableName} WHERE id = ?`, [id]);
        if (!worker.length) {
            return res.status(404).json({
                success: false,
                message: 'Trabajador no encontrado',
            });
        }

        // Eliminar el trabajador de la base de datos
        await db.query(`DELETE FROM ${tableName} WHERE id = ?`, [id]);

        return res.status(200).json({
            success: true,
            message: 'Trabajador eliminado exitosamente',
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar el trabajador',
        });
    }
});


module.exports = router;
