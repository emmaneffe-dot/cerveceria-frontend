import { useCallback, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '@/constants/api';

// Pantalla 1: el cliente escanea el QR físico de su mesa. Le pedimos al backend
// una "sesión anónima" para esa mesa y guardamos lo que nos devuelve (el
// cliente_uuid) en el celular, para usarlo en el resto de las pantallas.
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

  if (!permission) {
    return <View style={styles.centrado} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centrado}>
        <Text style={styles.titulo}>🍺 Bienvenido</Text>
        <Text style={styles.texto}>
          Necesitamos permiso para usar la cámara y así poder leer el QR de tu mesa.
        </Text>
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
          {cargando ? 'Conectando...' : 'Apuntá al QR de tu mesa'}
        </Text>
        {cargando && <ActivityIndicator size="large" color="#fff" style={{ marginTop: 12 }} />}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  titulo: { fontSize: 28, fontWeight: 'bold' },
  texto: { textAlign: 'center', fontSize: 16 },
  boton: { backgroundColor: '#D97706', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  marco: { width: 250, height: 250, borderWidth: 3, borderColor: '#fff', borderRadius: 16 },
  instruccion: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
