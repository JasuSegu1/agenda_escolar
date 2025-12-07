const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// --- LOGIN ---
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

// --- TAREAS ---
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

// --- NOTAS (CRUD COMPLETO) ---
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

// NUEVO: Editar Nota
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

// --- RECORDATORIOS (CRUD COMPLETO) ---
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

// NUEVO: Editar Recordatorio
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

app.listen(PORT, () => console.log(`Servidor listo en http://localhost:${PORT}`));