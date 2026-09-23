import { useCallback, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL, HEADERS_NGROK } from '@/constants/api';
import { COLORS } from '@/constants/theme';

// PIN de prueba (TEMPORAL): el backend todavía no definió cómo se
// autentican los empleados (no hay endpoint de login en la guía). Hasta
// que se defina, usamos este PIN fijo solo para poder armar y probar la
// pantalla. Ver "Decisión pendiente" en el resumen del proyecto.
const PIN_DEMO = '1234';

type Pedido = {
  id: number | string;
  estado?: string;
  items?: { nombre?: string; cantidad?: number }[];
  monto_total?: number;
};

// Pantalla 5: acceso del personal de barra. Primero pide un PIN, después
// escanea el QR que le muestra el cliente (el id_pedido) para ver el
// detalle (GET /api/pedidos/{id}) y marcarlo como entregado
// (PUT /api/pedidos/{id}/entregar).
//
// Diseño (20/09): mismo estilo oscuro y premium que el resto de la app.
export default function EmpleadoScreen() {
  const [autenticado, setAutenticado] = useState(false);
  const [pin, setPin] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneando, setEscaneando] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [marcandoEntregado, setMarcandoEntregado] = useState(false);

  const validarPin = () => {
    if (pin === PIN_DEMO) {
      setAutenticado(true);
    } else {
      Alert.alert('PIN incorrecto', 'Probá de nuevo.');
      setPin('');
    }
  };

  const buscarPedido = useCallback(async (idPedido: string) => {
    setEscaneando(false);
    setCargando(true);
    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/pedidos/${idPedido}`, {
        headers: HEADERS_NGROK,
      });

      if (!respuesta.ok) {
        throw new Error(`El servidor respondió con un error (código ${respuesta.status})`);
      }

      const datos = await respuesta.json();
      setPedido(datos);
    } catch (error) {
      Alert.alert(
        'No se pudo traer el pedido',
        'Revisá que el backend esté prendido y que la dirección en src/constants/api.ts sea la correcta.\n\nDetalle: ' +
          String(error),
        [{ text: 'Reintentar', onPress: () => setEscaneando(true) }],
      );
    } finally {
      setCargando(false);
    }
  }, []);

  const alEscanear = useCallback(
    ({ data }: { data: string }) => {
      if (!escaneando) return;
      buscarPedido(data.trim());
    },
    [escaneando, buscarPedido],
  );

  const marcarEntregado = async () => {
    if (!pedido) return;
    setMarcandoEntregado(true);
    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/pedidos/${pedido.id}/entregar`, {
        method: 'PUT',
        headers: HEADERS_NGROK,
      });

      if (!respuesta.ok) {
        throw new Error(`El servidor respondió con un error (código ${respuesta.status})`);
      }

      Alert.alert('¡Listo!', 'Pedido marcado como entregado.', [
        {
          text: 'OK',
          onPress: () => {
            setPedido(null);
            setEscaneando(true);
          },
        },
      ]);
    } catch (error) {
      Alert.alert('No se pudo actualizar el pedido', String(error));
    } finally {
      setMarcandoEntregado(false);
    }
  };

  // Atajo de prueba (TEMPORAL): mostrar un pedido de mentira sin depender
  // del backend real, para poder revisar esta pantalla. Sacar antes de
  // entregar la app.
  const verPedidoDePrueba = () => {
    setPedido({
      id: 'demo-pedido-1',
      estado: 'PAGADO',
      items: [
        { nombre: 'IPA Artesanal', cantidad: 1 },
        { nombre: 'Rubia Golden', cantidad: 1 },
      ],
      monto_total: 8700,
    });
  };

  if (!autenticado) {
    return (
      <SafeAreaView style={styles.centrado}>
        <Text style={styles.titulo}>🔒 Acceso de empleado</Text>
        <Text style={styles.texto}>Ingresá tu PIN para escanear pedidos.</Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          placeholder="PIN"
        />
        <Pressable style={styles.boton} onPress={validarPin}>
          <Text style={styles.botonTexto}>Ingresar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (pedido) {
    return (
      <SafeAreaView style={styles.centrado}>
        <Text style={styles.titulo}>Pedido #{pedido.id}</Text>
        {pedido.estado && <Text style={styles.texto}>Estado: {pedido.estado}</Text>}

        <View style={styles.detalle}>
          {pedido.items?.map((item, indice) => (
            <Text key={indice} style={styles.texto}>
              {item.cantidad}x {item.nombre}
            </Text>
          ))}
        </View>

        {pedido.monto_total != null && <Text style={styles.total}>Total: ${pedido.monto_total}</Text>}

        <Pressable
          style={[styles.boton, marcandoEntregado && styles.botonDeshabilitado]}
          onPress={marcarEntregado}
          disabled={marcandoEntregado}
        >
          {marcandoEntregado ? (
            <ActivityIndicator color={COLORS.onAccent} />
          ) : (
            <Text style={styles.botonTexto}>Marcar como entregado</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setPedido(null);
            setEscaneando(true);
          }}
        >
          <Text style={styles.linkPrueba}>Escanear otro pedido</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return <View style={styles.centrado} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centrado}>
        <Text style={styles.texto}>Necesitamos permiso para usar la cámara.</Text>
        <Pressable style={styles.boton} onPress={requestPermission}>
          <Text style={styles.botonTexto}>Dar permiso a la cámara</Text>
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
        onBarcodeScanned={escaneando ? alEscanear : undefined}
      />

      <SafeAreaView style={styles.overlay}>
        <View style={styles.marco} />
        <Text style={styles.instruccion}>
          {cargando ? 'Buscando pedido...' : 'Escaneá el QR del cliente'}
        </Text>
        {cargando && <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 12 }} />}

        <Pressable onPress={verPedidoDePrueba} style={styles.botonPrueba}>
          <Text style={styles.linkPrueba}>🧪 Ver pedido de prueba</Text>
        </Pressable>
      </SafeAreaView>
    </View>
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
  titulo: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },
  texto: { textAlign: 'center', fontSize: 16, color: COLORS.textSecondary },
  total: { fontSize: 18, fontWeight: 'bold', marginTop: 4, color: COLORS.textPrimary },
  detalle: { alignItems: 'center', gap: 2, marginVertical: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 20,
    textAlign: 'center',
    width: 140,
    letterSpacing: 4,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  boton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { color: COLORS.onAccent, fontSize: 16, fontWeight: '600' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  marco: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: COLORS.accent,
    borderRadius: 16,
  },
  instruccion: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  botonPrueba: { marginTop: 40, padding: 10 },
  linkPrueba: {
    color: COLORS.textPrimary,
    fontSize: 13,
    textDecorationLine: 'underline',
    opacity: 0.85,
  },
});
