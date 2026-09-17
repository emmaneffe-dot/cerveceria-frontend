import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

import { API_BASE_URL } from '@/constants/api';

// Pantalla 2: catálogo de productos + carrito.
//
// Por ahora los productos son de mentira (mock), escritos acá mismo abajo.
// Cuando tengamos la URL real del backend, esta lista se va a reemplazar
// por un pedido a GET /api/productos (mismo formato: id, nombre, precio).
type Producto = {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: 'Cerveza' | 'Comida';
};

const PRODUCTOS_MOCK: Producto[] = [
  { id: 1, nombre: 'IPA Artesanal', descripcion: 'Pinta 500ml, bien lupulada', precio: 4500, categoria: 'Cerveza' },
  { id: 2, nombre: 'Rubia Golden', descripcion: 'Pinta 500ml, suave', precio: 4200, categoria: 'Cerveza' },
  { id: 3, nombre: 'Stout', descripcion: 'Pinta 500ml, tostada', precio: 4800, categoria: 'Cerveza' },
  { id: 4, nombre: 'Tabla de fiambres', descripcion: 'Para compartir', precio: 8500, categoria: 'Comida' },
  { id: 5, nombre: 'Papas fritas', descripcion: 'Porción grande', precio: 3800, categoria: 'Comida' },
];

function formatearPrecio(valor: number) {
  return `$${valor.toLocaleString('es-AR')}`;
}

export default function CatalogoScreen() {
  const [numeroMesa, setNumeroMesa] = useState<string | null>(null);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [procesandoPago, setProcesandoPago] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('numero_mesa').then(setNumeroMesa);
  }, []);

  const sumarUno = (id: number) => {
    setCantidades((actual) => ({ ...actual, [id]: (actual[id] ?? 0) + 1 }));
  };

  const restarUno = (id: number) => {
    setCantidades((actual) => {
      const nuevaCantidad = (actual[id] ?? 0) - 1;
      const copia = { ...actual };
      if (nuevaCantidad <= 0) {
        delete copia[id];
      } else {
        copia[id] = nuevaCantidad;
      }
      return copia;
    });
  };

  const { totalItems, totalPrecio } = useMemo(() => {
    let items = 0;
    let precio = 0;
    for (const producto of PRODUCTOS_MOCK) {
      const cantidad = cantidades[producto.id] ?? 0;
      items += cantidad;
      precio += cantidad * producto.precio;
    }
    return { totalItems: items, totalPrecio: precio };
  }, [cantidades]);

  // Pantalla 3 (Semana 2): al tocar "Pagar", le pedimos al backend que
  // genere el pedido y nos devuelva el link de pago de Mercado Pago
  // (init_point). Lo abrimos en un navegador dentro de la app.
  const alPresionarPagar = async () => {
    const items = PRODUCTOS_MOCK.filter((producto) => (cantidades[producto.id] ?? 0) > 0).map(
      (producto) => ({ id_producto: producto.id, cantidad: cantidades[producto.id] }),
    );

    if (items.length === 0) return;

    setProcesandoPago(true);
    try {
      const clienteUuid = await AsyncStorage.getItem('cliente_uuid');
      const numeroMesaGuardado = await AsyncStorage.getItem('numero_mesa');

      const respuesta = await fetch(`${API_BASE_URL}/api/pedidos/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_uuid: clienteUuid,
          numero_mesa: numeroMesaGuardado ? parseInt(numeroMesaGuardado, 10) : null,
          items,
        }),
      });

      if (!respuesta.ok) {
        throw new Error(`El servidor respondió con un error (código ${respuesta.status})`);
      }

      const datos = await respuesta.json();

      await AsyncStorage.setItem('id_pedido', String(datos.id_pedido));

      // Abre el link de pago de Mercado Pago en un navegador dentro de la app.
      await WebBrowser.openBrowserAsync(datos.init_point);

      router.replace('/confirmacion');
    } catch (error) {
      Alert.alert(
        'No se pudo iniciar el pago',
        'Revisá que el backend esté prendido y que la dirección en src/constants/api.ts sea la correcta.\n\nDetalle: ' +
          String(error),
      );
    } finally {
      setProcesandoPago(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Menú</Text>
        {numeroMesa && <Text style={styles.mesa}>Mesa {numeroMesa}</Text>}
      </View>

      <FlatList
        data={PRODUCTOS_MOCK}
        keyExtractor={(producto) => String(producto.id)}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => {
          const cantidad = cantidades[item.id] ?? 0;
          return (
            <View style={styles.fila}>
              <View style={styles.filaInfo}>
                <Text style={styles.nombreProducto}>{item.nombre}</Text>
                <Text style={styles.descripcionProducto}>{item.descripcion}</Text>
                <Text style={styles.precioProducto}>{formatearPrecio(item.precio)}</Text>
              </View>

              <View style={styles.controles}>
                <Pressable
                  style={[styles.botonCantidad, cantidad === 0 && styles.botonCantidadDeshabilitado]}
                  onPress={() => restarUno(item.id)}
                  disabled={cantidad === 0}
                >
                  <Text style={styles.botonCantidadTexto}>−</Text>
                </Pressable>
                <Text style={styles.cantidadTexto}>{cantidad}</Text>
                <Pressable style={styles.botonCantidad} onPress={() => sumarUno(item.id)}>
                  <Text style={styles.botonCantidadTexto}>+</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      {totalItems > 0 && (
        <View style={styles.barraInferior}>
          <View>
            <Text style={styles.resumenItems}>{totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}</Text>
            <Text style={styles.resumenTotal}>{formatearPrecio(totalPrecio)}</Text>
          </View>
          <Pressable
            style={[styles.botonPagar, procesandoPago && styles.botonPagarDeshabilitado]}
            onPress={alPresionarPagar}
            disabled={procesandoPago}
          >
            {procesandoPago ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonPagarTexto}>Pagar</Text>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  titulo: { fontSize: 26, fontWeight: 'bold' },
  mesa: { fontSize: 14, color: '#777', marginTop: 2 },
  lista: { paddingHorizontal: 20, paddingBottom: 16, gap: 14 },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  filaInfo: { flex: 1, paddingRight: 12 },
  nombreProducto: { fontSize: 16, fontWeight: '600' },
  descripcionProducto: { fontSize: 13, color: '#777', marginTop: 2 },
  precioProducto: { fontSize: 15, fontWeight: '600', color: '#D97706', marginTop: 4 },
  controles: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  botonCantidad: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCantidadDeshabilitado: { backgroundColor: '#e5c9a3' },
  botonCantidadTexto: { color: '#fff', fontSize: 18, fontWeight: 'bold', lineHeight: 20 },
  cantidadTexto: { fontSize: 16, fontWeight: '600', minWidth: 18, textAlign: 'center' },
  barraInferior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  resumenItems: { fontSize: 13, color: '#777' },
  resumenTotal: { fontSize: 20, fontWeight: 'bold' },
  botonPagar: {
    backgroundColor: '#D97706',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  botonPagarDeshabilitado: { opacity: 0.6 },
  botonPagarTexto: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
