import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

// --- IMPORTACIONES DE FIREBASE ---
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, updateDoc, deleteDoc, query, orderBy 
} from "firebase/firestore";

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyASeIw9l-nrmNVmqfLftm2wUTStxtVXgQA",
  authDomain: "salon-bella-mi-app.firebaseapp.com",
  projectId: "salon-bella-mi-app",
  storageBucket: "salon-bella-mi-app.firebasestorage.app",
  messagingSenderId: "397451681810",
  appId: "1:397451681810:web:c232daefa9ea834a5e38cb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- ESTILOS ---
const styles = {
  inputFull: { width: '100%', padding: '12px', borderRadius: '15px', border: '1px solid #fce7f3', marginBottom: '15px', boxSizing: 'border-box' },
  btnMini: { background: '#1e293b', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '10px' },
  btnEdit: { background: '#f1f5f9', color: '#64748b', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer', marginRight: '5px' },
  btnDelete: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
  trHead: { textAlign: 'left', fontSize: '10px', color: '#94a3b8', borderBottom: '1px solid #f1f5f9' },
  tr: { borderBottom: '1px solid #f1f5f9', fontSize: '12px' },
  tabContent: { background: 'white', padding: '30px', borderRadius: '35px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' },
  tabTitle: { fontSize: '24px', fontWeight: '900', marginBottom: '20px' },
  inputFiltro: { padding: '10px', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px' },
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '40px', borderRadius: '40px', width: '600px', maxHeight: '90vh', overflowY: 'auto' },
  inputModal: { width: '100%', padding: '15px', borderRadius: '15px', border: 'none', background: '#f8fafc', fontWeight: 'bold' },
  itemServicio: { background: '#f8fafc', padding: '15px', borderRadius: '20px', marginBottom: '10px' },
  footerModal: { marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #f1f5f9' },
  btnGuardar: { width: '100%', padding: '20px', borderRadius: '25px', border: 'none', color: 'white', fontWeight: '900', marginTop: '20px', cursor: 'pointer' },
  cardComision: { background: 'white', padding: '25px', borderRadius: '30px', border: '1px solid #fce7f3', cursor: 'pointer' },
  btnExcel: { background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' },
  listRow: { display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '12px', fontWeight: 'bold' },
  btnCerrar: { width: '100%', padding: '15px', borderRadius: '15px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' }
};

export default function App() {
  // --- ESTADOS DE AUTENTICACIÓN Y NAVEGACIÓN ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null); 
  const [currentUser, setCurrentUser] = useState(null); // Guardar todo el objeto usuario logueado
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  // --- ESTADOS DE DATOS ---
  const [boletas, setBoletas] = useState([]);
  const [usuarios, setUsuarios] = useState([]); 
  const [estilistas, setEstilistas] = useState(['MARIA', 'ANA', 'LUCIA']);
  const [servicios, setServicios] = useState([
    { id: 1, nombre: 'PEINADO' },
    { id: 2, nombre: 'COLOR' },
    { id: 3, nombre: 'MANICURE' }
  ]);

  // --- ESTADO PARA PERMISOS (EN CREACIÓN) ---
  const [permisosSeleccionados, setPermisosSeleccionados] = useState({
    canEdit: false,
    canDelete: false,
    canExport: false,
    canSeeComisions: true
  });

  // --- ESTADOS DE UI Y FILTROS ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroGeneral, setFiltroGeneral] = useState(''); 
  const [estilistaSeleccionado, setEstilistaSeleccionado] = useState(null);

  // --- ESTADO DE FORMULARIO NUEVA BOLETA ---
  const [nuevaBoleta, setNuevaBoleta] = useState({
    nroBoleta: '',
    cliente: '',
    fecha: new Date().toISOString().split('T')[0],
    detalles: [{ servicioId: '', precio: '', descProducto: 0, estilistas: [] }],
    pagos: { EFECTIVO: 0, QR: 0, GIFTCARD: 0, COLABORACION: 0 }
  });

  // --- EFECTO: CARGAR DATOS ---
  useEffect(() => {
    const qB = query(collection(db, "boletas"), orderBy("fecha", "desc"));
    const unsubB = onSnapshot(qB, (snapshot) => {
      setBoletas(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    const qU = collection(db, "usuarios");
    const unsubU = onSnapshot(qU, (snapshot) => {
      setUsuarios(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    return () => { unsubB(); unsubU(); };
  }, []);

  // --- FUNCIÓN PARA VALIDAR PERMISO ---
  const tienePermiso = (tipo) => {
    if (userRole === 'admin') return true; // El admin maestro o rol admin siempre puede
    if (currentUser && currentUser.permisos) {
      return currentUser.permisos[tipo];
    }
    return false;
  };

  // --- LÓGICA DE LOGIN ---
  const manejarLogin = () => {
    const masterAdmin = passwordInput === 'admin123';
    const masterWorker = passwordInput === 'bella2026';
    const usuarioDB = usuarios.find(u => u.clave === passwordInput);

    if (masterAdmin || (usuarioDB && usuarioDB.rol === 'admin')) {
      setUserRole('admin');
      setCurrentUser(usuarioDB || { nombre: 'MASTER', permisos: { canEdit: true, canDelete: true, canExport: true, canSeeComisions: true } });
      setIsAuthenticated(true);
    } else if (masterWorker || (usuarioDB && usuarioDB.rol === 'trabajador')) {
      setUserRole('trabajador');
      setCurrentUser(usuarioDB || { nombre: 'TRABAJADOR', permisos: { canEdit: false, canDelete: false, canExport: false, canSeeComisions: true } });
      setIsAuthenticated(true);
      setActiveTab('DASHBOARD');
    } else {
      alert('Contraseña incorrecta');
    }
  };

  // --- LÓGICA DE FILTRADO ---
  const filtrarPorFecha = (lista) => {
    if (!lista) return [];
    if (!filtroFechaDesde && !filtroFechaHasta) return lista;
    return lista.filter(b => {
      const fechaB = b.fecha || '';
      const desde = filtroFechaDesde || '0000-00-00';
      const hasta = filtroFechaHasta || '9999-99-99';
      return fechaB >= desde && fechaB <= hasta;
    });
  };

  const obtenerDataComisiones = () => {
    const boletasFiltradas = filtrarPorFecha(boletas);
    return estilistas.map(est => {
      let totalServicios = 0;
      let totalDescProducto = 0;
      let cantidadServicios = 0;
      let detalles = [];

      boletasFiltradas.forEach(b => {
        if (b.detalles && Array.isArray(b.detalles)) {
          b.detalles.forEach(d => {
            if (d.estilistas && d.estilistas.includes(est)) {
              const numPart = d.estilistas.length;
              const montoServicio = Number(d.precio || 0) / numPart;
              const descProd = Number(d.descProducto || 0) / numPart;
              totalServicios += montoServicio;
              totalDescProducto += descProd;
              cantidadServicios++;
              detalles.push({
                fecha: b.fecha,
                nroBoleta: b.nroBoleta,
                servicio: servicios.find(s => s.id == d.servicioId)?.nombre || 'S/N',
                montoBase: montoServicio,
                descuento: descProd,
                comisionNeta: (montoServicio * 0.5) - descProd
              });
            }
          });
        }
      });

      return {
        nombre: est,
        cantidad: cantidadServicios,
        montoTotal: totalServicios,
        descuentos: totalDescProducto,
        comisionFinal: (totalServicios * 0.5) - totalDescProducto,
        detalles
      };
    });
  };

  const exportarExcel = () => {
    if(!tienePermiso('canExport')) return alert("No tienes permiso para exportar");
    const datosFiltrados = filtrarPorFecha(boletas);
    const dataParaExcel = datosFiltrados.map(b => ({
      FECHA: b.fecha,
      BOLETA: b.nroBoleta,
      CLIENTE: b.cliente,
      SERVICIOS: b.detalles?.map(d => servicios.find(s => s.id == d.servicioId)?.nombre).join(", "),
      TOTAL_BS: b.total,
      EFECTIVO: b.pagos?.EFECTIVO || 0,
      QR: b.pagos?.QR || 0,
      GIFTCARD: b.pagos?.GIFTCARD || 0,
      COLABORACION: b.pagos?.COLABORACION || 0
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataParaExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial_Ventas");
    XLSX.writeFile(workbook, `Reporte_Historial_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportarDetalleEstilista = (est) => {
    const dataParaExcel = est.detalles.map(d => ({
      FECHA: d.fecha, BOLETA: d.nroBoleta, SERVICIO: d.servicio,
      MONTO_BASE: d.montoBase, DESC_PROD: d.descuento, COMISION_NETA: d.comisionNeta
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataParaExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Comisiones");
    XLSX.writeFile(workbook, `Detalle_${est.nombre}.xlsx`);
  };

  const calcularTotalServicios = () => nuevaBoleta.detalles.reduce((acc, d) => acc + Number(d.precio || 0), 0);
  const calcularTotalPagos = () => Object.values(nuevaBoleta.pagos).reduce((acc, v) => acc + Number(v || 0), 0);

  const guardarBoleta = async () => {
    const totalS = calcularTotalServicios();
    const totalP = calcularTotalPagos();
    if (!nuevaBoleta.nroBoleta.trim()) return alert("El Número de Boleta es obligatorio.");
    if (!nuevaBoleta.cliente.trim()) return alert("El nombre del Cliente es obligatorio.");
    const incompleto = nuevaBoleta.detalles.some(d => !d.servicioId || !d.precio || d.estilistas.length === 0);
    if (incompleto) return alert("Todos los campos de servicios deben estar llenos.");
    if (Math.abs(totalS - totalP) > 0.1 || totalS === 0) return alert("El monto de pagos debe ser exactamente igual al total de servicios.");
    
    try {
      if (editandoId) {
        if (!tienePermiso('canEdit')) return alert("No tienes permiso para editar.");
        await updateDoc(doc(db, "boletas", editandoId), { ...nuevaBoleta, total: totalS });
      } else {
        await addDoc(collection(db, "boletas"), { ...nuevaBoleta, total: totalS, createdAt: new Date() });
      }
      cerrarModal();
    } catch (error) { alert("Error: " + error.message); }
  };

  const eliminarBoleta = async (id) => {
    if (!tienePermiso('canDelete')) return alert("No tienes permiso para eliminar.");
    if (window.confirm("¿Estás seguro de eliminar esta boleta?")) {
      try { await deleteDoc(doc(db, "boletas", id)); } catch (error) { alert("Error al eliminar: " + error.message); }
    }
  };

  const agregarUsuario = async () => {
    const nom = document.getElementById('uNom').value.toUpperCase();
    const pass = document.getElementById('uPass').value;
    const rol = document.getElementById('uRol').value;
    if(!nom || !pass) return alert("Completa nombre y clave");
    try {
      await addDoc(collection(db, "usuarios"), { 
        nombre: nom, 
        clave: pass, 
        rol: rol,
        permisos: permisosSeleccionados // GUARDAMOS LOS PERMISOS AQUÍ
      });
      document.getElementById('uNom').value = '';
      document.getElementById('uPass').value = '';
      setPermisosSeleccionados({ canEdit: false, canDelete: false, canExport: false, canSeeComisions: true });
    } catch (e) { alert("Error: " + e.message); }
  };

  const eliminarUsuario = async (id) => {
    if (window.confirm("¿Eliminar este acceso?")) {
      try { await deleteDoc(doc(db, "usuarios", id)); } catch (e) { alert("Error"); }
    }
  };

  const prepararEdicion = (boleta) => {
    setNuevaBoleta({ ...boleta });
    setEditandoId(boleta.id);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setEditandoId(null);
    setNuevaBoleta({
      nroBoleta: '', cliente: '', fecha: new Date().toISOString().split('T')[0],
      detalles: [{ servicioId: '', precio: '', descProducto: 0, estilistas: [] }],
      pagos: { EFECTIVO: 0, QR: 0, GIFTCARD: 0, COLABORACION: 0 }
    });
  };

  const Card = ({ titulo, monto, resaltado }) => (
    <div style={{ background: 'white', padding: '25px', borderRadius: '30px', flex: 1, minWidth: '150px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #fce7f3', textAlign: 'center' }}>
      <p style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>{titulo}</p>
      <p style={{ fontSize: '24px', fontWeight: '900', color: resaltado ? '#D12E7B' : '#1e293b' }}>Bs {(monto || 0).toFixed(2)}</p>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyCenter: 'center', alignItems: 'center', background: '#FDF2F8' }}>
        <div style={{ background: 'white', padding: '50px', borderRadius: '40px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', margin: 'auto' }}>
          <h1 style={{ color: '#D12E7B', fontWeight: '900', marginBottom: '30px' }}>MIA BELLA - ACCESO</h1>
          <input type="password" placeholder="Introduce la clave..." style={{ ...styles.inputFull, textAlign: 'center' }} value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && manejarLogin()} />
          <button onClick={manejarLogin} style={{ ...styles.btnMini, width: '100%', padding: '15px' }}>ENTRAR</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FDF2F8', fontFamily: 'sans-serif', color: '#1e293b' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: '280px', background: 'white', borderRight: '1px solid #fce7f3', display: 'flex', flexDirection: 'column', padding: '40px', position: 'fixed', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '50px' }}>
          <div style={{ background: '#D12E7B', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold' }}>MB</div>
          <div>
            <h1 style={{ fontWeight: '900', color: '#D12E7B', fontStyle: 'italic', textTransform: 'uppercase', fontSize: '18px' }}>Mia Bella</h1>
            <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#94a3b8' }}>MODO: {userRole.toUpperCase()}</p>
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {['DASHBOARD', 'HISTORIAL', 'COMISIONES', 'CONFIGURACIÓN'].map(tab => {
            if (tab === 'CONFIGURACIÓN' && userRole !== 'admin') return null;
            if (tab === 'COMISIONES' && !tienePermiso('canSeeComisions')) return null;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                textAlign: 'left', padding: '15px 25px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '900', transition: '0.3s',
                background: activeTab === tab ? '#D12E7B' : 'transparent', color: activeTab === tab ? 'white' : '#94a3b8'
              }}>{tab}</button>
            );
          })}
        </nav>
        <button onClick={() => setIsModalOpen(true)} style={{ marginTop: 'auto', background: '#D12E7B', color: 'white', padding: '20px', borderRadius: '25px', border: 'none', fontWeight: '900', fontStyle: 'italic', cursor: 'pointer', boxShadow: '0 10px 20px rgba(209, 46, 123, 0.2)' }}>+ NUEVA BOLETA</button>
        <button onClick={() => window.location.reload()} style={{ marginTop: '10px', background: '#f1f5f9', color: '#94a3b8', padding: '10px', borderRadius: '15px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' }}>SALIR</button>
      </aside>

      <main style={{ marginLeft: '280px', flex: 1, padding: '60px' }}>
        
        {/* FILTROS GLOBALES */}
        {(activeTab !== 'CONFIGURACIÓN') && (
            <div style={{ marginBottom: '30px', display: 'flex', gap: '15px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span style={{ fontWeight: '900', fontSize: '11px', color: '#D12E7B' }}>FECHAS:</span>
                    <input type="date" value={filtroFechaDesde} style={styles.inputFiltro} onChange={e => setFiltroFechaDesde(e.target.value)} />
                    <input type="date" value={filtroFechaHasta} style={styles.inputFiltro} onChange={e => setFiltroFechaHasta(e.target.value)} />
                    <button onClick={() => {setFiltroFechaDesde(''); setFiltroFechaHasta('')}} style={{...styles.btnMini, background: '#94a3b8'}}>Limpiar</button>
                </div>
                {activeTab === 'HISTORIAL' && tienePermiso('canExport') && (
                    <button onClick={exportarExcel} style={styles.btnExcel}>📊 EXPORTAR HISTORIAL</button>
                )}
            </div>
        )}

        {activeTab === 'DASHBOARD' && (
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase', marginBottom: '40px' }}>Dashboard</h2>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <Card titulo="Efectivo" monto={filtrarPorFecha(boletas).reduce((acc, b) => acc + Number(b.pagos?.EFECTIVO || 0), 0)} />
              <Card titulo="QR" monto={filtrarPorFecha(boletas).reduce((acc, b) => acc + Number(b.pagos?.QR || 0), 0)} />
              <Card titulo="Gift Card" monto={filtrarPorFecha(boletas).reduce((acc, b) => acc + Number(b.pagos?.GIFTCARD || 0), 0)} />
              <Card titulo="Colaboración" monto={filtrarPorFecha(boletas).reduce((acc, b) => acc + Number(b.pagos?.COLABORACION || 0), 0)} />
              <Card titulo="Total Neto (Efe+QR)" monto={filtrarPorFecha(boletas).reduce((acc, b) => acc + (Number(b.pagos?.EFECTIVO || 0) + Number(b.pagos?.QR || 0)), 0)} resaltado />
            </div>
          </div>
        )}

        {activeTab === 'HISTORIAL' && (
          <div style={styles.tabContent}>
            <h2 style={styles.tabTitle}>Historial de Boletas</h2>
            <input placeholder="Buscar por cliente o nro de boleta..." style={styles.inputFull} onChange={e => setFiltroGeneral(e.target.value.toUpperCase())} />
            <table style={styles.table}>
              <thead>
                <tr style={styles.trHead}>
                  <th>FECHA</th><th>NRO</th><th>CLIENTE</th><th>SERVICIOS</th><th>TOTAL</th><th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filtrarPorFecha(boletas)
                  .filter(b => {
                    const busqueda = filtroGeneral.toLowerCase();
                    return (b.cliente || "").toLowerCase().includes(busqueda) || (b.nroBoleta || "").toString().includes(busqueda);
                  })
                  .map((b) => (
                    <tr key={b.id} style={styles.tr}>
                      <td style={{padding: '15px 5px'}}>{b.fecha}</td>
                      <td style={{fontWeight: '900', color: '#D12E7B'}}>#{b.nroBoleta}</td>
                      <td style={{fontWeight: '900'}}>{b.cliente}</td>
                      <td>{b.detalles?.map((d, i) => <div key={i}>{servicios.find(s => s.id == d.servicioId)?.nombre} (Bs {d.precio})</div>)}</td>
                      <td style={{fontWeight: '900'}}>Bs {(b.total || 0).toFixed(2)}</td>
                      <td>
                        {tienePermiso('canEdit') && <button onClick={() => prepararEdicion(b)} style={styles.btnEdit}>✎</button>}
                        {tienePermiso('canDelete') && <button onClick={() => eliminarBoleta(b.id)} style={styles.btnDelete}>×</button>}
                        {!tienePermiso('canEdit') && !tienePermiso('canDelete') && <span style={{fontSize: '10px', color: '#cbd5e1'}}>Lectura</span>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'COMISIONES' && tienePermiso('canSeeComisions') && (
          <div>
            <h2 style={styles.tabTitle}>Comisiones (50%)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {obtenerDataComisiones().map(res => (
                <div key={res.nombre} onClick={() => setEstilistaSeleccionado(res)} style={styles.cardComision}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <h3 style={{ fontWeight: '900', color: '#D12E7B' }}>{res.nombre}</h3>
                    <span style={{ fontSize: '10px', fontWeight: '900' }}>{res.cantidad} TRABAJOS</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>DESC. PRODUCTOS: Bs {res.descuentos.toFixed(2)}</p>
                  <p style={{ fontSize: '18px', fontWeight: '900', marginTop: '5px' }}>A PAGAR: <span style={{color: '#D12E7B'}}>Bs {res.comisionFinal.toFixed(2)}</span></p>
                </div>
              ))}
            </div>

            {estilistaSeleccionado && (
              <div style={styles.overlay}>
                <div style={{...styles.modal, width: '900px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h2 style={{fontWeight: '900'}}>DETALLE: {estilistaSeleccionado.nombre}</h2>
                    <button onClick={() => exportarDetalleEstilista(estilistaSeleccionado)} style={styles.btnExcel}>📥 DESCARGAR DETALLE</button>
                  </div>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.trHead}>
                        <th>FECHA</th><th>BOLETA</th><th>SERVICIO</th><th>MONTO</th><th>DESC. PROD</th><th>COMISIÓN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estilistaSeleccionado.detalles.map((det, idx) => (
                        <tr key={idx} style={styles.tr}>
                          <td style={{padding: '10px 0'}}>{det.fecha}</td>
                          <td>#{det.nroBoleta}</td>
                          <td>{det.servicio}</td>
                          <td>Bs {det.montoBase.toFixed(2)}</td>
                          <td style={{color: '#94a3b8'}}>Bs {det.descuento.toFixed(2)}</td>
                          <td style={{fontWeight: '900', color: '#D12E7B'}}>Bs {det.comisionNeta.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={() => setEstilistaSeleccionado(null)} style={styles.btnCerrar}>Cerrar</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'CONFIGURACIÓN' && userRole === 'admin' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div style={styles.tabContent}>
                    <h3 style={{ fontWeight: '900', marginBottom: '20px' }}>ESTILISTAS</h3>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <input id="inEst" placeholder="Nombre..." style={styles.inputFiltro} />
                        <button onClick={() => {
                            const v = document.getElementById('inEst').value.toUpperCase();
                            if(v) setEstilistas([...estilistas, v]);
                            document.getElementById('inEst').value = '';
                        }} style={styles.btnMini}>Añadir</button>
                    </div>
                    {estilistas.map(e => (
                        <div key={e} style={styles.listRow}>
                            {e} <span style={{ color: 'red', cursor: 'pointer' }} onClick={() => setEstilistas(estilistas.filter(x => x !== e))}>×</span>
                        </div>
                    ))}
                </div>
                <div style={styles.tabContent}>
                    <h3 style={{ fontWeight: '900', marginBottom: '20px' }}>SERVICIOS</h3>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <input id="inServ" placeholder="Ej: CORTE..." style={styles.inputFiltro} />
                        <button onClick={() => {
                            const v = document.getElementById('inServ').value.toUpperCase();
                            if(v) setServicios([...servicios, { id: Date.now(), nombre: v }]);
                            document.getElementById('inServ').value = '';
                        }} style={styles.btnMini}>Añadir</button>
                    </div>
                    {servicios.map(s => (
                        <div key={s.id} style={styles.listRow}>
                            {s.nombre} <span style={{ color: 'red', cursor: 'pointer' }} onClick={() => setServicios(servicios.filter(x => x.id !== s.id))}>×</span>
                        </div>
                    ))}
                </div>

                <div style={{ ...styles.tabContent, gridColumn: 'span 2' }}>
                    <h3 style={{ fontWeight: '900', marginBottom: '20px' }}>GESTIÓN DE PERMISOS POR USUARIO</h3>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc', padding: '20px', borderRadius: '20px' }}>
                        <input id="uNom" placeholder="Nombre Usuario" style={styles.inputFiltro} />
                        <input id="uPass" placeholder="Clave" style={styles.inputFiltro} />
                        <select id="uRol" style={styles.inputFiltro}>
                          <option value="trabajador">TRABAJADOR</option>
                          <option value="admin">ADMINISTRADOR</option>
                        </select>
                        
                        {/* BOTONES DE PERMISOS */}
                        <div style={{display: 'flex', gap: '10px', fontSize: '10px', fontWeight: 'bold'}}>
                           <label><input type="checkbox" checked={permisosSeleccionados.canEdit} onChange={e => setPermisosSeleccionados({...permisosSeleccionados, canEdit: e.target.checked})} /> EDITAR</label>
                           <label><input type="checkbox" checked={permisosSeleccionados.canDelete} onChange={e => setPermisosSeleccionados({...permisosSeleccionados, canDelete: e.target.checked})} /> ELIMINAR</label>
                           <label><input type="checkbox" checked={permisosSeleccionados.canExport} onChange={e => setPermisosSeleccionados({...permisosSeleccionados, canExport: e.target.checked})} /> EXPORTAR</label>
                           <label><input type="checkbox" checked={permisosSeleccionados.canSeeComisions} onChange={e => setPermisosSeleccionados({...permisosSeleccionados, canSeeComisions: e.target.checked})} /> VER COMISIONES</label>
                        </div>

                        <button onClick={agregarUsuario} style={{...styles.btnMini, background: '#D12E7B', marginLeft: 'auto'}}>CREAR CON PERMISOS</button>
                    </div>
                    <table style={styles.table}>
                        <thead>
                          <tr style={styles.trHead}>
                            <th>USUARIO</th><th>ROL</th><th>PERMISOS OTORGADOS</th><th>ACCIONES</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usuarios.map(u => (
                            <tr key={u.id} style={styles.tr}>
                              <td style={{padding: '10px'}}>{u.nombre}</td>
                              <td style={{fontWeight: '900'}}>{u.rol.toUpperCase()}</td>
                              <td style={{fontSize: '9px'}}>
                                {u.permisos?.canEdit && ' [EDITAR] '}
                                {u.permisos?.canDelete && ' [BORRAR] '}
                                {u.permisos?.canExport && ' [EXCEL] '}
                                {u.permisos?.canSeeComisions && ' [COMISIONES] '}
                              </td>
                              <td><button onClick={() => eliminarUsuario(u.id)} style={styles.btnDelete}>Eliminar</button></td>
                            </tr>
                          ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </main>

      {/* MODAL BOLETA */}
      {isModalOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                <h2 style={{ fontWeight: '900', color: '#D12E7B' }}>{editandoId ? 'EDITAR BOLETA' : 'NUEVA BOLETA'}</h2>
                <button onClick={cerrarModal} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <input value={nuevaBoleta.cliente} placeholder="CLIENTE" style={styles.inputModal} onChange={e => setNuevaBoleta({...nuevaBoleta, cliente: e.target.value.toUpperCase()})} />
                <input value={nuevaBoleta.nroBoleta} placeholder="NRO BOLETA" style={{...styles.inputModal, border: !nuevaBoleta.nroBoleta ? '1px solid red' : 'none'}} onChange={e => setNuevaBoleta({...nuevaBoleta, nroBoleta: e.target.value.toUpperCase()})} />
                <input type="date" value={nuevaBoleta.fecha} style={styles.inputModal} onChange={e => setNuevaBoleta({...nuevaBoleta, fecha: e.target.value})} />
            </div>

            <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <p style={{ fontWeight: '900', fontSize: '11px' }}>DESGLOSE DE SERVICIOS</p>
                    <button onClick={() => setNuevaBoleta({...nuevaBoleta, detalles: [...nuevaBoleta.detalles, { servicioId: '', precio: '', descProducto: 0, estilistas: [] }]})} style={{ color: '#D12E7B', fontWeight: '900', background: 'none', border: 'none', cursor: 'pointer' }}>+ OTRO SERVICIO</button>
                </div>
                {nuevaBoleta.detalles.map((d, idx) => (
                    <div key={idx} style={styles.itemServicio}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <select value={d.servicioId} style={{ flex: 1, padding: '10px', borderRadius: '10px' }} onChange={e => {
                                const n = [...nuevaBoleta.detalles]; n[idx].servicioId = e.target.value;
                                setNuevaBoleta({...nuevaBoleta, detalles: n});
                            }}>
                                <option value="">¿Servicio?</option>
                                {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                            <input value={d.precio} placeholder="Precio Bs" type="number" style={{ width: '100px', padding: '10px', borderRadius: '10px' }} onChange={e => {
                                const n = [...nuevaBoleta.detalles]; n[idx].precio = e.target.value;
                                setNuevaBoleta({...nuevaBoleta, detalles: n});
                            }} />
                            <input value={d.descProducto} placeholder="Desc. Prod" type="number" style={{ width: '100px', padding: '10px', borderRadius: '10px' }} onChange={e => {
                                const n = [...nuevaBoleta.detalles]; n[idx].descProducto = e.target.value;
                                setNuevaBoleta({...nuevaBoleta, detalles: n});
                            }} />
                        </div>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {estilistas.map(est => (
                                <button key={est} onClick={() => {
                                    const n = [...nuevaBoleta.detalles];
                                    const list = n[idx].estilistas;
                                    n[idx].estilistas = list.includes(est) ? list.filter(l => l !== est) : [...list, est];
                                    setNuevaBoleta({...nuevaBoleta, detalles: n});
                                }} style={{
                                    fontSize: '9px', padding: '5px 10px', borderRadius: '10px', border: '1px solid #ddd',
                                    background: d.estilistas.includes(est) ? '#D12E7B' : 'white', color: d.estilistas.includes(est) ? 'white' : '#666'
                                }}>{est}</button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div style={styles.footerModal}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {['EFECTIVO', 'QR', 'GIFTCARD', 'COLABORACION'].map(p => (
                        <div key={p}>
                          <p style={{ fontSize: '8px', fontWeight: '900' }}>{p}</p>
                          <input value={nuevaBoleta.pagos[p]} type="number" style={{ width: '80px', padding: '5px', borderRadius: '5px' }} onChange={e => setNuevaBoleta({...nuevaBoleta, pagos: {...nuevaBoleta.pagos, [p]: e.target.value}})} />
                        </div>
                    ))}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '10px', color: '#94a3b8' }}>TOTAL BS</p>
                    <h2 style={{ fontSize: '32px', fontWeight: '900' }}>{calcularTotalServicios().toFixed(2)}</h2>
                </div>
            </div>

            <button 
              onClick={guardarBoleta} 
              style={{ 
                ...styles.btnGuardar,
                background: (Math.abs(calcularTotalServicios() - calcularTotalPagos()) < 0.1 && nuevaBoleta.nroBoleta) ? '#1e293b' : '#94a3b8'
              }}>
              GUARDAR BOLETA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// --- ASIGNACIÓN FINAL DE ESTILOS ---
// Eliminamos 'const' porque ya fue declarada arriba. 
// Esto actualiza el objeto existente con las propiedades finales.

Object.assign(styles, {
  inputFiltro: { padding: '10px 15px', borderRadius: '12px', border: '1px solid #fce7f3', outline: 'none' },
  inputFull: { width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #fce7f3', marginBottom: '20px', boxSizing: 'border-box' },
  tabContent: { background: 'white', padding: '30px', borderRadius: '30px' },
  tabTitle: { fontSize: '24px', fontWeight: '900', marginBottom: '20px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  trHead: { borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#94a3b8' },
  tr: { borderBottom: '1px solid #f8fafc' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: 'white', width: '850px', padding: '40px', borderRadius: '40px', maxHeight: '90vh', overflowY: 'auto' },
  inputModal: { padding: '12px', borderRadius: '10px', background: '#f8fafc', border: 'none', width: '100%', boxSizing: 'border-box' },
  btnMini: { background: '#1e293b', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  btnExcel: { background: '#107c41', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize: '11px' },
  listRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f8fafc', fontWeight: 'bold' },
  btnEdit: { background: '#f1f5f9', border: 'none', borderRadius: '5px', padding: '5px 10px', marginRight: '5px', cursor: 'pointer' },
  btnDelete: { background: '#fee2e2', color: 'red', border: 'none', borderRadius: '5px', padding: '5px 10px', cursor: 'pointer' },
  btnCerrar: { marginTop: '20px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#1e293b', color: 'white', cursor: 'pointer' },
  btnGuardar: { width: '100%', marginTop: '20px', padding: '15px', borderRadius: '15px', fontWeight: '900', border: 'none', color: 'white', cursor: 'pointer' },
  itemServicio: { background: '#f8fafc', padding: '15px', borderRadius: '15px', marginBottom: '10px', border: '1px solid #edf2f7' },
  footerModal: { background: '#FDF2F8', padding: '20px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardComision: { background: 'white', padding: '30px', borderRadius: '35px', cursor: 'pointer', border: '1px solid #fce7f3', boxShadow: '0 10px 20px rgba(0,0,0,0.02)' }
});
