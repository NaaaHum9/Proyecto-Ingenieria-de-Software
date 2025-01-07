module.exports = function validarRol(rolesPermitidos) {
    return (req, res, next) => {
        const { rol } = req.body; // Se espera que el rol venga en el cuerpo de la petición o desde el login

        if (!rolesPermitidos.includes(rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para realizar esta acción',
            });
        }

        next();
    };
};
