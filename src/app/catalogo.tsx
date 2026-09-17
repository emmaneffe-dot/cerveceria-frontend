import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Pantalla 2 (placeholder): acá va a ir el menú de productos y el carrito.
// La armamos en el próximo paso, esto es solo para confirmar que la Pantalla 1
// funcionó y nos mandó para acá.
export default function CatalogoScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>✅ Sesión iniciada</Text>
      <Text style={styles.texto}>Acá va a ir el menú de productos. Lo armamos en el próximo paso.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  titulo: { fontSize: 24, fontWeight: 'bold' },
  texto: { textAlign: 'center', fontSize: 16 },
});
