const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000; // Importante para Railway

app.use(cors());
app.use(bodyParser.json());

// --- FUNCIÓN MÁGICA: Crear Tablas Automáticamente ---
async function inicializarBD() {
    try {
        console.log("Iniciando creación de tablas...");
        
        // --- LÍNEA DE DEBUG AGREGADA ---
        // Esto nos dirá a qué host y puerto está intentando conectar el código.
        console.log("DEBUG-HOST-INTENTADO:", process.env.DB_HOST, "USER:", process.env.DB_USER);
        // --------------------------------

        // 1. Tabla Usuarios
        await db.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(100) NOT NULL,
                rol ENUM('estudiante', 'docente') DEFAULT 'estudiante')`);

        // 2. Tabla Tareas
        await db.query(`
            CREATE TABLE IF NOT EXISTS tareas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT,
                titulo VARCHAR(100) NOT NULL,
                descripcion TEXT,
                fecha DATE NOT NULL,
                tipo ENUM('personal', 'grupal') DEFAULT 'personal',
                estatus ENUM('pendiente', 'completada') DEFAULT 'pendiente',
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE)`);

        // 3. Tabla Notas
        await db.query(`
            CREATE TABLE IF NOT EXISTS notas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT,
                titulo VARCHAR(100),
                contenido TEXT,
                color_fondo VARCHAR(20),
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE)`);

        // 4. Tabla Recordatorios
        await db.query(`
            CREATE TABLE IF NOT EXISTS recordatorios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT,
                mensaje VARCHAR(255),
                fecha_hora DATETIME,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE)`);

        // 5. Insertar Usuarios de Prueba (Si no existen)
        await db.query(`
            INSERT IGNORE INTO usuarios (id, nombre, email, password, rol) VALUES 
            (1, 'Profesor Demo', 'profesor@demo.com', '123456', 'docente'),
            (2, 'Alumno Prueba', 'alumno@demo.com', '123456', 'estudiante');
        `);

        console.log("¡Tablas verificadas/creadas correctamente!");
    } catch (error) {
        console.error("Error al inicializar la BD:", error);
    }
}

// Ejecutamos la creación de tablas
inicializarBD();
// ----------------------------------------------------

// --- RUTAS DE LA API ---
// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM usuarios WHERE email = ? AND password = ?', [email, password]);
        if (users.length > 0) {
            const user = users[0];
            res.json({ success: true, user: { id: user.id, nombre: user.nombre, rol: user.rol } });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// Tareas
app.get('/api/tareas', async (req, res) => {
    const { userId, userRol } = req.query;
    try {
        let query = userRol === 'estudiante'
            ? `SELECT * FROM tareas WHERE usuario_id = ? OR tipo = 'grupal' ORDER BY fecha ASC`
            : `SELECT * FROM tareas WHERE usuario_id = ? ORDER BY fecha ASC`;
        const [rows] = await db.query(query, [userId]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Error obteniendo tareas' }); }
});

app.post('/api/tareas', async (req, res) => {
    const { titulo, descripcion, fecha, tipo, usuario_id } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO tareas (titulo, descripcion, fecha, tipo, usuario_id) VALUES (?, ?, ?, ?, ?)',
            [titulo, descripcion, fecha, tipo, usuario_id]
        );
        res.json({ id: result.insertId, message: 'Creada' });
    } catch (error) { res.status(500).json({ error: 'Error creando tarea' }); }
});

app.put('/api/tareas/:id', async (req, res) => {
    const { id } = req.params;
    const { titulo, descripcion, fecha, tipo, estatus } = req.body;
    try {
        if (estatus !== undefined && !titulo) {
             await db.query('UPDATE tareas SET estatus = ? WHERE id = ?', [estatus, id]);
             return res.json({ message: 'Estatus actualizado' });
        }
        await db.query(
            'UPDATE tareas SET titulo = ?, descripcion = ?, fecha = ?, tipo = ? WHERE id = ?',
            [titulo, descripcion, fecha, tipo, id]
        );
        res.json({ message: 'Tarea actualizada correctamente' });
    } catch (error) { res.status(500).json({ error: 'Error actualizando tarea' }); }
});

app.delete('/api/tareas/:id', async (req, res) => {
    await db.query('DELETE FROM tareas WHERE id = ?', [req.params.id]);
    res.json({ message: 'Eliminada' });
});

// Notas
app.get('/api/notas', async (req, res) => {
    const { userId } = req.query;
    try {
        const [rows] = await db.query('SELECT * FROM notas WHERE usuario_id = ? ORDER BY creado_en DESC', [userId]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Error' }); }
});

app.post('/api/notas', async (req, res) => {
    const { titulo, contenido, color_fondo, usuario_id } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO notas (titulo, contenido, color_fondo, usuario_id) VALUES (?, ?, ?, ?)',
            [titulo, contenido, color_fondo, usuario_id]
        );
        res.json({ id: result.insertId });
    } catch (error) { res.status(500).json({ error: 'Error' }); }
});

app.put('/api/notas/:id', async (req, res) => {
    const { titulo, contenido, color_fondo } = req.body;
    try {
        await db.query('UPDATE notas SET titulo = ?, contenido = ?, color_fondo = ? WHERE id = ?', 
        [titulo, contenido, color_fondo, req.params.id]);
        res.json({ message: 'Nota actualizada' });
    } catch (error) { res.status(500).json({ error: 'Error actualizando nota' }); }
});

app.delete('/api/notas/:id', async (req, res) => {
    await db.query('DELETE FROM notas WHERE id = ?', [req.params.id]);
    res.json({ message: 'Nota eliminada' });
});

// Recordatorios
app.get('/api/recordatorios', async (req, res) => {
    const { userId } = req.query;
    try {
        const [rows] = await db.query('SELECT * FROM recordatorios WHERE usuario_id = ? ORDER BY fecha_hora ASC', [userId]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Error' }); }
});

app.post('/api/recordatorios', async (req, res) => {
    const { mensaje, fecha_hora, usuario_id } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO recordatorios (mensaje, fecha_hora, usuario_id) VALUES (?, ?, ?)',
            [mensaje, fecha_hora, usuario_id]
        );
        res.json({ id: result.insertId });
    } catch (error) { res.status(500).json({ error: 'Error' }); }
});

app.put('/api/recordatorios/:id', async (req, res) => {
    const { mensaje, fecha_hora } = req.body;
    try {
        await db.query('UPDATE recordatorios SET mensaje = ?, fecha_hora = ? WHERE id = ?', 
        [mensaje, fecha_hora, req.params.id]);
        res.json({ message: 'Recordatorio actualizado' });
    } catch (error) { res.status(500).json({ error: 'Error actualizando recordatorio' }); }
});

app.delete('/api/recordatorios/:id', async (req, res) => {
    await db.query('DELETE FROM recordatorios WHERE id = ?', [req.params.id]);
    res.json({ message: 'Recordatorio eliminado' });
});

app.listen(PORT, () => console.log(`Servidor listo en puerto ${PORT}`));