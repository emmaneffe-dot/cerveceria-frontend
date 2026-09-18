import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';

// Pantalla 4: una vez pagado el pedido, mostramos acá un QR con el número
// de pedido (id_pedido). El mozo lo va a escanear desde la pantalla de
// "Empleado" para ver el detalle y marcarlo como entregado.
export default function ConfirmacionScreen() {
  const [idPedido, setIdPedido] = useState<string | null>(null);
  const [numeroMesa, setNumeroMesa] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('id_pedido').then(setIdPedido);
    AsyncStorage.getItem('numero_mesa').then(setNumeroMesa);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>🎉 ¡Gracias por tu pedido!</Text>
      <Text style={styles.texto}>Mostrale este código al mozo para que te lo traiga.</Text>

      <View style={styles.qrContenedor}>
        {idPedido ? (
          <QRCode value={idPedido} size={220} />
        ) : (
          <Text style={styles.texto}>Todavía no hay un pedido confirmado.</Text>
        )}
      </View>

      {numeroMesa && <Text style={styles.mesa}>Mesa {numeroMesa}</Text>}
      {idPedido && <Text style={styles.pedido}>Pedido #{idPedido}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  titulo: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  texto: { textAlign: 'center', fontSize: 15, color: '#555' },
  qrContenedor: { padding: 20, backgroundColor: '#fff', borderRadius: 16, elevation: 2 },
  mesa: { fontSize: 14, color: '#777' },
  pedido: { fontSize: 16, fontWeight: '600' },
});
