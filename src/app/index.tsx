import { useCallback, useEffect, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL, HEADERS_NGROK } from '@/constants/api';
import { COLORS } from '@/constants/theme';

// Pantalla 1 ("landing" de la app): el cliente escanea cualquiera de los QR
// físicos de la barra (no están atados a una mesa puntual: el modelo es
// "libre" — cualquiera que llega escanea, elige, paga y retira en la barra).
// Le pedimos al backend una "sesión anónima" y guardamos lo que nos
// devuelve (el cliente_uuid) en el celular, para usarlo en el resto de
// las pantallas.
//
// Diseño (20/09): paleta oscura y premium, un solo color de acento (dorado),
// con el logo real de Cervecería Ogham (assets/images/logo-ogham.png).
//
// Bienvenida con paso a paso (20/09, tarde): antes de mostrar la cámara,
// la primera vez se explica cómo funciona la app (elegir, pagar, mostrar
// el QR en la barra). Se guarda en el celular si el usuario tildó "No
// volver a mostrar", para no repetirla en las próximas visitas. Esto
// también evita que la cámara aparezca de golpe apenas se abre la app.
const CLAVE_BIENVENIDA_OCULTA = 'bienvenida_oculta';

export default function EscaneoQrScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneando, setEscaneando] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [mostrarBienvenida, setMostrarBienvenida] = useState<boolean | null>(null);
  const [noMostrarDeNuevo, setNoMostrarDeNuevo] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_BIENVENIDA_OCULTA).then((valor) => {
      setMostrarBienvenida(valor !== 'true');
    });
  }, []);

  const alContinuarDeBienvenida = useCallback(async () => {
    if (noMostrarDeNuevo) {
      await AsyncStorage.setItem(CLAVE_BIENVENIDA_OCULTA, 'true');
    }
    setMostrarBienvenida(false);
  }, [noMostrarDeNuevo]);

  const iniciarSesion = useCallback(async () => {
    setEscaneando(false);
    setCargando(true);
    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/sesiones/anonima`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...HEADERS_NGROK },
      });

      if (!respuesta.ok) {
        throw new Error(`El servidor respondió con un error (código ${respuesta.status})`);
      }

      const datos = await respuesta.json();

      await AsyncStorage.setItem('cliente_uuid', datos.cliente_uuid);

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

  const alEscanear = useCallback(() => {
    if (!escaneando) return;
    iniciarSesion();
  }, [escaneando, iniciarSesion]);

  // Atajo de prueba (TEMPORAL): mientras no haya backend real, esto permite
  // revisar el catálogo y la pantalla de pago sin depender de la conexión.
  // Sacar esta función y el botón antes de entregar la app.
  const irADemostracion = useCallback(async () => {
    await AsyncStorage.setItem('cliente_uuid', 'demo-uuid-de-prueba');
    router.replace('/catalogo');
  }, []);

  // Acceso del personal de barra (permanente): lleva a la pantalla de
  // empleado, protegida con PIN. En una versión final capaz conviene
  // esconderlo más (ej. mantener presionado el logo), pero por ahora
  // alcanza con este link chico y discreto.
  const irAEmpleado = useCallback(() => {
    router.push('/empleado');
  }, []);

  if (mostrarBienvenida === null) {
    return <View style={styles.centrado} />;
  }

  if (mostrarBienvenida) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.bienvenidaContenido}>
          <Image
            source={require('@/assets/images/logo-ogham.png')}
            style={styles.logoBienvenida}
            resizeMode="contain"
          />

          <Text style={styles.titulo}>¡Bienvenido!</Text>
          <Text style={styles.textoBienvenida}>Así es pedir en Ogham:</Text>

          <View style={styles.pasos}>
            <View style={styles.paso}>
              <View style={styles.pasoNumeroCirculo}>
                <Text style={styles.pasoNumeroTexto}>1</Text>
              </View>
              <Text style={styles.pasoTexto}>Elegí lo que vas a tomar en el menú.</Text>
            </View>
            <View style={styles.paso}>
              <View style={styles.pasoNumeroCirculo}>
                <Text style={styles.pasoNumeroTexto}>2</Text>
              </View>
              <Text style={styles.pasoTexto}>Abonalo con tu billetera preferida.</Text>
            </View>
            <View style={styles.paso}>
              <View style={styles.pasoNumeroCirculo}>
                <Text style={styles.pasoNumeroTexto}>3</Text>
              </View>
              <Text style={styles.pasoTexto}>
                Mostrá tu QR al mozo en la barra y retirá tu pedido 🍹🍻.
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
            onPress={alContinuarDeBienvenida}
          >
            <Text style={styles.botonTexto}>Entendido, empezar</Text>
          </Pressable>

          <Pressable style={styles.checkboxFila} onPress={() => setNoMostrarDeNuevo((actual) => !actual)}>
            <View style={[styles.checkbox, noMostrarDeNuevo && styles.checkboxMarcado]}>
              {noMostrarDeNuevo && <Text style={styles.checkboxTilde}>✓</Text>}
            </View>
            <Text style={styles.checkboxTexto}>No volver a mostrar</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

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

        <Text style={styles.titulo}>Casi listo</Text>
        <Text style={styles.texto}>
          Necesitamos acceso a tu cámara para escanear el QR.
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
            {cargando ? 'Conectando...' : 'Apuntá al QR'}
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

  bienvenidaContenido: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  logoBienvenida: {
    width: 150,
    height: 130,
    marginBottom: 2,
  },
  textoBienvenida: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: -6,
  },
  pasos: {
    alignSelf: 'stretch',
    gap: 14,
    marginTop: 4,
    marginBottom: 4,
  },
  paso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  pasoNumeroCirculo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  pasoNumeroTexto: { color: COLORS.onAccent, fontWeight: '700', fontSize: 13 },
  pasoTexto: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  checkboxFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    padding: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMarcado: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  checkboxTilde: { color: COLORS.onAccent, fontSize: 13, fontWeight: '700', lineHeight: 14 },
  checkboxTexto: { color: COLORS.textSecondary, fontSize: 13 },

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
