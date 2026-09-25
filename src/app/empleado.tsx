import { useCallback, useEffect, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL, HEADERS_NGROK } from '@/constants/api';
import { COLORS } from '@/constants/theme';

// Tipos alineados con el backend real (Rodrigo, revisado 23/09 contra
// github.com/NumberThreee/cerveceria-backend, rama feature/catalogo-productos).
// Los modelos Pedido/DetallePedido/Producto del backend NO tienen anotación
// @JsonProperty, así que Spring los serializa con el nombre tal cual está en
// el código Java (camelCase): montoTotal, clienteUuid, precioUnitarioHistorico.
type ProductoDelDetalle = {
  id: number;
  nombre: string;
};

type DetallePedido = {
  id: number;
  producto: ProductoDelDetalle;
  cantidad: number;
  precioUnitarioHistorico: number;
};

// PENDIENTE: todavía no se confirmó el pago (recién generado, o el cliente
// nunca terminó de pagar). RECHAZADO: Mercado Pago devolvió el pago como
// rechazado/cancelado (requiere que Rodrigo suba el estado nuevo al back —
// ver nota en buscarPedidoEscaneado). PAGADO: listo para entregar. ENTREGADO:
// ya se le dio al cliente (por eso el QR es de uso único: una vez entregado,
// volver a escanearlo muestra este mismo estado y no deja entregar de nuevo).
type EstadoPedido = 'PENDIENTE' | 'PAGADO' | 'RECHAZADO' | 'ENTREGADO';

type Pedido = {
  id: number;
  estado: EstadoPedido;
  montoTotal: number;
  detalles: DetallePedido[];
};

type EntregaHistorial = {
  idPedido: number;
  montoTotal: number;
  cantidadItems: number;
  nombreEmpleado: string;
  hora: string; // ISO, se formatea al mostrar
};

const CLAVE_NOMBRE_GUARDADO = 'empleado_nombre_guardado';
const CLAVE_HISTORIAL = 'historial_entregas_empleado';

const ESTADO_INFO: Record<EstadoPedido, { etiqueta: string; color: string; emoji: string }> = {
  PAGADO: { etiqueta: 'PAGO', color: '#3FA34D', emoji: '✅' },
  RECHAZADO: { etiqueta: 'RECHAZADO', color: '#D64545', emoji: '❌' },
  PENDIENTE: { etiqueta: 'PENDIENTE (no pagado)', color: '#D6A93F', emoji: '⏳' },
  ENTREGADO: { etiqueta: 'YA ENTREGADO', color: '#6B6F76', emoji: '📦' },
};

