const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors"); 
const mysql = require("mysql2"); 
const multer = require("multer");
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const session = require('express-session');
const { authenticateUser } = require('./middleware/auth');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'tu_correo@gmail.com', // tu correo
    pass: 'tu_contraseña' // tu contraseña
  }
});

// Configuración de Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(__dirname, 'uploads');
      cb(null, uploadPath); // Directorio donde se almacenarán los archivos subidos
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname); // Nombre del archivo en el servidor
    }
  });
const upload = multer({ storage: storage });


//Configuración de la conexión  a la base de daros MySQL
const pool = mysql.createPool({
    host: 'localhost', //'localhost'
    user: 'sheyla', //'nombre usuario'
    password: 'Abril05042001$', //contraseña
    database: 'telemed241',//nombre de base de datos
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
// Verificar conexión a la base de datos
pool.getConnection((err, connection) => {
    if (err) {
        console.error("No se pudo conectar a la base de datos:", err);
        return;
    }
    console.log("Conectado exitosamente a la base de datos");
    connection.release(); // No olvides liberar la conexión
});


const app = express();

// Configura Express para servir archivos estáticos desde la carpeta 'public'
app.use(cors()); 
app.use(express.static('public'));
// Esto asume que tus archivos están almacenados en 'path.join(__dirname, 'uploads')'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(bodyParser.json()); 
app.use(express.urlencoded({ extended: true}));
// Configuración de express-session
app.use(session({
  secret: 'tu_secreto_aqui', // Cambia esto a una cadena de texto segura
  resave: false,
  saveUninitialized: true,
}));

app.post('/login', (req, res) => {
  const { correo, contraseña } = req.body;

  // Verificar las credenciales en la base de datos
  pool.query('SELECT * FROM usuarios WHERE correo = ? AND contraseña = ?', [correo, contraseña], (err, results) => {
      if (err) {
          console.error('Error al buscar usuario:', err);
          res.status(500).send('Error al iniciar sesión');
      } else {
        const user = results[0];
          if (results.length > 0) {
              // Usuario autenticado correctamente, redirigir a la página principal
              req.session.user = user;
              //res.redirect('/inicio.html');
              res.json({ success: true });
          } else {
              // Credenciales incorrectas
              res.status(401).json({ success: false, message: 'Credenciales incorrectas ' });
          }
      }
  });
});

app.use(authenticateUser);
app.post('/enviar-datos', (req, res) => {
    // Directamente usando req.body para obtener los valores
    const {rol, nombre, correo, contraseña} = req.body;

    // Ejecutar el query en una sola línea, pasando los valores directamente
    pool.query('INSERT INTO usuarios (rol, nombre, correo, contraseña) VALUES (?, ?, ?, ?)', [rol, nombre, correo, contraseña], (err, results) => {
        if (err) {
            console.error('Error al insertar en la base de datos:', err);
            res.status(500).send('Error al insertar los datos');
        } else {
            console.log('Datos insertados con éxito:', results);
            res.status(200).send('Datos recibidos con éxito');
        }
    });
});

app.use(authenticateUser);
app.post('/dar-alta-equipo', (req, res) => {
    // Directamente usando req.body para obtener los valores
    console.log(req.body);
    const {departamento, tipo_equipo, nombre_equipo, marca_equipo, numero_serie,codigo} = req.body;

    // Ejecutar el query en una sola línea, pasando los valores directamente
    pool.query('INSERT INTO equipos_medicos (departamento, tipo_equipo, nombre_equipo, marca_equipo, numero_serie, codigo) VALUES (?, ?, ?, ?, ?, ?)', [departamento, tipo_equipo, nombre_equipo, marca_equipo, numero_serie, codigo], (err, results) => {
        if (err) {
            console.error('Error al insertar en la base de datos:', err);
            res.status(500).send('Error al insertar los datos');
        } else {
            console.log('Datos insertados con éxito:', results);
            res.status(200).send('Datos recibidos con éxito');
        }
    });
});

// Ruta para manejar la subida de archivos
app.post('/subir-archivo', upload.single('archivo'), (req, res) => {


  // Guardar información del archivo en la base de datos
  const nombreArchivo = req.file.filename;
  const rutaArchivo = req.file.path;
  const tipoArchivo = req.file.mimetype;
    
  const sql = 'INSERT INTO archivos (nombre_archivo, ruta_archivo, tipo_archivo) VALUES (?, ?, ?)';
  pool.query(sql, [nombreArchivo, rutaArchivo, tipoArchivo], (err, results) => {
    if (err) {
      console.error('Error al insertar en la base de datos:', err);
      res.status(500).send('Error al insertar los datos');
    } else {
      console.log('Datos del archivo insertados con éxito:', results);
      res.status(200).send('Archivo subido y datos guardados con éxito');
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
      if (err) {
          console.error('Error al cerrar la sesión: ' + err.message);
          res.status(500).send('Error en el servidor');
          return;
      }
      res.redirect('/login.html'); // Redirigir a la página de inicio o a donde desees después del logout
  });
});

app.get('/about', (req, res)=>{
    res.status(200).send("Somos telemedicina 2024_1");
});

app.get('/consultar', (req, res) => {
  pool.query('SELECT * FROM usuarios', (err, results) => {
      if (err) {
          console.error('Error al consultar la base de datos:', err);
          res.status(500).send('Error al consultar los datos');
      } else {
          console.log('Usuarios consultados con éxito');
          res.status(200).json(results);
      }
  });
});

app.get('/consultararchivos', (req, res) => {
  pool.query('SELECT * FROM archivos', (err, results) => {
    if (err) {
      console.error('Error al consultar la base de datos:', err);
      res.status(500).send('Error al consultar los datos');
    } else {
      console.log('Archivos consultados con éxito');
      res.status(200).json(results);
    }
  });
});

app.get('/consultarEquipo', (req, res) => {
  pool.query('SELECT * FROM equipos_medicos', (err, results) => {
    if (err) {
      console.error('Error al consultar la base de datos:', err);
      res.status(500).send('Error al consultar los datos');
    } else {
      console.log('Archivos consultados con éxito');
      res.status(200).json(results);
    }
  });
});



app.get('/inicio.html', (req, res) => {
  if (req.session.user) {
    // Si el usuario ha iniciado sesión, envía el archivo index.html
    res.sendFile(path.join(__dirname, 'inicio.html'));
  } else {
    // Si el usuario no ha iniciado sesión, redirige a la página de inicio de sesión
    res.redirect('/login.html');
  }
});

function obtenerIdEquipo(departamento, tipo_equipo, numero_serie, callback) {
  const sql = 'SELECT id FROM equipos_medicos WHERE departamento = ? AND tipo_equipo = ? AND numero_serie = ?';
  pool.query(sql, [departamento, tipo_equipo, numero_serie], (err, results) => {
      if (err) {
          console.error('Error al obtener el ID del equipo médico:', err);
          return callback(err);
      }
      if (results.length === 0) {
          return callback(new Error('No se encontró el equipo médico especificado'));
      }
      // Retorna el ID del equipo médico encontrado
      callback(null, results[0].id);
  });
}


// Ruta para manejar la subida de archivos médicos
app.post('/subir-archivo-medico', upload.single('bitacora'), (req, res) => {
  const { departamento, equipo, numSerie } = req.body;
  
  obtenerIdEquipo(departamento, equipo, numSerie, (err, idEquipoMedico) => {
      if (err) {
          console.error('Error al obtener el ID del equipo médico:', err);
          return res.status(500).send('Error al obtener el ID del equipo médico');
      }

      const sqlInsert = 'INSERT INTO archivos_medicos (nombre_archivo, ruta_archivo, tipo_archivo, id_equipo_medico) VALUES (?, ?, ?, ?)';
      pool.query(sqlInsert, [req.file.filename, req.file.path, req.file.mimetype, idEquipoMedico], (err, results) => {
          if (err) {
              console.error('Error al insertar el archivo médico en la base de datos:', err);
              return res.status(500).send('Error al insertar el archivo médico');
          }
          res.status(200).send('Archivo médico subido correctamente');
      });
  });
});


app.get('/consultararchivos_medicos', (req, res) => {
  const { idEquipo } = req.query;  // Asegúrate de que recibes el ID correctamente
  pool.query('SELECT * FROM archivos_medicos WHERE id_equipo_medico = ?', [idEquipo], (err, results) => {
      if (err) {
          console.error('Error al consultar los archivos:', err);
          return res.status(500).send('Error al consultar los datos');
      }
      if (results.length > 0) {
          res.json(results);
      } else {
          res.status(404).send('No se encontraron archivos');  // Esto te permite saber si no hay archivos
      }
  });
});


app.get('/consultararchivos', (req, res) => {
  pool.query('SELECT * FROM archivos', (err, results) => {
    if (err) {
      console.error('Error al consultar la base de datos:', err);
      res.status(500).send('Error al consultar los datos');
    } else {
      console.log('Archivos consultados con éxito');
      res.status(200).json(results);
    }
  });
});

app.get('/equipos-medicos', (req, res) => {
  const sql = 'SELECT departamento, tipo_equipo, numero_serie FROM equipos_medicos';
  pool.query(sql, (err, results) => {
    if (err) {
      console.error('Error al consultar la base de datos:', err);
      return res.status(500).send('Error al consultar los datos');
    }

    const structuredData = results.reduce((acc, { departamento, tipo_equipo, numero_serie }) => {
      if (!acc[departamento]) acc[departamento] = {};
      if (!acc[departamento][tipo_equipo]) acc[departamento][tipo_equipo] = [];
      acc[departamento][tipo_equipo].push(numero_serie);
      return acc;
    }, {});

    res.status(200).json(structuredData);
  });
});

// Endpoint para obtener todos los departamentos únicos
app.get('/departamentos', (req, res) => {
  pool.query('SELECT DISTINCT departamento FROM equipos_medicos', (err, results) => {
      if (err) {
          console.error('Error al consultar departamentos:', err);
          res.status(500).send('Error al consultar los departamentos');
          return;
      }
      res.json(results.map(row => row.departamento));
  });
});

app.get('/tipos-equipo', (req, res) => {
  const departamento = req.query.departamento;
  let sql = 'SELECT DISTINCT tipo_equipo FROM equipos_medicos';
  const params = [];

  if (departamento && departamento !== '') {
    sql += ' WHERE departamento = ?';
    params.push(departamento);
  }

  pool.query(sql, params, (err, results) => {
      if (err) {
          console.error('Error al consultar tipos de equipo:', err);
          res.status(500).send('Error al consultar los tipos de equipo');
          return;
      }
      res.json(results.map(row => row.tipo_equipo));
  });
});


app.delete('/borrar-archivo', (req, res) => {
  // Asumiendo que el rol del usuario está almacenado en req.session.user.rol
  if (req.session.user && req.session.user.rol === 'administrador') {
    const idArchivo = req.query.id;
    const sql = 'DELETE FROM archivos_medicos WHERE id = ?';
    pool.query(sql, [idArchivo], (err, result) => {
      if (err) {
        console.error('Error al borrar archivo:', err);
        return res.status(500).send({ success: false, message: 'Error al borrar el archivo' });
      }
      console.log('Archivo borrado con éxito:', result);
      res.send({ success: true, message: 'Archivo borrado con éxito' });
    });
  } else {
    res.status(403).send({ success: false, message: 'Acceso denegado' });
  }
});



app.delete('/eliminar-usuario', (req, res) => {
  const userId = req.body.id; // Cambiado de req.params.id a req.body.id

  const query = 'DELETE FROM usuarios WHERE id = ?';
  pool.query(query, [userId], (err, result) => {
      if (err) {
          console.error('Error al eliminar el usuario:', err);
          res.status(500).send('Error al eliminar el usuario');
      } else {
          if (result.affectedRows === 0) {
              res.status(404).send('Usuario no encontrado');
          } else {
              res.send('Usuario eliminado exitosamente');
          }
      }
  });
});


// Endpoint modificado para permitir filtrado
app.get('/consultarEquipoFiltrado', (req, res) => {
const { departamento, tipoEquipo } = req.query;
let sql = 'SELECT * FROM equipos_medicos WHERE 1=1';
const params = [];

if (departamento && departamento !== 'Todos los departamentos') {
  sql += ' AND departamento = ?';
  params.push(departamento);
}
if (tipoEquipo && tipoEquipo !== 'Todos los tipos') {
  sql += ' AND tipo_equipo = ?';
  params.push(tipoEquipo);
}

pool.query(sql, params, (err, results) => {
  if (err) {
    console.error('Error al consultar la base de datos:', err);
    return res.status(500).send('Error al consultar los datos');
  }
  res.json(results);
});
});


// Ruta para solicitar el restablecimiento de la contraseña
app.post('/request-reset-password', (req, res) => {
  console.log('Request received at /request-reset-password');
  const { resetEmail } = req.body;
  pool.query('SELECT * FROM usuarios WHERE correo = ?', [resetEmail], (err, results) => {
    if (err) {
      console.error('Error al buscar usuario:', err);
      return res.status(500).json({ success: false, message: 'Error al buscar usuario' });
    } 
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Correo no encontrado' });
    } 
    const token = crypto.randomBytes(20).toString('hex');
    const expirationTime = Date.now() + 3600000; // 1 hora
    pool.query('UPDATE usuarios SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE correo = ?', [token, expirationTime, resetEmail], (err) => {
      if (err) {
        console.error('Error al guardar el token:', err);
        return res.status(500).json({ success: false, message: 'Error al procesar la solicitud' });
      } 
      const mailOptions = {
        to: resetEmail,
        from: 'tu_correo@gmail.com',
        subject: 'Restablecer contraseña',
        text: `Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para restablecer tu contraseña: \n\n http://${req.headers.host}/reset/${token} \n\n Si no solicitaste esto, ignora este correo.`
      };
      transporter.sendMail(mailOptions, (err) => {
        if (err) {
          console.error('Error al enviar el correo:', err);
          return res.status(500).json({ success: false, message: 'Error al enviar el correo' });
        } 
        res.status(200).json({ success: true, message: 'Correo de restablecimiento enviado' });
      });
    });
  });
});


app.get('/reset/:token', (req, res) => {
  const { token } = req.params;
  pool.query('SELECT * FROM usuarios WHERE resetPasswordToken = ? AND resetPasswordExpires > ?', [token, Date.now()], (err, results) => {
    if (err) {
      console.error('Error al buscar token:', err);
      res.status(500).send('Error al procesar la solicitud');
    } else if (results.length === 0) {
      res.status(400).send('Token inválido o expirado');
    } else {
      res.sendFile(path.join(__dirname, 'public/reset.html'));
    }
  });
});

app.post('/reset/:token', (req, res) => {
  const { token } = req.params;
  const { nuevaContraseña } = req.body;
  pool.query('SELECT * FROM usuarios WHERE resetPasswordToken = ? AND resetPasswordExpires > ?', [token, Date.now()], (err, results) => {
    if (err) {
      console.error('Error al buscar token:', err);
      res.status(500).send('Error al procesar la solicitud');
    } else if (results.length === 0) {
      res.status(400).send('Token inválido o expirado');
    } else {
      const userId = results[0].id;
      pool.query('UPDATE usuarios SET contraseña = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?', [nuevaContraseña, userId], (err) => {
        if (err) {
          console.error('Error al actualizar la contraseña:', err);
          res.status(500).send('Error al actualizar la contraseña');
        } else {
          res.status(200).send('Contraseña actualizada correctamente');
        }
      });
    }
  });
});


// Nueva ruta para buscar equipos por número de serie
app.get('/consultarEquipoPorNumeroSerie', (req, res) => {
  const { numeroSerie } = req.query;
  const sql = 'SELECT * FROM equipos_medicos WHERE numero_serie = ?';
  pool.query(sql, [numeroSerie], (err, results) => {
    if (err) {
      console.error('Error al consultar la base de datos:', err);
      return res.status(500).send('Error al consultar los datos');
    }
    res.json(results);
  });
});


app.get('/user-info', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: 'No ha iniciado sesión' });
  }
});


function verificarAdmin(req, res, next) {
  if (req.session.user && req.session.user.rol === 'administrador') {
    next(); // Usuario es admin, continuar con la solicitud
  } else {
   
    res.redirect('/inicio.html');
  }
}

// Rutas accesibles solo para administradores
app.use('/altaEquipo', verificarAdmin);
app.use('/subir_bitacora', verificarAdmin);
app.use('/usuarios', verificarAdmin);
app.use('/formulario', verificarAdmin);



app.get('/usuarios', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/usuarios.html'));
});
app.get('/formulario', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/formulario.html'));
});
app.get('/inicio', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/inicio.html'));
});
app.get('/altaEquipo', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/altaEquipo.html'));
});
app.get('/equipos', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/equipos.html'));
});
app.get('/subir_bitacora', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/subir_bitacora.html'));
});

app.listen(5001, function(){
    console.log("Servidor corriendo en el puerto 5001");
});