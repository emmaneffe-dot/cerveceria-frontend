import { useCallback, useState } from 'react';
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

type Pedido = {
  id: number;
  estado: string;
  montoTotal: number;
  detalles: DetallePedido[];
};

// Pantalla 5: acceso del personal de barra.
//
// Diseño real del backend (23/09): no existe un endpoint para buscar UN
// pedido por id, así que esta pantalla ya no escanea QR. El flujo real es:
//   1) GET /api/empleado/pedidos  (header X-Empleado-Pin) → lista de
//      pedidos con estado PAGADO, esperando para entregar.
//   2) El mozo toca un pedido de la lista para ver el detalle.
//   3) POST /api/empleado/pedidos/{id}/entregar (header X-Empleado-Pin)
//      para marcarlo como entregado.
// El PIN no se valida acá: se manda en cada pedido y es el backend el que
// lo valida contra la tabla de empleados (401 si es inválido).
export default function EmpleadoScreen() {
  const [pin, setPin] = useState('');
  const [pinConfirmado, setPinConfirmado] = useState<string | null>(null);
  const [esDemo, setEsDemo] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);
  const [marcandoEntregado, setMarcandoEntregado] = useState(false);

  const traerPedidos = useCallback(async (pinAUsar: string) => {
    setCargando(true);
    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/empleado/pedidos`, {
        headers: { 'X-Empleado-Pin': pinAUsar, ...HEADERS_NGROK },
      });

      if (respuesta.status === 401) {
        Alert.alert('PIN incorrecto', 'Probá de nuevo.');
        setPin('');
        return;
      }

      if (!respuesta.ok) {
        throw new Error(`El servidor respondió con un error (código ${respuesta.status})`);
      }

      const datos = await respuesta.json();
      setPedidos(datos);
      setEsDemo(false);
      setPinConfirmado(pinAUsar);
    } catch (error) {
      Alert.alert(
        'No se pudo conectar con el backend',
        'Revisá que el servidor esté prendido y que la dirección en src/constants/api.ts sea la correcta.\n\nDetalle: ' +
          String(error),
      );
    } finally {
      setCargando(false);
    }
  }, []);

  const marcarEntregado = async (pedido: Pedido) => {
    setMarcandoEntregado(true);

    // Modo prueba: no hay backend real de por medio, solo simulamos.
    if (esDemo) {
      setTimeout(() => {
        setMarcandoEntregado(false);
        Alert.alert('¡Listo! (modo prueba)', 'Pedido marcado como entregado.', [
          {
            text: 'OK',
            onPress: () => {
              setPedidoSeleccionado(null);
              setPedidos((actual) => actual.filter((p) => p.id !== pedido.id));
            },
          },
        ]);
      }, 400);
      return;
    }

    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/empleado/pedidos/${pedido.id}/entregar`, {
        method: 'POST',
        headers: { 'X-Empleado-Pin': pinConfirmado ?? '', ...HEADERS_NGROK },
      });

      if (!respuesta.ok) {
        throw new Error(`El servidor respondió con un error (código ${respuesta.status})`);
      }

      Alert.alert('¡Listo!', 'Pedido marcado como entregado.', [
        {
          text: 'OK',
          onPress: () => {
            setPedidoSeleccionado(null);
            setPedidos((actual) => actual.filter((p) => p.id !== pedido.id));
          },
        },
      ]);
    } catch (error) {
      Alert.alert('No se pudo actualizar el pedido', String(error));
    } finally {
      setMarcandoEntregado(false);
    }
  };

  // Atajo de prueba (TEMPORAL): entra directo con una lista de pedidos de
  // mentira, sin depender del backend real. Sacar antes de entregar la app.
  const verPedidosDePrueba = () => {
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
    setPinConfirmado('demo');
  };

  // Pantalla de PIN
  if (!pinConfirmado) {
    return (
      <SafeAreaView style={styles.centrado}>
        <Text style={styles.titulo}>🔒 Acceso de empleado</Text>
        <Text style={styles.texto}>Ingresá tu PIN para ver los pedidos.</Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          placeholder="PIN"
        />
        <Pressable
          style={[styles.boton, (cargando || pin.length === 0) && styles.botonDeshabilitado]}
          onPress={() => traerPedidos(pin)}
          disabled={cargando || pin.length === 0}
        >
          {cargando ? (
            <ActivityIndicator color={COLORS.onAccent} />
          ) : (
            <Text style={styles.botonTexto}>Ingresar</Text>
          )}
        </Pressable>

        <Pressable onPress={verPedidosDePrueba} style={styles.botonPrueba}>
          <Text style={styles.linkPrueba}>🧪 Ver pedidos de prueba</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Detalle de un pedido
  if (pedidoSeleccionado) {
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

        <Pressable onPress={() => setPedidoSeleccionado(null)}>
          <Text style={styles.linkPrueba}>Volver a la lista</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Lista de pedidos pagados, esperando entrega
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.tituloLista}>Pedidos por entregar</Text>
        {!esDemo && (
          <Pressable onPress={() => traerPedidos(pinConfirmado)}>
            <Text style={styles.linkPrueba}>🔄 Actualizar</Text>
          </Pressable>
        )}
      </View>

      {cargando ? (
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
            <Pressable style={styles.filaPedido} onPress={() => setPedidoSeleccionado(item)}>
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
  botonPrueba: { marginTop: 24, padding: 10 },
  linkPrueba: {
    color: COLORS.textPrimary,
    fontSize: 13,
    textDecorationLine: 'underline',
    opacity: 0.85,
  },

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
});
