import { useCallback, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '@/constants/api';
import { COLORS } from '@/constants/theme';

// Pantalla 1 ("landing" de la app): el cliente escanea el QR físico de su mesa.
// Le pedimos al backend una "sesión anónima" para esa mesa y guardamos lo que
// nos devuelve (el cliente_uuid) en el celular, para usarlo en el resto de
// las pantallas.
//
// Diseño (20/09): paleta oscura y premium, un solo color de acento (dorado),
// con el logo real de Cervecería Ogham (assets/images/logo-ogham.png).
export default function EscaneoMesaScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneando, setEscaneando] = useState(true);
  const [cargando, setCargando] = useState(false);

  const iniciarSesion = useCallback(async (numeroMesa: number) => {
    setEscaneando(false);
    setCargando(true);
    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/sesiones/anonima`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_mesa: numeroMesa }),
      });

      if (!respuesta.ok) {
        throw new Error(`El servidor respondió con un error (código ${respuesta.status})`);
      }

      const datos = await respuesta.json();

      await AsyncStorage.setItem('cliente_uuid', datos.cliente_uuid);
      await AsyncStorage.setItem('numero_mesa', String(datos.numero_mesa));

      router.replace('/catalogo');
    } catch (error) {
      Alert.alert(
        'No se pudo conectar con el backend',
        'Revisá que el servidor esté prendido y que la dirección en src/constants/api.ts sea la correcta.\n\nDetalle: ' +
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

      const numeroMesa = parseInt(data.trim(), 10);

      if (Number.isNaN(numeroMesa)) {
        setEscaneando(false);
        Alert.alert('QR no reconocido', `Se esperaba un número de mesa, pero se leyó: "${data}"`, [
          { text: 'Volver a intentar', onPress: () => setEscaneando(true) },
        ]);
        return;
      }

      iniciarSesion(numeroMesa);
    },
    [escaneando, iniciarSesion],
  );

  // Atajo de prueba (TEMPORAL): mientras no haya backend real, esto permite
  // revisar el catálogo y la pantalla de pago sin depender de la conexión.
  // Sacar esta función y el botón antes de entregar la app.
  const irADemostracion = useCallback(async () => {
    await AsyncStorage.setItem('cliente_uuid', 'demo-uuid-de-prueba');
    await AsyncStorage.setItem('numero_mesa', '12');
    router.replace('/catalogo');
  }, []);

  // Acceso del personal de barra (permanente): lleva a la pantalla de
  // empleado, protegida con PIN. En una versión final capaz conviene
  // esconderlo más (ej. mantener presionado el logo), pero por ahora
  // alcanza con este link chico y discreto.
  const irAEmpleado = useCallback(() => {
    router.push('/empleado');
  }, []);

  if (!permission) {
    return <View style={styles.centrado} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centrado}>
        <Image
          source={require('@/assets/images/logo-ogham.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.titulo}>Bienvenido a Ogham</Text>
        <Text style={styles.texto}>
          Escaneá el código QR de tu mesa para ver la carta y pedir sin esperar al mozo.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
          onPress={requestPermission}
        >
          <Text style={styles.botonTexto}>Dar permiso a la cámara</Text>
        </Pressable>

        <View style={styles.enlacesSecundarios}>
          <Pressable onPress={irADemostracion}>
            <Text style={styles.linkPrueba}>🧪 Modo prueba: ir directo al menú</Text>
          </Pressable>
          <Pressable onPress={irAEmpleado}>
            <Text style={styles.linkPersonal}>👔 Acceso personal</Text>
          </Pressable>
        </View>
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
        <View style={styles.marco}>
          <View style={[styles.esquina, styles.esquinaSuperiorIzquierda]} />
          <View style={[styles.esquina, styles.esquinaSuperiorDerecha]} />
          <View style={[styles.esquina, styles.esquinaInferiorIzquierda]} />
          <View style={[styles.esquina, styles.esquinaInferiorDerecha]} />
        </View>

        <View style={styles.instruccionContenedor}>
          <Text style={styles.instruccion}>
            {cargando ? 'Conectando...' : 'Apuntá al QR de tu mesa'}
          </Text>
          {cargando && <ActivityIndicator size="small" color={COLORS.accent} style={{ marginTop: 8 }} />}
        </View>

        <View style={styles.panelInferior}>
          <Pressable onPress={irADemostracion}>
            <Text style={styles.linkPrueba}>🧪 Modo prueba: ir directo al menú</Text>
          </Pressable>
          <Pressable onPress={irAEmpleado}>
            <Text style={styles.linkPersonal}>👔 Acceso personal</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const TAMANO_MARCO = 250;
const TAMANO_ESQUINA = 32;
const GROSOR_ESQUINA = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 14,
    backgroundColor: COLORS.background,
  },

  logo: {
    width: 168,
    height: 145,
    marginBottom: 4,
  },

  titulo: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: 0.2 },
  texto: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.textSecondary,
    maxWidth: 280,
  },

  boton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 15,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 10,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  botonPresionado: { opacity: 0.85 },
  botonTexto: { color: COLORS.onAccent, fontSize: 16, fontWeight: '700' },

  enlacesSecundarios: { marginTop: 22, alignItems: 'center', gap: 10 },

  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  marco: { width: TAMANO_MARCO, height: TAMANO_MARCO },
  esquina: {
    position: 'absolute',
    width: TAMANO_ESQUINA,
    height: TAMANO_ESQUINA,
    borderColor: COLORS.accent,
  },
  esquinaSuperiorIzquierda: {
    top: 0,
    left: 0,
    borderTopWidth: GROSOR_ESQUINA,
    borderLeftWidth: GROSOR_ESQUINA,
    borderTopLeftRadius: 14,
  },
  esquinaSuperiorDerecha: {
    top: 0,
    right: 0,
    borderTopWidth: GROSOR_ESQUINA,
    borderRightWidth: GROSOR_ESQUINA,
    borderTopRightRadius: 14,
  },
  esquinaInferiorIzquierda: {
    bottom: 0,
    left: 0,
    borderBottomWidth: GROSOR_ESQUINA,
    borderLeftWidth: GROSOR_ESQUINA,
    borderBottomLeftRadius: 14,
  },
  esquinaInferiorDerecha: {
    bottom: 0,
    right: 0,
    borderBottomWidth: GROSOR_ESQUINA,
    borderRightWidth: GROSOR_ESQUINA,
    borderBottomRightRadius: 14,
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
});
