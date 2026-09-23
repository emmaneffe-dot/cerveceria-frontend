import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';

import { COLORS } from '@/constants/theme';

// Pantalla 4: una vez pagado el pedido, mostramos acá un QR con el número
// de pedido (id_pedido). El mozo lo va a escanear desde la pantalla de
// "Empleado" para ver el detalle y marcarlo como entregado.
//
// Diseño (20/09): mismo estilo oscuro y premium que el resto de la app.
// El QR se deja sobre un recuadro blanco a propósito: necesita buen
// contraste (módulos oscuros sobre fondo claro) para que la cámara del
// mozo lo pueda leer bien.
export default function ConfirmacionScreen() {
  const [idPedido, setIdPedido] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('id_pedido').then(setIdPedido);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>🎉 ¡Gracias por tu pedido!</Text>
      <Text style={styles.texto}>Mostrá tu QR al mozo en la barra y retirá tu pedido 🍹🍻.</Text>

      <View style={styles.qrContenedor}>
        {idPedido ? (
          <QRCode value={idPedido} size={220} />
        ) : (
          <Text style={styles.textoQrVacio}>Todavía no hay un pedido confirmado.</Text>
        )}
      </View>

      {idPedido && <Text style={styles.pedido}>Pedido #{idPedido}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: COLORS.background,
  },
  titulo: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: COLORS.textPrimary },
  texto: { textAlign: 'center', fontSize: 15, color: COLORS.textSecondary },
  qrContenedor: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  textoQrVacio: { textAlign: 'center', fontSize: 15, color: '#555', maxWidth: 180 },
  pedido: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
});
