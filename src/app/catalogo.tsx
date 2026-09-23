import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

import { API_BASE_URL, HEADERS_NGROK } from '@/constants/api';
import { COLORS } from '@/constants/theme';
import { CATEGORIAS, PRODUCTOS } from '@/constants/productos';

// Pantalla 2: catálogo de productos + carrito.
//
// Menú real de Ogham (20/09), cargado en src/constants/productos.ts.
// Se muestra separado por categorías (pestañas arriba) porque así lo va a
// mandar el backend más adelante: por sección, no todo junto. Por ahora
// las pestañas solo filtran la lista que ya tenemos acá mismo; el día que
// el backend esté listo, tocar una pestaña puede pasar a pedir esa
// categoría puntual a GET /api/productos?categoria=<clave> en vez de
// filtrar localmente, sin cambiar el resto de la pantalla.
//
// El carrito (cantidades) es uno solo para todo el menú: si el cliente
// agrega cosas de "Cervezas" y después cambia a la pestaña "Vinos", lo que
// ya eligió sigue contando en el total de abajo.
//
// Diseño (20/09): mismo estilo oscuro y premium que la pantalla de bienvenida.

function formatearPrecio(valor: number) {
  return `$${valor.toLocaleString('es-AR')}`;
}

export default function CatalogoScreen() {
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState(CATEGORIAS[0].clave);
  const listaRef = useRef<FlatList>(null);

  // Al cambiar de categoría, volvemos la lista de productos al principio.
  // Antes (sin esto) la lista podía quedar scrolleada a la mitad de la
  // categoría anterior, lo que se sentía como un salto brusco.
  const alTocarCategoria = (clave: string) => {
    setCategoriaActiva(clave);
    listaRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

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

  // Solo los productos de la categoría que se está mostrando ahora.
  const productosDeCategoria = useMemo(
    () => PRODUCTOS.filter((producto) => producto.categoria === categoriaActiva),
    [categoriaActiva],
  );

  const categoriaInfo = useMemo(
    () => CATEGORIAS.find((categoria) => categoria.clave === categoriaActiva),
    [categoriaActiva],
  );

  // El total del carrito se calcula sobre TODOS los productos (no solo los
  // de la categoría activa), para que no se pierda nada al cambiar de
  // pestaña.
  const { totalItems, totalPrecio } = useMemo(() => {
    let items = 0;
    let precio = 0;
    for (const producto of PRODUCTOS) {
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
    const items = PRODUCTOS.filter((producto) => (cantidades[producto.id] ?? 0) > 0).map((producto) => ({
      id_producto: producto.id,
      cantidad: cantidades[producto.id],
    }));

    if (items.length === 0) return;

    setProcesandoPago(true);
    try {
      const clienteUuid = await AsyncStorage.getItem('cliente_uuid');

      const respuesta = await fetch(`${API_BASE_URL}/api/pedidos/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...HEADERS_NGROK },
        body: JSON.stringify({
          cliente_uuid: clienteUuid,
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

  // Atajo de prueba (TEMPORAL): simula que el pago salió bien, para poder
  // revisar la pantalla de confirmación sin depender del backend real.
  // Sacar esto antes de entregar la app.
  const simularPagoExitoso = async () => {
    await AsyncStorage.setItem('id_pedido', 'demo-pedido-1');
    router.replace('/confirmacion');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Menú</Text>
      </View>

      <View style={styles.pestanasContenedor}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pestanas}
        >
          {CATEGORIAS.map((categoria) => {
            const activa = categoria.clave === categoriaActiva;
            return (
              <Pressable
                key={categoria.clave}
                onPress={() => alTocarCategoria(categoria.clave)}
                style={[styles.pestana, activa && styles.pestanaActiva]}
              >
                <Text
                  style={[styles.pestanaTexto, activa && styles.pestanaTextoActivo]}
                  numberOfLines={1}
                >
                  {categoria.icono} {categoria.nombre}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {categoriaInfo && (
        <View style={styles.bannerCategoria}>
          <View style={styles.bannerIconoCirculo}>
            <Text style={styles.bannerIcono}>{categoriaInfo.icono}</Text>
          </View>
          <Text style={styles.bannerTexto}>{categoriaInfo.nombre}</Text>
        </View>
      )}

      <FlatList
        ref={listaRef}
        style={styles.listaContenedor}
        data={productosDeCategoria}
        keyExtractor={(producto) => String(producto.id)}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => {
          const cantidad = cantidades[item.id] ?? 0;
          return (
            <View style={styles.fila}>
              {item.imagen && <Image source={item.imagen} style={styles.fotoProducto} resizeMode="cover" />}
              <View style={styles.filaInfo}>
                <Text style={styles.nombreProducto}>{item.nombre}</Text>
                {!!item.descripcion && <Text style={styles.descripcionProducto}>{item.descripcion}</Text>}
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
        ListFooterComponent={
          <Pressable onPress={simularPagoExitoso} style={styles.linkPruebaContenedor}>
            <Text style={styles.linkPrueba}>🧪 Simular pago exitoso (modo prueba)</Text>
          </Pressable>
        }
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
              <ActivityIndicator color={COLORS.onAccent} />
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
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  titulo: { fontSize: 26, fontWeight: '700', color: COLORS.textPrimary },

  // Alto fijo para la fila de pestañas: así nunca se achica ni se pisa con
  // la lista de productos de abajo, sin importar cuántos productos tenga
  // la categoría elegida (ese era el bug: la lista, al no tener un alto
  // propio, "empujaba" todo y tapaba o cortaba el texto de las pestañas).
  pestanasContenedor: {
    height: 52,
  },
  pestanas: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  pestana: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    flexShrink: 0,
  },
  pestanaActiva: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  pestanaTexto: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  pestanaTextoActivo: { color: COLORS.onAccent },

  // Banner de la categoría activa: ocupa el lugar de la "foto de sección"
  // mientras no tengamos fotos reales de cada categoría (ver comentario en
  // productos.ts). Es un ícono grande + el nombre, para que al cambiar de
  // pestaña quede claro y vistoso en qué sección está el cliente.
  bannerCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 16,
  },
  bannerIconoCirculo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIcono: { fontSize: 22 },
  bannerTexto: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },

  // flex: 1 acá es la parte clave del arreglo: le da a la lista un alto
  // delimitado (el resto de la pantalla) para que haga scroll DENTRO de
  // ese espacio en vez de intentar desplegarse entera y empujar todo lo
  // demás.
  listaContenedor: { flex: 1 },
  lista: { paddingHorizontal: 20, paddingBottom: 16, gap: 14 },
  fila: {
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
  fotoProducto: {
    width: 52,
    height: 52,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: COLORS.surfaceBorder,
  },
  filaInfo: { flex: 1, paddingRight: 12 },
  nombreProducto: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  descripcionProducto: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  precioProducto: { fontSize: 15, fontWeight: '600', color: COLORS.accent, marginTop: 4 },
  controles: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  botonCantidad: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCantidadDeshabilitado: { backgroundColor: COLORS.surfaceBorder },
  botonCantidadTexto: { color: COLORS.onAccent, fontSize: 18, fontWeight: 'bold', lineHeight: 20 },
  cantidadTexto: { fontSize: 16, fontWeight: '600', minWidth: 18, textAlign: 'center', color: COLORS.textPrimary },
  linkPruebaContenedor: { paddingVertical: 16, alignItems: 'center' },
  linkPrueba: { color: COLORS.textSecondary, fontSize: 12, textDecorationLine: 'underline' },
  barraInferior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
  },
  resumenItems: { fontSize: 13, color: COLORS.textSecondary },
  resumenTotal: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
  botonPagar: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 100,
    alignItems: 'center',
  },
  botonPagarDeshabilitado: { opacity: 0.6 },
  botonPagarTexto: { color: COLORS.onAccent, fontSize: 16, fontWeight: '700' },
});