// Pantalla 5: acceso del personal de barra.
//
// Flujo real contra el backend de Rodrigo (revisado 23/09, actualizado 25/09
// para el escaneo de QR de compra):
//   1) Login: GET /api/empleado/pedidos (header X-Empleado-Pin) — no hay un
//      endpoint de login dedicado, así que validamos la contraseña/PIN
//      llamando a este mismo endpoint y mirando si devuelve 401. El "nombre"
//      que se ingresa en el login NO lo valida el backend (el empleado en la
//      base solo tiene nombre+pin, pero el pin ya identifica de sobra quién
//      entra); lo guardamos localmente para mostrarlo en pantalla y en el
//      historial de entregas de este teléfono.
//   2) Escanear QR del cliente (pantalla de "confirmación de compra", que
//      muestra un QR con el id_pedido) → GET /api/empleado/pedidos/{id}
//      (header X-Empleado-Pin). ¡OJO! Este endpoint puntual todavía NO existe
//      en el backend: hoy Rodrigo solo tiene la lista general. Hay que
//      pedirle que lo agregue (le paso el código Java) antes de que esto
//      funcione con pedidos reales. Mientras no esté, esta pantalla va a
//      mostrar "Pedido no encontrado" para cualquier QR real que se escanee
//      — para probar el flujo completo sin depender de eso, usar el botón
//      "🧪 Simular escaneo".
//   3) POST /api/empleado/pedidos/{id}/entregar (header X-Empleado-Pin) para
//      marcarlo como entregado — este endpoint ya existe y no cambia.
//   4) El historial de entregas es 100% local (AsyncStorage, en este
//      teléfono): el backend no guarda qué empleado entregó cada pedido, así
//      que no hay (todavía) un historial "real" compartido entre celulares.
export default function EmpleadoScreen() {
  const [vista, setVista] = useState<
    'login' | 'home' | 'lista' | 'detalleLista' | 'escaneando' | 'detalleEscaneo' | 'historial'
  >('login');

  // --- Login ---
  const [nombre, setNombre] = useState('');
  const [pin, setPin] = useState('');
  const [nombreSesion, setNombreSesion] = useState('');
  const [pinSesion, setPinSesion] = useState('');
  const [esDemo, setEsDemo] = useState(false);
  const [cargandoLogin, setCargandoLogin] = useState(false);

  // --- Lista de pedidos por entregar (pantalla "clásica") ---
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);

  // --- Escaneo de QR del cliente ---
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneando, setEscaneando] = useState(true);
  const [buscandoPedido, setBuscandoPedido] = useState(false);
  const [pedidoEscaneado, setPedidoEscaneado] = useState<Pedido | null>(null);
  const [marcandoEntregado, setMarcandoEntregado] = useState(false);

  // --- Historial local ---
  const [historial, setHistorial] = useState<EntregaHistorial[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_NOMBRE_GUARDADO).then((guardado) => {
      if (guardado) setNombre(guardado);
    });
  }, []);

  // ---------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------
  const iniciarSesion = useCallback(async () => {
    setCargandoLogin(true);
    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/empleado/pedidos`, {
        headers: { 'X-Empleado-Pin': pin, ...HEADERS_NGROK },
      });

      if (respuesta.status === 401) {
        Alert.alert('Contraseña incorrecta', 'Probá de nuevo.');
        setPin('');
        return;
      }

      if (!respuesta.ok) {
        throw new Error(`El servidor respondió con un error (código ${respuesta.status})`);
      }

      const datos = await respuesta.json();
      const nombreAGuardar = nombre.trim() || 'Empleado';

      await AsyncStorage.setItem(CLAVE_NOMBRE_GUARDADO, nombreAGuardar);

      setPedidos(datos);
      setEsDemo(false);
      setNombreSesion(nombreAGuardar);
      setPinSesion(pin);
      setVista('home');
    } catch (error) {
      Alert.alert(
        'No se pudo conectar con el backend',
        'Revisá que el servidor esté prendido y que la dirección en src/constants/api.ts sea la correcta.\n\nDetalle: ' +
          String(error),
      );
    } finally {
      setCargandoLogin(false);
    }
  }, [nombre, pin]);

  // Atajo de prueba (TEMPORAL): entra directo con una sesión de mentira, sin
  // depender del backend real. Sacar antes de entregar la app.
  const entrarComoDemo = () => {
    setPedidos([
      {
        id: 1001,
        estado: 'PAGADO',
        montoTotal: 16700,
        detalles: [
          { id: 1, producto: { id: 1, nombre: 'Golden Ale' }, cantidad: 1, precioUnitarioHistorico: 8000 },
          { id: 2, producto: { id: 9, nombre: 'IBU' }, cantidad: 1, precioUnitarioHistorico: 13000 },
        ],
      },
      {
        id: 1002,
        estado: 'PAGADO',
        montoTotal: 8000,
        detalles: [{ id: 3, producto: { id: 3, nombre: 'Hazi IPA' }, cantidad: 1, precioUnitarioHistorico: 8000 }],
      },
    ]);
    setEsDemo(true);
    setNombreSesion(nombre.trim() || 'Mozo Demo');
    setPinSesion('demo');
    setVista('home');
  };

  const cerrarSesion = () => {
    setVista('login');
    setPin('');
    setPedidos([]);
    setPedidoSeleccionado(null);
    setPedidoEscaneado(null);
    setEsDemo(false);
  };

  // ---------------------------------------------------------------------
  // Lista de pedidos por entregar (GET /api/empleado/pedidos)
  // ---------------------------------------------------------------------
  const traerPedidos = useCallback(async () => {
    if (esDemo) return;
    setCargandoLista(true);
    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/empleado/pedidos`, {
        headers: { 'X-Empleado-Pin': pinSesion, ...HEADERS_NGROK },
      });
      if (!respuesta.ok) {
        throw new Error(`El servidor respondió con un error (código ${respuesta.status})`);
      }
      setPedidos(await respuesta.json());
    } catch (error) {
      Alert.alert('No se pudo actualizar la lista', String(error));
    } finally {
      setCargandoLista(false);
    }
  }, [esDemo, pinSesion]);

  // ---------------------------------------------------------------------
  // Historial local de entregas
  // ---------------------------------------------------------------------
  const abrirHistorial = useCallback(async () => {
    try {
      const guardado = await AsyncStorage.getItem(CLAVE_HISTORIAL);
      const lista: EntregaHistorial[] = guardado ? JSON.parse(guardado) : [];
      setHistorial(lista.slice().reverse()); // más reciente primero
    } catch {
      setHistorial([]);
    }
    setVista('historial');
  }, []);

  const registrarEnHistorial = async (pedido: Pedido) => {
    const entrada: EntregaHistorial = {
      idPedido: pedido.id,
      montoTotal: pedido.montoTotal,
      cantidadItems: pedido.detalles?.reduce((suma, d) => suma + d.cantidad, 0) ?? 0,
      nombreEmpleado: nombreSesion,
      hora: new Date().toISOString(),
    };
    try {
      const guardado = await AsyncStorage.getItem(CLAVE_HISTORIAL);
      const lista: EntregaHistorial[] = guardado ? JSON.parse(guardado) : [];
      lista.push(entrada);
      await AsyncStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(lista));
    } catch {
      // El historial es solo una comodidad local: si falla el guardado, no
      // bloqueamos el flujo de entrega por eso.
    }
  };

  // ---------------------------------------------------------------------
  // Escanear el QR de compra del cliente
  // ---------------------------------------------------------------------
  const irAEscanear = () => {
    setPedidoEscaneado(null);
    setEscaneando(true);
    setVista('escaneando');
  };

  const buscarPedidoEscaneado = useCallback(
    async (idTexto: string) => {
      setBuscandoPedido(true);
      try {
        const respuesta = await fetch(`${API_BASE_URL}/api/empleado/pedidos/${idTexto}`, {
          headers: { 'X-Empleado-Pin': pinSesion, ...HEADERS_NGROK },
        });

        if (respuesta.status === 401) {
          Alert.alert('Sesión inválida', 'Volvé a ingresar tu contraseña.');
          cerrarSesion();
          return;
        }

        if (respuesta.status === 404) {
          Alert.alert(
            'Pedido no encontrado',
            'Ese QR no corresponde a ningún pedido. Si es un QR real de un cliente, avisale a Rodrigo: puede que todavía no haya subido el endpoint GET /api/empleado/pedidos/{id}.',
            [{ text: 'Seguir escaneando', onPress: () => setEscaneando(true) }],
          );
          return;
        }

        if (!respuesta.ok) {
          throw new Error(`El servidor respondió con un error (código ${respuesta.status})`);
        }

        const datos: Pedido = await respuesta.json();
        setPedidoEscaneado(datos);
        setVista('detalleEscaneo');
      } catch (error) {
        Alert.alert('No se pudo consultar el pedido', String(error), [
          { text: 'Seguir escaneando', onPress: () => setEscaneando(true) },
        ]);
      } finally {
        setBuscandoPedido(false);
      }
    },
    [pinSesion],
  );

  const alEscanearQr = useCallback(
    ({ data }: { data: string }) => {
      if (!escaneando) return;
      setEscaneando(false);
      buscarPedidoEscaneado(data.trim());
    },
    [escaneando, buscarPedidoEscaneado],
  );

  // Atajo de prueba (TEMPORAL): simula el resultado de un escaneo sin cámara
  // ni backend real, rotando entre los estados posibles. Sacar antes de
  // entregar la app.
  const simularEscaneo = () => {
    const opciones: Pedido[] = [
      {
        id: 2001,
        estado: 'PAGADO',
        montoTotal: 21000,
        detalles: [{ id: 1, producto: { id: 6, nombre: 'IPA' }, cantidad: 1, precioUnitarioHistorico: 8000 },
          { id: 2, producto: { id: 24, nombre: 'Margarita' }, cantidad: 1, precioUnitarioHistorico: 13000 }],
      },
      { id: 2002, estado: 'RECHAZADO', montoTotal: 13000, detalles: [] },
      { id: 2003, estado: 'ENTREGADO', montoTotal: 8000, detalles: [] },
    ];
    const elegido = opciones[Math.floor(Math.random() * opciones.length)];
    setPedidoEscaneado(elegido);
    setVista('detalleEscaneo');
  };

  const marcarEntregado = async (pedido: Pedido) => {
    setMarcandoEntregado(true);

    if (esDemo || pedido.id >= 2000) {
      // Modo prueba (login demo, o un pedido simulado con "Simular escaneo").
      setTimeout(async () => {
        await registrarEnHistorial(pedido);
        setMarcandoEntregado(false);
        Alert.alert('¡Listo! (modo prueba)', 'Pedido marcado como entregado.', [
          { text: 'OK', onPress: () => setVista('home') },
        ]);
      }, 400);
      return;
    }

    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/empleado/pedidos/${pedido.id}/entregar`, {
        method: 'POST',
        headers: { 'X-Empleado-Pin': pinSesion, ...HEADERS_NGROK },
      });

      if (!respuesta.ok) {
        throw new Error(`El servidor respondió con un error (código ${respuesta.status})`);
      }

      await registrarEnHistorial(pedido);
      Alert.alert('¡Listo!', 'Pedido marcado como entregado.', [
        { text: 'OK', onPress: () => setVista('home') },
      ]);
    } catch (error) {
      Alert.alert('No se pudo actualizar el pedido', String(error));
    } finally {
      setMarcandoEntregado(false);
    }
  };

  // =======================================================================
  // Pantalla de login
  // =======================================================================
  if (vista === 'login') {
    return (
      <SafeAreaView style={styles.centrado}>
        <Text style={styles.titulo}>🔒 Acceso de empleado</Text>
        <Text style={styles.texto}>Ingresá tu nombre y tu contraseña.</Text>

        <TextInput
          style={styles.inputNombre}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Nombre"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          secureTextEntry
          placeholder="Contraseña"
          placeholderTextColor={COLORS.textMuted}
        />
        <Pressable
          style={[styles.boton, (cargandoLogin || pin.length === 0) && styles.botonDeshabilitado]}
          onPress={iniciarSesion}
          disabled={cargandoLogin || pin.length === 0}
        >
          {cargandoLogin ? (
            <ActivityIndicator color={COLORS.onAccent} />
          ) : (
            <Text style={styles.botonTexto}>Ingresar</Text>
          )}
        </Pressable>

        <Pressable onPress={entrarComoDemo} style={styles.botonPrueba}>
          <Text style={styles.linkPrueba}>🧪 Entrar en modo prueba</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // =======================================================================
  // Pantalla de inicio (home) del empleado
  // =======================================================================
  if (vista === 'home') {
    return (
      <SafeAreaView style={styles.centrado}>
        <Text style={styles.titulo}>👋 Hola, {nombreSesion}</Text>
        <Text style={styles.texto}>¿Qué querés hacer?</Text>

        <Pressable style={styles.boton} onPress={irAEscanear}>
          <Text style={styles.botonTexto}>📷 Escanear QR de cliente</Text>
        </Pressable>

        <Pressable
          style={[styles.boton, styles.botonSecundario]}
          onPress={() => {
            setVista('lista');
            if (!esDemo) traerPedidos();
          }}
        >
          <Text style={[styles.botonTexto, styles.botonSecundarioTexto]}>📋 Pedidos por entregar</Text>
        </Pressable>

        <Pressable style={[styles.boton, styles.botonSecundario]} onPress={abrirHistorial}>
          <Text style={[styles.botonTexto, styles.botonSecundarioTexto]}>🕒 Historial de entregas</Text>
        </Pressable>

        <Pressable onPress={cerrarSesion} style={styles.botonPrueba}>
          <Text style={styles.linkPrueba}>Cerrar sesión</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // =======================================================================
  // Escaneando el QR del cliente
  // =======================================================================
  if (vista === 'escaneando') {
    if (!permission) {
      return <View style={styles.centrado} />;
    }

    if (!permission.granted) {
      return (
        <SafeAreaView style={styles.centrado}>
          <Text style={styles.titulo}>Casi listo</Text>
          <Text style={styles.texto}>Necesitamos acceso a tu cámara para escanear el QR del cliente.</Text>
          <Pressable style={styles.boton} onPress={requestPermission}>
            <Text style={styles.botonTexto}>Dar permiso a la cámara</Text>
          </Pressable>
          <Pressable onPress={simularEscaneo} style={styles.botonPrueba}>
            <Text style={styles.linkPrueba}>🧪 Simular escaneo</Text>
          </Pressable>
          <Pressable onPress={() => setVista('home')} style={styles.botonPrueba}>
            <Text style={styles.linkPrueba}>Volver</Text>
          </Pressable>
        </SafeAreaView>
      );
    }

    return (
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={escaneando ? alEscanearQr : undefined}
        />

        <SafeAreaView style={styles.overlay}>
          <View style={styles.marco} />

          <View style={styles.instruccionContenedor}>
            <Text style={styles.instruccion}>
              {buscandoPedido ? 'Buscando pedido...' : 'Apuntá al QR del cliente'}
            </Text>
            {buscandoPedido && <ActivityIndicator size="small" color={COLORS.accent} style={{ marginTop: 8 }} />}
          </View>

          <View style={styles.panelInferior}>
            <Pressable onPress={simularEscaneo}>
              <Text style={styles.linkPrueba}>🧪 Simular escaneo</Text>
            </Pressable>
            <Pressable onPress={() => setVista('home')}>
              <Text style={styles.linkPersonal}>Volver al inicio</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // =======================================================================
  // Detalle de un pedido escaneado
  // =======================================================================
  if (vista === 'detalleEscaneo' && pedidoEscaneado) {
    const info = ESTADO_INFO[pedidoEscaneado.estado] ?? ESTADO_INFO.PENDIENTE;
    const puedeEntregar = pedidoEscaneado.estado === 'PAGADO';

    return (
      <SafeAreaView style={styles.centrado}>
        <Text style={styles.titulo}>Pedido #{pedidoEscaneado.id}</Text>

        <View style={[styles.insignia, { backgroundColor: info.color }]}>
          <Text style={styles.insigniaTexto}>
            {info.emoji} {info.etiqueta}
          </Text>
        </View>

        {pedidoEscaneado.detalles?.length > 0 && (
          <View style={styles.detalle}>
            {pedidoEscaneado.detalles.map((detalle) => (
              <Text key={detalle.id} style={styles.texto}>
                {detalle.cantidad}x {detalle.producto?.nombre}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.total}>Total: ${pedidoEscaneado.montoTotal}</Text>

        {puedeEntregar ? (
          <Pressable
            style={[styles.boton, marcandoEntregado && styles.botonDeshabilitado]}
            onPress={() => marcarEntregado(pedidoEscaneado)}
            disabled={marcandoEntregado}
          >
            {marcandoEntregado ? (
              <ActivityIndicator color={COLORS.onAccent} />
            ) : (
              <Text style={styles.botonTexto}>Marcar como entregado</Text>
            )}
          </Pressable>
        ) : (
          <Text style={[styles.texto, { marginTop: 4 }]}>
            {pedidoEscaneado.estado === 'ENTREGADO'
              ? 'Este pedido ya fue entregado antes. El QR es de un solo uso.'
              : pedidoEscaneado.estado === 'RECHAZADO'
                ? 'El pago de este pedido fue rechazado. No corresponde entregarlo.'
                : 'Este pedido todavía no tiene el pago confirmado.'}
          </Text>
        )}

        <Pressable onPress={irAEscanear} style={styles.botonPrueba}>
          <Text style={styles.linkPrueba}>Escanear otro QR</Text>
        </Pressable>
        <Pressable onPress={() => setVista('home')} style={styles.botonPrueba}>
          <Text style={styles.linkPrueba}>Volver al inicio</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // =======================================================================
  // Historial de entregas (local, en este teléfono)
  // =======================================================================
  if (vista === 'historial') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.tituloLista}>Historial de entregas</Text>
          <Pressable onPress={() => setVista('home')}>
            <Text style={styles.linkPrueba}>Volver</Text>
          </Pressable>
        </View>

        <FlatList
          style={styles.listaContenedor}
          data={historial}
          keyExtractor={(item, indice) => `${item.idPedido}-${item.hora}-${indice}`}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <Text style={[styles.texto, { marginTop: 24 }]}>
              Todavía no entregaste ningún pedido desde este teléfono.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.filaPedido}>
              <View style={styles.filaInfo}>
                <Text style={styles.nombrePedido}>Pedido #{item.idPedido}</Text>
                <Text style={styles.descripcionPedido}>
                  {item.cantidadItems} {item.cantidadItems === 1 ? 'ítem' : 'ítems'} · entregado por{' '}
                  {item.nombreEmpleado} ·{' '}
                  {new Date(item.hora).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={styles.precioPedido}>${item.montoTotal}</Text>
            </View>
          )}
        />
      </SafeAreaView>
    );
  }

  // =======================================================================
  // Detalle de un pedido de la lista "por entregar"
  // =======================================================================
  if (vista === 'detalleLista' && pedidoSeleccionado) {
    return (
      <SafeAreaView style={styles.centrado}>
        <Text style={styles.titulo}>Pedido #{pedidoSeleccionado.id}</Text>
        <Text style={styles.texto}>Estado: {pedidoSeleccionado.estado}</Text>

        <View style={styles.detalle}>
          {pedidoSeleccionado.detalles?.map((detalle) => (
            <Text key={detalle.id} style={styles.texto}>
              {detalle.cantidad}x {detalle.producto?.nombre}
            </Text>
          ))}
        </View>

        <Text style={styles.total}>Total: ${pedidoSeleccionado.montoTotal}</Text>

        <Pressable
          style={[styles.boton, marcandoEntregado && styles.botonDeshabilitado]}
          onPress={() => marcarEntregado(pedidoSeleccionado)}
          disabled={marcandoEntregado}
        >
          {marcandoEntregado ? (
            <ActivityIndicator color={COLORS.onAccent} />
          ) : (
            <Text style={styles.botonTexto}>Marcar como entregado</Text>
          )}
        </Pressable>

        <Pressable onPress={() => setVista('lista')} style={styles.botonPrueba}>
          <Text style={styles.linkPrueba}>Volver a la lista</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // =======================================================================
  // Lista de pedidos pagados, esperando entrega
  // =======================================================================
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.tituloLista}>Pedidos por entregar</Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {!esDemo && (
            <Pressable onPress={traerPedidos}>
              <Text style={styles.linkPrueba}>🔄 Actualizar</Text>
            </Pressable>
          )}
          <Pressable onPress={() => setVista('home')}>
            <Text style={styles.linkPrueba}>Inicio</Text>
          </Pressable>
        </View>
      </View>

      {cargandoLista ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          style={styles.listaContenedor}
          data={pedidos}
          keyExtractor={(pedido) => String(pedido.id)}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <Text style={[styles.texto, { marginTop: 24 }]}>
              No hay pedidos pagados esperando entrega.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.filaPedido}
              onPress={() => {
                setPedidoSeleccionado(item);
                setVista('detalleLista');
              }}
            >
              <View style={styles.filaInfo}>
                <Text style={styles.nombrePedido}>Pedido #{item.id}</Text>
                <Text style={styles.descripcionPedido}>
                  {item.detalles?.length ?? 0} {item.detalles?.length === 1 ? 'ítem' : 'ítems'}
                </Text>
              </View>
              <Text style={styles.precioPedido}>${item.montoTotal}</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: COLORS.background,
  },
  titulo: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center' },
  texto: { textAlign: 'center', fontSize: 16, color: COLORS.textSecondary },
  total: { fontSize: 18, fontWeight: 'bold', marginTop: 4, color: COLORS.textPrimary },
  detalle: { alignItems: 'center', gap: 2, marginVertical: 6 },
  inputNombre: {
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'center',
    width: 220,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 18,
    textAlign: 'center',
    width: 220,
    letterSpacing: 2,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  boton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
    minWidth: 240,
    alignItems: 'center',
  },
  botonSecundario: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  botonSecundarioTexto: { color: COLORS.textPrimary },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { color: COLORS.onAccent, fontSize: 16, fontWeight: '600' },
  botonPrueba: { marginTop: 12, padding: 10 },
  linkPrueba: {
    color: COLORS.textPrimary,
    fontSize: 13,
    textDecorationLine: 'underline',
    opacity: 0.85,
  },
  linkPersonal: {
    color: COLORS.textSecondary,
    fontSize: 12,
    opacity: 0.8,
  },

  insignia: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginVertical: 4,
  },
  insigniaTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tituloLista: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  listaContenedor: { flex: 1 },
  lista: { paddingHorizontal: 20, paddingBottom: 16, gap: 12, flexGrow: 1 },
  filaPedido: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  filaInfo: { flex: 1, paddingRight: 12 },
  nombrePedido: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  descripcionPedido: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  precioPedido: { fontSize: 15, fontWeight: '600', color: COLORS.accent },

  // Escaneo de QR (mismo estilo que la pantalla de escaneo del cliente)
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  marco: {
    width: 250,
    height: 250,
    borderWidth: 4,
    borderColor: COLORS.accent,
    borderRadius: 16,
  },
  instruccionContenedor: { marginTop: 28, alignItems: 'center' },
  instruccion: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  panelInferior: {
    position: 'absolute',
    bottom: 28,
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 18,
  },
});
