import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode'; // Necesitarás instalar esta librería

// Define una interfaz para el payload de tu JWT (ajusta según lo que envíe tu backend)
interface JwtPayload {
  id: string;
  email: string; // Asume que el email también está en el payload
  iat: number;
  exp: number;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const decodedToken = jwtDecode<JwtPayload>(token);
          setUserEmail(decodedToken.email);
        }
      } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        // Podrías manejar el error, quizás redirigir al login si el token no es válido
      }
    };

    loadUserData();
  }, []); // El efecto se ejecuta una vez al montar el componente

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      navigation.navigate('Login'); // Redirige de vuelta a la pantalla de login
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Bienvenido!</Text>
      {userEmail ? (
        <Text style={styles.subtitle}>Has iniciado sesión como: {userEmail}</Text>
      ) : (
        <Text style={styles.subtitle}>Cargando información del usuario...</Text>
      )}
      <Button title="Cerrar Sesión" onPress={handleLogout} />
      {/* Aquí podrías añadir más contenido para tu Home Screen */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    color: '#555',
    textAlign: 'center',
  },
});

export default HomeScreen;