import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Pantalla 4 (placeholder): esto lo terminamos de armar en la Semana 3.
// Va a mostrar acá el QR del pedido para que el mozo lo escanee.
export default function ConfirmacionScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>🎉 ¡Gracias!</Text>
      <Text style={styles.texto}>
        Estamos confirmando tu pago. En el próximo paso vas a ver acá el QR para mostrarle al mozo.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  titulo: { fontSize: 24, fontWeight: 'bold' },
  texto: { textAlign: 'center', fontSize: 16 },
});
